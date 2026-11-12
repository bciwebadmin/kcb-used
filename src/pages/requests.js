import { h, clear, icon, toast, fmtDate, confirmDialog, mount, pager } from '../ui.js';
import { store } from '../store.js';
import { deletedLink } from './deleted.js';
import { navigate, setLeaveGuard } from '../main.js';
import { PHOTO_SLOTS } from '../config.js';
import {
  createRequest, completeRequest, reopenRequest, deleteRequest, findCandidate, linkRequest, assignRequest, coverThumb,
} from '../data.js';

// Remembered while the browser tab is open.
const view = { tab: 'open', q: '', who: 'all', page: 1 };

const slotLabel = (k) => PHOTO_SLOTS.find((s) => s.key === k)?.label || k;
const norm = (s) => String(s ?? '').toLowerCase().trim();

function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function fmtDue(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Where "Upload photos" goes: the linked unit (add photos), or a new submission prefilled from the request. */
export function fulfillHref(req) {
  return req.equipmentId ? `#/equipment/${req.equipmentId}/edit?request=${req.id}` : `#/new?request=${req.id}`;
}

/** Active staff, sorted by name, for the "Assign to" pickers. */
function staff() {
  return (store.get().users || [])
    .filter((u) => u.active && u.role !== 'viewer') // viewers can't upload, so they aren't assignable
    .sort((a, b) => (a.displayName || a.email).localeCompare(b.displayName || b.email));
}

function assigneeOptions(selected) {
  const me = store.get().user.uid;
  const list = staff();
  // Keep the current assignee visible even if they've since become view-only or inactive.
  const current = selected && !list.some((u) => u.uid === selected) ? (store.get().users || []).find((u) => u.uid === selected) : null;
  return [
    h('option', { value: '' }, 'Unassigned'),
    current ? h('option', { value: current.uid, selected: true }, `${current.displayName || current.email} (${current.active ? 'view-only' : 'inactive'} — reassign)`) : null,
    ...list.map((u) => h('option', { value: u.uid, selected: u.uid === selected }, `${u.displayName || u.email}${u.uid === me ? ' (me)' : ''}`)),
  ].filter(Boolean);
}

export function renderRequests(page) {
  const me = store.get().user.uid;
  const isAdmin = store.isAdmin();

  const toggleBtn = h(
    'div',
    { class: 'btn-row' },
    h('a', { href: '#/requests/import', class: 'btn btn-ghost' }, icon('download'), h('span', {}, 'Import')),
    h('a', { href: '#/requests/new', class: 'btn btn-primary' }, icon('plus'), h('span', {}, 'New request')),
  );

  // ---------- list ----------
  const tabsEl = h('div', { class: 'seg', role: 'tablist' });
  const search = h('input', { type: 'search', value: view.q, placeholder: 'Search make, model, serial, EIN…', 'aria-label': 'Search requests', oninput: (e) => { view.q = e.target.value; view.page = 1; draw(); } });
  const whoSel = h(
    'select',
    { class: 'who-select', 'aria-label': 'Show', onchange: (e) => { view.who = e.target.value; view.page = 1; draw(); } },
    h('option', { value: 'all', selected: view.who === 'all' }, 'Everyone’s requests'),
    h('option', { value: 'assigned', selected: view.who === 'assigned' }, 'Assigned to me'),
    h('option', { value: 'mine', selected: view.who === 'mine' }, 'Requested by me'),
    h('option', { value: 'unassigned', selected: view.who === 'unassigned' }, 'Unassigned'),
  );
  const list = h('div', { class: 'todo-list' });
  const pg = pager(view, () => draw(), { noun: 'requests', scrollTo: list });

  mount(page, 
    h('div', { class: 'page-head' }, h('div', {}, h('p', { class: 'muted' }, 'Units that need photos taken — added by hand or from the daily equipment report. Use “Upload photos” and the unit moves to Pending.')), toggleBtn),
    h('div', { class: 'todo-toolbar' }, tabsEl, h('div', { class: 'todo-filters' }, h('div', { class: 'search-wrap compact' }, icon('search'), search), whoSel)),
    list,
    pg.el,
    deletedLink(),
  );

  async function run(promise, okMsg) {
    try {
      await promise;
      if (okMsg) toast(okMsg);
    } catch (err) {
      toast(err.message, 'error');
      draw();
    }
  }

  function item(req, equipment) {
    const done = req.status === 'done';
    const eq = req.equipmentId ? equipment?.find((e) => e.id === req.equipmentId) : null;
    const thumb = eq ? coverThumb(eq) : null;
    const today = todayISO();
    const overdue = !done && req.dueDate && req.dueDate < today;
    const dueToday = !done && req.dueDate === today;
    const canEdit = isAdmin || req.createdBy === me;
    const title = [req.year, req.make, req.model].filter(Boolean).join(' ') || 'Unit';
    const ids = [req.serial && `Serial ${req.serial}`, req.ein && `EIN ${req.ein}`, req.warehouse, req.hours != null && `${Number(req.hours).toLocaleString()} hrs`].filter(Boolean).join(' · ');
    const missing = eq ? PHOTO_SLOTS.filter((s) => !eq.photos?.[s.key]).map((s) => s.key) : null;

    const mayCheck = store.canEdit() || req.createdBy === me;
    const check = h('input', {
      type: 'checkbox',
      class: 'todo-check',
      checked: done,
      disabled: !mayCheck,
      title: mayCheck ? null : 'View-only accounts can’t check off other people’s requests',
      'aria-label': done ? `Reopen request for ${title}` : `Mark request for ${title} done`,
      onchange: (e) => run(e.target.checked ? completeRequest(req.id) : reopenRequest(req.id), e.target.checked ? 'Marked done — find it under Completed' : 'Request reopened'),
    });

    // Assignee: editable by the requester or an admin while open; read-only otherwise.
    const assignEl =
      canEdit && !done
        ? h(
            'label',
            { class: 'assign-inline' },
            h('span', {}, 'Assigned to'),
            h(
              'select',
              {
                onchange: (e) => {
                  const u = staff().find((x) => x.uid === e.target.value) || null;
                  run(assignRequest(req.id, u), u ? (u.uid === me ? 'Assigned to you' : `Assigned to ${u.displayName || u.email} — they’ve been emailed`) : 'Unassigned');
                },
              },
              assigneeOptions(req.assignedTo),
            ),
          )
        : h('span', { class: `assignee${req.assignedTo === me ? ' me' : ''}` }, req.assignedTo ? `Assigned to ${req.assignedTo === me ? 'you' : req.assignedToName || 'someone'}` : 'Unassigned');

    return h(
      'article',
      { class: `todo${done ? ' is-done' : ''}${overdue ? ' is-overdue' : ''}${req.assignedTo === me && !done ? ' is-mine' : ''}` },
      check,
      h(
        'div',
        { class: 'todo-body' },
        h(
          'div',
          { class: 'todo-title' },
          h('strong', {}, title),
          req.dueDate ? h('span', { class: `due${overdue ? ' overdue' : dueToday ? ' today' : ''}` }, overdue ? `Overdue · ${fmtDue(req.dueDate)}` : dueToday ? 'Due today' : `Due ${fmtDue(req.dueDate)}`) : null,
        ),
        ids ? h('div', { class: 'todo-ids mono' }, ids) : null,
        h(
          'div',
          { class: 'todo-angles' },
          req.angles?.length
            ? req.angles.map((k) => h('span', { class: `angle${missing && !missing.includes(k) ? ' have' : ''}` }, slotLabel(k)))
            : h('span', { class: 'angle all' }, 'All angles'),
        ),
        req.notes ? h('p', { class: 'todo-notes prewrap' }, req.notes) : null,
        h('div', { class: 'todo-assign' }, assignEl),
        h(
          'div',
          { class: 'todo-meta muted small' },
          `Requested by ${req.createdByName || req.createdByEmail} · ${fmtDate(req.createdAt)}`,
          done ? ` — done by ${req.completedByName || 'someone'} · ${fmtDate(req.completedAt)}` : null,
          eq
            ? h(
                'span',
                {},
                ' · Linked to ',
                h('a', { href: `#/equipment/${eq.id}` }, `${eq.make} ${eq.model} (Serial ${eq.serial})`),
                missing ? ` · ${PHOTO_SLOTS.length - missing.length}/${PHOTO_SLOTS.length} photos` : '',
                canEdit && !done ? h('button', { class: 'link-btn unlink', onclick: () => run(linkRequest(req.id, null), 'Unlinked — Upload photos will start a new submission') }, 'Not this unit') : null,
              )
            : req.equipmentId
              ? ' · Linked unit was deleted'
              : null,
        ),
      ),
      h(
        'div',
        { class: 'todo-actions' },
        thumb ? h('img', { src: thumb, alt: '', class: 'thumb', loading: 'lazy' }) : null,
        !done && store.canEdit() ? h('a', { href: fulfillHref(req), class: 'btn btn-primary btn-sm' }, icon('camera'), h('span', {}, 'Upload photos')) : null,
        canEdit
          ? h(
              'button',
              {
                class: 'icon-btn danger',
                title: 'Delete request',
                'aria-label': `Delete request for ${title}`,
                onclick: async () => {
                  const ok = await confirmDialog({ title: 'Delete this request?', message: `${title}${req.serial ? ` (Serial ${req.serial})` : ''} will be removed from the list.`, confirmLabel: 'Delete', danger: true });
                  if (ok) run(deleteRequest(req.id), 'Request deleted');
                },
              },
              icon('trash'),
            )
          : null,
      ),
    );
  }

  function draw() {
    const { requests, requestsError, equipment } = store.get();
    if (requestsError) {
      mount(clear(list), h('div', { class: 'card empty' }, `Couldn't load requests: ${requestsError}`));
      return;
    }
    if (!requests) {
      mount(clear(list), h('div', { class: 'center-pad' }, h('div', { class: 'spinner' })));
      return;
    }
    const open = requests.filter((r) => r.status !== 'done');
    const done = requests.filter((r) => r.status === 'done');

    const tab = (key, label, n) =>
      h('button', { role: 'tab', 'aria-selected': String(view.tab === key), class: `seg-btn${view.tab === key ? ' active' : ''}`, onclick: () => { view.tab = key; view.page = 1; draw(); } }, label, h('span', { class: 'seg-count' }, n));
    mount(clear(tabsEl), tab('open', 'Open', open.length), tab('done', 'Completed', done.length));

    const q = norm(view.q);
    let rows = (view.tab === 'open' ? open : done).filter((r) => {
      if (view.who === 'assigned' && r.assignedTo !== me) return false;
      if (view.who === 'mine' && r.createdBy !== me) return false;
      if (view.who === 'unassigned' && r.assignedTo) return false;
      if (!q) return true;
      const hay = norm([r.make, r.model, r.serial, r.ein, r.warehouse, r.notes, r.createdByName, r.assignedToName].join(' '));
      return q.split(/\s+/).every((t) => hay.includes(t));
    });
    if (view.tab === 'open') {
      // Due date first (overdue on top), then oldest request first.
      rows = [...rows].sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999') || (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0));
    } else {
      rows = [...rows].sort((a, b) => (b.completedAt?.toMillis?.() ?? 0) - (a.completedAt?.toMillis?.() ?? 0));
    }

    clear(list);
    if (!rows.length) {
      pg.slice([]);
      mount(list, 
        h(
          'div',
          { class: 'card empty' },
          requests.length && (q || view.who !== 'all')
            ? h('p', {}, 'No requests match.')
            : view.tab === 'open'
              ? h('div', {}, h('p', {}, 'Nothing waiting on photos. 🎉'), h('a', { href: '#/requests/new', class: 'btn btn-primary' }, 'New request'))
              : h('p', {}, 'No completed requests yet.'),
        ),
      );
      return;
    }
    mount(list, ...pg.slice(rows).map((r) => item(r, equipment)));
  }

  draw();
  return store.subscribe(draw);
}

/** "New photo request" — its own page, like the unit submission form. */
export function renderNewRequest(page) {
  const me = store.get().user.uid;
  let dirty = false;
  setLeaveGuard(() => dirty);

  // ---------- new request form ----------
  const warehouses = () => store.get().settings.warehouses || [];
  const f = {
    make: h('input', { id: 'rq-make', value: 'Bobcat', maxlength: 80, autocomplete: 'off' }),
    model: h('input', { id: 'rq-model', maxlength: 80, placeholder: 'e.g. T76', autocomplete: 'off' }),
    serial: h('input', { id: 'rq-serial', maxlength: 60, class: 'mono', autocomplete: 'off' }),
    ein: h('input', { id: 'rq-ein', maxlength: 40, class: 'mono', autocomplete: 'off' }),
    warehouse: h('select', { id: 'rq-wh' }),
    assignee: h('select', { id: 'rq-assign' }),
    due: h('input', { id: 'rq-due', type: 'date', min: todayISO() }),
    notes: h('textarea', { id: 'rq-notes', rows: 2, maxlength: 2000, placeholder: 'Anything the photographer should know — where it’s parked, what to focus on…' }),
  };
  function fillSelects() {
    const wh = f.warehouse.value;
    mount(clear(f.warehouse), h('option', { value: '' }, 'Any / not sure'), ...warehouses().map((w) => h('option', { value: w }, w)));
    f.warehouse.value = wh;
    const who = f.assignee.value;
    mount(clear(f.assignee), ...assigneeOptions(who));
    f.assignee.value = who;
  }
  fillSelects();

  // Suggest an existing unit when the serial / EIN matches one — the requester decides whether to link it.
  const linkCb = h('input', { type: 'checkbox' });
  const matchBox = h('div', { class: 'match-box', hidden: true });
  let candidate = null;
  function updateMatch() {
    const found = findCandidate({ serial: f.serial.value, ein: f.ein.value }, store.get().equipment);
    const prevId = candidate?.eq.id;
    candidate = found;
    if (!found) {
      matchBox.hidden = true;
      linkCb.checked = false;
      return;
    }
    const { eq, by } = found;
    if (eq.id !== prevId) linkCb.checked = false; // never pre-checked: linking is a deliberate choice
    const thumb = coverThumb(eq);
    const modelDiffers = f.model.value.trim() && eq.model && norm(f.model.value) !== norm(eq.model);
    mount(clear(matchBox), 
      thumb ? h('img', { src: thumb, alt: '', class: 'thumb' }) : h('div', { class: 'thumb thumb-empty' }, icon('image')),
      h(
        'div',
        { class: 'grow' },
        h('div', {}, h('strong', {}, `Same ${by} as a unit already in inventory:`)),
        h('div', { class: 'small' }, `${eq.year ? `${eq.year} ` : ''}${eq.make} ${eq.model} · Serial ${eq.serial}${eq.ein ? ` · EIN ${eq.ein}` : ''}${eq.warehouse ? ` · ${eq.warehouse}` : ''} `, h('a', { href: `#/equipment/${eq.id}`, target: '_blank' }, 'view')),
        modelDiffers ? h('div', { class: 'small warn' }, `Heads up: the model (${eq.model}) doesn’t match what you typed.`) : null,
        h('label', { class: 'check-inline' }, linkCb, h('span', {}, 'This is the same unit — add the photos to it')),
      ),
    );
    matchBox.hidden = false;
  }
  ['input', 'change'].forEach((ev) => {
    f.serial.addEventListener(ev, updateMatch);
    f.ein.addEventListener(ev, updateMatch);
    f.model.addEventListener(ev, updateMatch);
  });

  const angleBoxes = PHOTO_SLOTS.map((s) => {
    const cb = h('input', { type: 'checkbox', value: s.key });
    return { cb, el: h('label', { class: 'chip-check' }, cb, h('span', {}, s.label)) };
  });
  const allBtn = h('button', { type: 'button', class: 'link-btn', onclick: () => {
    const allOn = angleBoxes.every((a) => a.cb.checked);
    angleBoxes.forEach((a) => (a.cb.checked = !allOn));
  } }, 'Select all / none');

  const msg = h('p', { class: 'form-msg', role: 'alert' });
  const saveBtn = h('button', { type: 'submit', class: 'btn btn-primary' }, 'Add request');
  const field = (label, id, el, cls = '') => h('div', { class: `field ${cls}` }, h('label', { for: id }, label), el);

  const formCard = h(
    'form',
    {
      class: 'card request-form',
      oninput: () => (dirty = true),
      onsubmit: async (e) => {
        e.preventDefault();
        msg.className = 'form-msg';
        msg.textContent = '';
        const assignee = staff().find((u) => u.uid === f.assignee.value) || null;
        const data = {
          make: f.make.value.trim(),
          model: f.model.value.trim(),
          serial: f.serial.value.trim(),
          ein: f.ein.value.trim(),
          warehouse: f.warehouse.value,
          dueDate: f.due.value || null,
          notes: f.notes.value.trim(),
          // Every angle ticked = "all angles" (stored as an empty list).
          angles: angleBoxes.every((a) => a.cb.checked) ? [] : angleBoxes.filter((a) => a.cb.checked).map((a) => a.cb.value),
          equipmentId: candidate && linkCb.checked ? candidate.eq.id : null,
          assignedTo: assignee?.uid || null,
          assignedToName: assignee ? assignee.displayName || assignee.email : null,
        };
        if (!data.serial && !data.ein && !data.model) {
          msg.textContent = 'Enter at least a serial #, EIN, or model so the unit can be found.';
          f.serial.focus();
          return;
        }
        saveBtn.disabled = true;
        try {
          await createRequest(data);
          toast(assignee && assignee.uid !== me ? `Request added — ${data.assignedToName} has been emailed` : 'Photo request added');
          dirty = false;
          setLeaveGuard(null);
          view.tab = 'open';
          navigate('/requests');
        } catch (err) {
          msg.textContent = err.message;
        } finally {
          saveBtn.disabled = false;
        }
      },
    },
    h('h2', { class: 'section-title' }, 'Unit'),
    h(
      'div',
      { class: 'form-grid' },
      field('Make', 'rq-make', f.make),
      field('Model', 'rq-model', f.model),
      field('Serial #', 'rq-serial', f.serial),
      field('EIN', 'rq-ein', f.ein),
      field('Warehouse', 'rq-wh', f.warehouse),
      field('Assign to', 'rq-assign', f.assignee),
      field('Needed by', 'rq-due', f.due),
    ),
    matchBox,
    h(
      'div',
      { class: 'field wide angles-field' },
      h('div', { class: 'angles-head' }, h('span', { class: 'label-like' }, 'Angles needed'), h('span', { class: 'muted small' }, 'Leave all unchecked for “all angles”.'), allBtn),
      h('div', { class: 'chip-checks' }, angleBoxes.map((a) => a.el)),
    ),
    field('Notes', 'rq-notes', f.notes, 'wide'),
    msg,
    h('div', { class: 'form-actions-row' }, h('a', { href: '#/requests', class: 'btn btn-ghost' }, 'Cancel'), saveBtn),
  );


  mount(page, 
    h(
      'div',
      { class: 'page-head' },
      h('div', {}, h('a', { href: '#/requests', class: 'back-link' }, icon('back'), 'Back to requests'), h('h1', {}, 'New photo request'), h('p', { class: 'muted' }, 'Ask for photos of a unit. Assign it to someone and they’ll get an email.')),
    ),
    formCard,
  );
  f.model.focus();

  // Warehouse / staff lists can arrive after the page opens.
  const unsub = store.subscribe(fillSelects);
  return () => {
    unsub();
    setLeaveGuard(null);
  };
}
