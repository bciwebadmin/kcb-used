import { h, clear, icon, toast, confirmDialog, mount } from '../ui.js';
import { store } from '../store.js';
import { PHOTO_SLOTS, ALL_PHOTOS_REQUIRED, CONDITIONS, EXAMPLE_PHOTOS } from '../config.js';
import {
  newEquipmentId, createEquipment, updateEquipment, getEquipment, uploadPhoto, findBySerial, normalizeKey,
  getRequest, completeRequest, addPhotos, getPrivateNotes, savePrivateNotes,
} from '../data.js';
import { navigate, setLeaveGuard } from '../main.js';

export function renderSubmit(page, { id, requestId }) {
  const editing = Boolean(id);
  mount(page, h('div', { class: 'center-pad' }, h('div', { class: 'spinner' })));

  let alive = true;
  Promise.all([
    editing ? getEquipment(id) : null,
    requestId ? getRequest(requestId).catch(() => null) : null,
    editing && store.canEdit() ? getPrivateNotes(id).catch(() => '') : '',
  ])
    .then(([eq, request, privateNotes]) => {
      if (!alive) return; // user navigated away while loading
      clear(page);
      if (editing && !eq) {
        mount(page, h('div', { class: 'card narrow' }, h('h2', {}, 'Unit not found'), h('a', { href: '#/' }, 'Back to inventory')));
        return;
      }
      // Anyone can fill empty photo slots; only the submitter or an admin can change details or replace photos.
      const photosOnly = editing && !store.isAdmin() && eq.createdBy !== store.get().user.uid;
      build(page, eq, { request, photosOnly, privateNotes });
    })
    .catch((err) => {
      if (!alive) return;
      clear(page);
      mount(page, h('div', { class: 'card narrow' }, h('h2', {}, 'Couldn’t load unit'), h('p', {}, err.message)));
    });

  return () => {
    alive = false;
    teardown();
  };
}

let beforeUnload = null;
let storeUnsub = null;
function teardown() {
  if (beforeUnload) window.removeEventListener('beforeunload', beforeUnload);
  beforeUnload = null;
  storeUnsub?.();
  storeUnsub = null;
  setLeaveGuard(null);
}

function build(page, existing, { request = null, photosOnly = false, privateNotes = '' } = {}) {
  const editing = Boolean(existing);
  const requested = new Set(request?.angles?.length ? request.angles : request ? PHOTO_SLOTS.map((s) => s.key) : []);
  const prefill = !editing && request ? request : null;
  const equipmentId = existing?.id || newEquipmentId();
  const { equipment, settings } = store.get();

  // slotKey -> { file, previewUrl, uploaded }  (uploaded = photo object once sent, so a retry skips it)
  const picked = {};
  const existingPhotos = { ...(existing?.photos || {}) };
  let dirty = false;
  let busy = false;

  beforeUnload = (e) => {
    if (dirty || busy) {
      e.preventDefault();
      e.returnValue = '';
    }
  };
  window.addEventListener('beforeunload', beforeUnload);

  // ---------- fields ----------
  const knownMakes = [...new Set(['Bobcat', ...(equipment || []).map((e) => e.make).filter(Boolean)])].sort();
  const warehouses = settings.warehouses || [];

  const inputs = {
    make: h('input', { id: 'make', name: 'make', list: 'make-list', required: true, maxlength: 80, value: existing?.make ?? (prefill?.make || 'Bobcat'), autocomplete: 'off' }),
    model: h('input', { id: 'model', name: 'model', required: true, maxlength: 80, value: existing?.model ?? prefill?.model ?? '', placeholder: 'e.g. T76', autocomplete: 'off' }),
    year: h('input', { id: 'year', name: 'year', type: 'number', inputmode: 'numeric', min: 1950, max: new Date().getFullYear() + 1, value: existing?.year ?? prefill?.year ?? '', placeholder: 'e.g. 2021' }),
    hours: h('input', { id: 'hours', name: 'hours', type: 'number', inputmode: 'decimal', min: 0, step: '0.1', value: existing?.hours ?? prefill?.hours ?? '', placeholder: 'From hour meter' }),
    warehouse: h(
      'select',
      { id: 'warehouse', name: 'warehouse', required: true },
      h('option', { value: '' }, 'Select warehouse…'),
      [...new Set([...warehouses, existing?.warehouse, prefill?.warehouse].filter(Boolean))].map((w) => h('option', { value: w, selected: w === (existing?.warehouse || prefill?.warehouse) }, w)),
    ),
    ein: h('input', { id: 'ein', name: 'ein', required: true, maxlength: 40, value: existing?.ein ?? prefill?.ein ?? '', autocomplete: 'off', class: 'mono' }),
    serial: h('input', { id: 'serial', name: 'serial', required: true, maxlength: 60, value: existing?.serial ?? prefill?.serial ?? '', autocomplete: 'off', class: 'mono' }),
    condition: h(
      'select',
      { id: 'condition', name: 'condition' },
      h('option', { value: '' }, 'Select condition…'),
      CONDITIONS.map((c) => h('option', { value: c, selected: c === existing?.condition }, c)),
    ),
    price: h('input', { id: 'price', name: 'price', type: 'number', inputmode: 'decimal', min: 0, step: '1', value: existing?.price ?? '', placeholder: '0' }),
    comments: h('textarea', { id: 'comments', name: 'comments', rows: 4, maxlength: 5000, placeholder: 'Selling points and anything a customer or sales rep should know — attachments, recent service, condition notes…' }, existing?.comments ?? ''),
    privateNotes: h('textarea', { id: 'privateNotes', name: 'privateNotes', rows: 4, maxlength: 5000, placeholder: 'Internal only — damage to fix, pricing notes, trade-in details, what the customer said…' }, privateNotes || ''),
    attachments: h('textarea', { id: 'attachments', name: 'attachments', rows: 3, maxlength: 2000, placeholder: 'Bucket, cab enclosure, A/C, 2-speed, etc.' }, existing?.attachments ?? ''),
  };
  if (warehouses.length === 1 && !existing && !prefill?.warehouse) inputs.warehouse.value = warehouses[0];
  if (photosOnly) Object.values(inputs).forEach((el) => (el.disabled = true));

  // Settings may arrive after the form is built (page refresh / direct link) — refill the dropdown, keeping the choice.
  let whSig = JSON.stringify(warehouses);
  storeUnsub = store.subscribe((s) => {
    const list = s.settings.warehouses || [];
    if (JSON.stringify(list) === whSig) return;
    whSig = JSON.stringify(list);
    const current = inputs.warehouse.value || existing?.warehouse || prefill?.warehouse || '';
    const values = [...new Set([...list, current].filter(Boolean))];
    mount(clear(inputs.warehouse), h('option', { value: '' }, 'Select warehouse…'), ...values.map((w) => h('option', { value: w }, w)));
    inputs.warehouse.value = current || (values.length === 1 ? values[0] : '');
  });

  setLeaveGuard(() => dirty || busy);

  const field = (label, key, { req, hint, wide, prefix } = {}) =>
    h(
      'div',
      { class: `field${wide ? ' wide' : ''}` },
      h('label', { for: key }, label, req ? h('span', { class: 'req', 'aria-hidden': 'true' }, ' *') : null),
      prefix ? h('div', { class: 'input-prefix' }, h('span', {}, prefix), inputs[key]) : inputs[key],
      hint ? h('span', { class: 'hint' }, hint) : null,
    );

  // ---------- photo slots ----------
  const tiles = {};
  const photoGrid = h('div', { class: 'photo-grid' });
  const bulkInput = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true, onchange: (e) => bulkAdd([...e.target.files]) });

  function setSlotFile(slotKey, file) {
    const prev = picked[slotKey];
    if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
    picked[slotKey] = file ? { file, previewUrl: URL.createObjectURL(file), uploaded: null } : undefined;
    if (!file) delete picked[slotKey];
    dirty = true;
    drawTile(slotKey);
    updatePhotoCount();
  }

  function bulkAdd(files) {
    const empty = PHOTO_SLOTS.filter((s) => !picked[s.key] && !existingPhotos[s.key]);
    files.slice(0, empty.length).forEach((file, i) => setSlotFile(empty[i].key, file));
    if (files.length > empty.length) toast(`Only ${empty.length} empty slot${empty.length === 1 ? '' : 's'} — extra photos were skipped.`, 'error');
    bulkInput.value = '';
  }

  function drawTile(slotKey) {
    const slot = PHOTO_SLOTS.find((s) => s.key === slotKey);
    const tile = tiles[slotKey];
    const p = picked[slotKey];
    const ex = existingPhotos[slotKey];
    const src = p?.previewUrl || ex?.thumbUrl || ex?.url;
    const fileInput = h('input', {
      type: 'file',
      accept: 'image/*',
      hidden: true,
      onchange: (e) => e.target.files[0] && setSlotFile(slotKey, e.target.files[0]),
    });

    const locked = photosOnly && Boolean(ex) && existing?.createdBy !== 'daily-report'; // can't replace someone else's photo (report units: anyone can retake)
    clear(tile);
    tile.className = `photo-tile${src ? ' has-photo' : ''}${p ? ' is-new' : ''}${requested.has(slotKey) && !ex ? ' requested' : ''}`;
    mount(tile, 
      fileInput,
      h(
        'button',
        { type: 'button', class: 'photo-drop', disabled: locked, onclick: () => fileInput.click(), 'aria-label': `${src ? 'Replace' : 'Add'} ${slot.label} photo` },
        src
          ? h('img', { src, alt: slot.label, onerror: (e) => e.target.replaceWith(h('span', { class: 'photo-fallback' }, icon('image'), p?.file?.name || 'Photo selected')) })
          : h(
              'span',
              { class: `photo-empty${EXAMPLE_PHOTOS[slotKey] ? ' has-example' : ''}`, style: EXAMPLE_PHOTOS[slotKey] ? `background-image:url(${EXAMPLE_PHOTOS[slotKey].small})` : null },
              icon('camera'),
              h('span', {}, 'Add photo'),
            ),
        h('span', { class: 'photo-progress', style: 'width:0%' }),
      ),
      h(
        'div',
        { class: 'photo-label' },
        h('span', {}, slot.label, ALL_PHOTOS_REQUIRED ? h('span', { class: 'req', 'aria-hidden': 'true' }, ' *') : null),
        p
          ? h('button', { type: 'button', class: 'icon-btn sm', title: 'Remove', 'aria-label': `Remove ${slot.label} photo`, onclick: () => setSlotFile(slotKey, null) }, icon('x'))
          : locked
            ? h('span', { class: 'muted small' }, 'Already taken')
            : src
              ? h('span', { class: 'muted small' }, 'Tap to replace')
              : requested.has(slotKey)
                ? h('span', { class: 'requested-tag' }, 'Requested')
                : null,
      ),
    );

    // drag & drop on desktop
    tile.ondragover = (e) => { e.preventDefault(); tile.classList.add('drag'); };
    tile.ondragleave = () => tile.classList.remove('drag');
    tile.ondrop = (e) => {
      e.preventDefault();
      if (locked) return;
      tile.classList.remove('drag');
      const f = [...e.dataTransfer.files].find((x) => x.type.startsWith('image/'));
      if (f) setSlotFile(slotKey, f);
    };
  }

  PHOTO_SLOTS.forEach((s) => {
    tiles[s.key] = h('div', { class: 'photo-tile', 'data-slot': s.key });
    mount(photoGrid, tiles[s.key]);
    drawTile(s.key);
  });

  const photoCount = h('span', { class: 'muted' });
  function updatePhotoCount() {
    const n = PHOTO_SLOTS.filter((s) => picked[s.key] || existingPhotos[s.key]).length;
    photoCount.textContent = `${n} of ${PHOTO_SLOTS.length} photos`;
  }
  updatePhotoCount();

  // ---------- submit ----------
  const progressWrap = h('div', { class: 'upload-progress', hidden: true }, h('div', { class: 'bar' }, h('span', {})), h('span', { class: 'label' }));
  const submitBtn = h('button', { type: 'submit', class: 'btn btn-primary btn-lg' }, editing ? 'Save changes' : 'Add equipment');
  const formMsg = h('p', { class: 'form-msg', role: 'alert' });

  const form = h(
    'form',
    { class: 'submit-form', novalidate: true, oninput: () => (dirty = true), onsubmit: onSubmit },
    h('datalist', { id: 'make-list' }, knownMakes.map((m) => h('option', { value: m }))),
    h(
      'section',
      { class: 'card' },
      h('h2', { class: 'section-title' }, 'Unit details'),
      h(
        'div',
        { class: 'form-grid' },
        field('Make', 'make', { req: true }),
        field('Model', 'model', { req: true }),
        field('Year', 'year'),
        field('Hours', 'hours', { hint: 'Should match the hour meter photo' }),
        field('Warehouse', 'warehouse', { req: true, hint: warehouses.length ? null : 'No warehouses set up yet — an admin can add them under Settings.' }),
        field('EIN', 'ein', { req: true }),
        field('Serial #', 'serial', { req: true }),
        field('Condition', 'condition'),
        field('Price', 'price', { prefix: '$' }),
        field('Attachments / options', 'attachments', { wide: true }),
      ),
    ),
    h(
      'section',
      { class: 'card' },
      h(
        'div',
        { class: 'section-head' },
        h('div', {}, h('h2', { class: 'section-title' }, 'Photos'), h('p', { class: 'muted small' }, ALL_PHOTOS_REQUIRED ? `All ${PHOTO_SLOTS.length} angles are required. Tap a slot to take or choose a photo, or drag one onto it.` : 'Add whichever angles you have — none are required. Tap a slot to take or choose a photo, or drag one onto it. The faded pictures show what each angle should look like.'), h('a', { href: '#/instructions', class: 'small instr-link', target: '_blank' }, icon('info'), ' How to take the photos')),
        h('div', { class: 'section-head-actions' }, photoCount, bulkInput, h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => bulkInput.click() }, 'Add several at once')),
      ),
      h('p', { class: 'muted small bulk-hint' }, '“Add several at once” fills the empty slots in the order shown below — select photos in that order.'),
      photoGrid,
    ),
    h(
      'section',
      { class: 'card' },
      h('h2', { class: 'section-title' }, 'Comments'),
      h(
        'div',
        { class: 'comment-fields' },
        h(
          'div',
          { class: 'field' },
          h('label', { for: 'comments' }, 'Public comments', h('span', { class: 'vis-tag public' }, 'Everyone can see')),
          inputs.comments,
        ),
        h(
          'div',
          { class: 'field' },
          h('label', { for: 'privateNotes' }, 'Private comments', h('span', { class: 'vis-tag private' }, 'Hidden from viewers / sales reps')),
          inputs.privateNotes,
        ),
      ),
      photosOnly ? h('p', { class: 'muted small' }, 'Only the person who submitted this unit or an admin can change comments.') : null,
    ),
    h(
      'div',
      { class: 'form-actions' },
      formMsg,
      progressWrap,
      h('div', { class: 'form-actions-row' }, h('a', { href: request ? '#/requests' : editing ? `#/equipment/${equipmentId}` : '#/', class: 'btn btn-ghost' }, 'Cancel'), submitBtn),
    ),
  );

  const backHref = request ? '#/requests' : editing ? `#/equipment/${equipmentId}` : '#/';
  const banner = request
    ? h(
        'div',
        { class: `request-banner${request.status === 'done' ? ' done' : ''}` },
        icon('camera'),
        h(
          'div',
          {},
          h('strong', {}, request.status === 'done' ? 'This photo request is already marked done.' : `Photo request from ${request.createdByName || request.createdByEmail}`),
          h('div', { class: 'small' }, request.angles?.length ? `Angles needed: ${request.angles.map((k) => PHOTO_SLOTS.find((x) => x.key === k)?.label || k).join(', ')}` : 'All angles requested', request.dueDate ? ` · needed by ${request.dueDate}` : ''),
          request.notes ? h('div', { class: 'small prewrap' }, request.notes) : null,
          request.status !== 'done' ? h('div', { class: 'small muted' }, 'Saving will check this request off.') : null,
        ),
      )
    : null;
  const photosOnlyNote = photosOnly
    ? h('p', { class: 'muted small' }, 'You can add photos to empty slots. Only the person who submitted this unit or an admin can change its details or replace photos.')
    : null;

  mount(page, 
    h(
      'div',
      { class: 'page-head' },
      h(
        'div',
        {},
        h('a', { href: backHref, class: 'back-link' }, icon('back'), request ? 'Back to requests' : editing ? 'Back to unit' : 'Back to inventory'),
        h('h1', {}, photosOnly ? `Add photos · ${existing.make} ${existing.model}` : editing ? `Edit ${existing.make} ${existing.model}` : 'Add equipment'),
        photosOnlyNote,
      ),
    ),
    banner,
    form,
  );

  function readFields() {
    const num = (v) => (v === '' || v === null ? null : Number(v));
    return {
      make: inputs.make.value.trim(),
      model: inputs.model.value.trim(),
      year: num(inputs.year.value),
      hours: num(inputs.hours.value),
      warehouse: inputs.warehouse.value,
      ein: inputs.ein.value.trim(),
      serial: inputs.serial.value.trim(),
      serialKey: normalizeKey(inputs.serial.value),
      condition: inputs.condition.value || null,
      price: num(inputs.price.value),
      attachments: inputs.attachments.value.trim(),
      comments: inputs.comments.value.trim(),
    };
  }

  function validate(fields) {
    form.querySelectorAll('.invalid').forEach((el) => el.classList.remove('invalid'));
    const problems = [];
    for (const key of ['make', 'model', 'warehouse', 'ein', 'serial']) {
      if (!fields[key]) {
        inputs[key].classList.add('invalid');
        problems.push(inputs[key]);
      }
    }
    for (const key of ['year', 'hours', 'price']) {
      if (fields[key] !== null && (Number.isNaN(fields[key]) || fields[key] < 0)) {
        inputs[key].classList.add('invalid');
        problems.push(inputs[key]);
      }
    }
    const missingPhotos = ALL_PHOTOS_REQUIRED ? PHOTO_SLOTS.filter((s) => !picked[s.key] && !existingPhotos[s.key]) : [];
    missingPhotos.forEach((s) => tiles[s.key].classList.add('invalid'));

    if (problems.length) {
      problems[0].focus();
      return 'Fill in the highlighted fields.';
    }
    if (missingPhotos.length) {
      tiles[missingPhotos[0].key].scrollIntoView({ behavior: 'smooth', block: 'center' });
      return `Missing photo${missingPhotos.length > 1 ? 's' : ''}: ${missingPhotos.map((s) => s.label).join(', ')}.`;
    }
    return null;
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (busy) return;
    formMsg.textContent = '';
    formMsg.className = 'form-msg';
    const fields = readFields();
    if (photosOnly) {
      if (!Object.keys(picked).length) {
        formMsg.textContent = 'Add at least one photo to an empty slot.';
        return;
      }
    } else {
      const problem = validate(fields);
      if (problem) {
        formMsg.textContent = problem;
        return;
      }
    }

    // Soft duplicate check on serial number.
    if (!photosOnly && (!editing || fields.serialKey !== existing.serialKey)) {
      try {
        const dupes = await findBySerial(fields.serial, equipmentId);
        if (dupes.length) {
          const d = dupes[0];
          const ok = await confirmDialog({
            title: 'Serial number already submitted',
            message: `${d.make} ${d.model} with serial ${d.serial} is already in the system${d.status === 'archived' ? ' (archived)' : ''}. Submit anyway?`,
            confirmLabel: 'Submit anyway',
          });
          if (!ok) return;
        }
      } catch {
        /* non-blocking */
      }
    }

    busy = true;
    submitBtn.disabled = true;
    submitBtn.textContent = editing ? 'Saving…' : 'Uploading…';
    form.classList.add('is-busy');

    try {
      const photos = await uploadPending();
      if (photosOnly) {
        await addPhotos(equipmentId, photos);
      } else if (editing) {
        // Write only the slots that changed, so two people editing at once don't overwrite each other's photos.
        const photoPatch = Object.fromEntries(Object.entries(photos).map(([k, v]) => [`photos.${k}`, v]));
        await updateEquipment(equipmentId, { ...fields, ...photoPatch });
      } else {
        // requestId: lets the new-unit email step see this answers a photo request (see onEquipmentCreated).
        await createEquipment(equipmentId, request ? { ...fields, requestId: request.id } : fields, photos);
      }
      // Private comments live in their own document (written after the unit exists).
      const priv = inputs.privateNotes.value.trim();
      if (!photosOnly && priv !== (privateNotes || '')) await savePrivateNotes(equipmentId, priv);
      dirty = false;
      busy = false;
      setLeaveGuard(null);
      Object.values(picked).forEach((p) => p?.previewUrl && URL.revokeObjectURL(p.previewUrl));
      let requestNote = '';
      // A new submission always answers the request; an edit only does if photos were actually added.
      if (request && request.status !== 'done' && (!editing || Object.keys(photos).length > 0)) {
        try {
          await completeRequest(request.id, equipmentId);
          requestNote = ' · photo request checked off';
        } catch {
          requestNote = ' · couldn’t check off the request — do it from Requests';
        }
      }
      toast((photosOnly ? 'Photos added' : editing ? 'Changes saved' : 'Unit submitted — admins have been notified') + requestNote);
      navigate(`/equipment/${equipmentId}`);
    } catch (err) {
      busy = false;
      submitBtn.disabled = false;
      submitBtn.textContent = editing ? 'Save changes' : 'Retry submit';
      form.classList.remove('is-busy');
      if (photosOnly && err.code === 'permission-denied') {
        // Most likely someone else filled one of these slots meanwhile — refresh and drop the clashing ones.
        try {
          const fresh = await getEquipment(equipmentId);
          const taken = PHOTO_SLOTS.filter((s) => picked[s.key] && fresh?.photos?.[s.key]);
          Object.keys(existingPhotos).forEach((k) => delete existingPhotos[k]);
          Object.assign(existingPhotos, fresh?.photos || {});
          taken.forEach((s) => {
            if (picked[s.key]?.previewUrl) URL.revokeObjectURL(picked[s.key].previewUrl);
            delete picked[s.key];
          });
          PHOTO_SLOTS.forEach((s) => drawTile(s.key));
          updatePhotoCount();
          if (taken.length) {
            formMsg.textContent = `Someone else just added ${taken.map((s) => s.label).join(', ')}. Those were skipped — press the button to save the rest.`;
            return;
          }
        } catch {
          /* fall through to the generic message */
        }
      }
      formMsg.textContent = `Something went wrong: ${err.message}. Photos that finished uploading won't be re-sent — press the button to retry.`;
    }
  }

  async function uploadPending() {
    const pending = PHOTO_SLOTS.filter((s) => picked[s.key]);
    const result = {};
    const fraction = {};
    const bar = progressWrap.querySelector('.bar span');
    const label = progressWrap.querySelector('.label');
    progressWrap.hidden = pending.length === 0;

    const totalBytes = pending.reduce((sum, s) => sum + picked[s.key].file.size, 0) || 1;
    const refresh = () => {
      const done = pending.reduce((sum, s) => sum + (fraction[s.key] || 0) * picked[s.key].file.size, 0);
      const pct = Math.round((done / totalBytes) * 100);
      bar.style.width = `${pct}%`;
      const finished = pending.filter((s) => picked[s.key].uploaded).length;
      label.textContent = `Uploading photos… ${finished} of ${pending.length} (${pct}%)`;
    };

    // Upload 3 at a time — friendlier on cell connections than 10 in parallel.
    const queue = [...pending];
    async function worker() {
      while (queue.length) {
        const slot = queue.shift();
        const p = picked[slot.key];
        const bar1 = tiles[slot.key].querySelector('.photo-progress');
        if (!p.uploaded) {
          p.uploaded = await uploadPhoto(equipmentId, slot.key, p.file, (fr) => {
            fraction[slot.key] = fr;
            if (bar1) bar1.style.width = `${Math.round(fr * 100)}%`;
            refresh();
          });
        }
        fraction[slot.key] = 1;
        tiles[slot.key].classList.add('done');
        result[slot.key] = p.uploaded;
        refresh();
      }
    }
    refresh();
    await Promise.all([worker(), worker(), worker()]);
    label.textContent = 'Saving…';
    return result;
  }
}
