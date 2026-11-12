import { h, clear, icon, toast, fmtDate, confirmDialog, mount, pager } from '../ui.js';
import { store } from '../store.js';
import { STATUSES, PHOTO_SLOTS, OFF_REPORT_DAYS } from '../config.js';
import { coverThumb, setStatus, deleteEquipment } from '../data.js';
import { navigate } from '../main.js';
import { deletedLink } from './deleted.js';

// Filters survive navigating to a unit and back (per tab, per browser session).
const saved = {
  main: { q: '', make: '', model: '', warehouse: '', ein: '', serial: '', status: '', sort: 'createdAt', dir: 'desc' },
  archive: { q: '', make: '', model: '', warehouse: '', ein: '', serial: '', status: '', sort: 'createdAt', dir: 'desc' },
};

const COLUMNS = [
  { key: 'photo', label: 'Photo', sortable: false },
  { key: 'make', label: 'Make' },
  { key: 'model', label: 'Model' },
  { key: 'warehouse', label: 'Warehouse' },
  { key: 'ein', label: 'EIN' },
  { key: 'serial', label: 'Serial #' },
  { key: 'createdAt', label: 'Submitted' },
  { key: 'status', label: 'Status' },
];

const norm = (s) => String(s ?? '').toLowerCase().trim();

// Dropped off the daily equipment report (usually sold); deleted automatically after OFF_REPORT_DAYS.
export function offReportTag(eq) {
  if (!eq.offReport) return null;
  const since = eq.offReport.since?.toDate?.();
  const left = since ? Math.max(0, OFF_REPORT_DAYS - Math.floor((Date.now() - since) / 86400000)) : null;
  return h('span', { class: 'offreport-tag block', title: left != null ? `Deleted automatically in ${left} day${left === 1 ? '' : 's'} unless it comes back on the report or an admin keeps it` : '' }, `Not on report${since ? ` since ${since.toLocaleDateString([], { month: 'short', day: 'numeric' })}` : ''}`);
}

// "3/11 photos" so admins can see at a glance what's ready to post.
function photoTag(eq) {
  const n = PHOTO_SLOTS.filter((s) => eq.photos?.[s.key]).length;
  return h('span', { class: `photo-tag block${n === 0 ? ' none' : n === PHOTO_SLOTS.length ? ' full' : ''}` }, n ? `${n}/${PHOTO_SLOTS.length} photos` : 'No photos yet');
}

export function renderInventory(page, { archive }) {
  const f = saved[archive ? 'archive' : 'main'];
  const isAdmin = store.isAdmin();

  // ----- filter controls -----
  const makeSel = h('select', { id: 'f-make', onchange: (e) => update({ make: e.target.value }) });
  const whSel = h('select', { id: 'f-wh', onchange: (e) => update({ warehouse: e.target.value }) });
  const textInput = (id, key, placeholder) =>
    h('input', { id, type: 'search', value: f[key], placeholder, autocomplete: 'off', oninput: (e) => update({ [key]: e.target.value }) });

  const statusSel = archive
    ? h(
        'select',
        { id: 'f-status', onchange: (e) => update({ status: e.target.value }) },
        h('option', { value: '' }, 'All listed'),
        h('option', { value: 'offreport', selected: f.status === 'offreport' }, 'Not on report'),
      )
    : h(
        'select',
        { id: 'f-status', onchange: (e) => update({ status: e.target.value }) },
        h('option', { value: '' }, 'All pending'),
        h('option', { value: 'active', selected: f.status === 'active' }, 'Pending (not hidden)'),
        h('option', { value: 'hidden', selected: f.status === 'hidden' }, 'Hidden'),
        h('option', { value: 'followup', selected: f.status === 'followup' }, 'Needs follow-up'),
        h('option', { value: 'offreport', selected: f.status === 'offreport' }, 'Not on report'),
      );

  const qInput = h('input', {
    type: 'search',
    class: 'search-main',
    value: f.q,
    placeholder: 'Search make, model, EIN, serial, warehouse…',
    'aria-label': 'Search all fields',
    oninput: (e) => update({ q: e.target.value }),
  });

  const count = h('span', { class: 'muted' });
  const tbody = h('tbody');
  const thead = h('thead');
  const empty = h('div', { class: 'empty', hidden: true });
  const pg = pager(f, draw, { noun: 'units' });
  const tableCard = h('section', { class: 'card table-card' }, h('div', { class: 'table-scroll' }, h('table', { class: 'eq-table' }, thead, tbody)), empty, pg.el);

  const field = (label, id, control) => h('div', { class: 'field' }, h('label', { for: id }, label), control);

  mount(page, 
    h(
      'div',
      { class: 'page-head' },
      h('div', {}, archive ? h('h1', {}, 'Listed') : null, h('p', { class: 'muted' }, archive ? 'Units whose photos have been posted. Photos stay here for sales reps. Change the status to move one back to Pending.' : 'Units waiting on photos or to be posted. Open one to see its photos, download them, or mark it Listed.')),
      !archive && store.canEdit() && h('a', { href: '#/new', class: 'btn btn-primary' }, icon('plus'), h('span', {}, 'Add Equipment')),
    ),
    h(
      'section',
      { class: 'card filters' },
      h('div', { class: 'search-wrap' }, icon('search'), qInput),
      h(
        'div',
        { class: 'filter-grid' },
        field('Make', 'f-make', makeSel),
        field('Model', 'f-model', textInput('f-model', 'model', 'Any model')),
        field('Warehouse', 'f-wh', whSel),
        field('EIN', 'f-ein', textInput('f-ein', 'ein', 'Any EIN')),
        field('Serial #', 'f-serial', textInput('f-serial', 'serial', 'Any serial')),
        statusSel && field('Status', 'f-status', statusSel),
      ),
      h('div', { class: 'filter-foot' }, count, h('button', { class: 'link-btn', onclick: resetFilters }, 'Clear filters')),
    ),
    tableCard,
    deletedLink(),
  );

  function resetFilters() {
    Object.assign(f, { q: '', make: '', model: '', warehouse: '', ein: '', serial: '', status: '', page: 1 });
    page.querySelectorAll('.filters input').forEach((i) => (i.value = ''));
    page.querySelectorAll('.filters select').forEach((s) => (s.value = ''));
    draw();
  }

  function update(patch) {
    Object.assign(f, patch, { page: 1 }); // new search/filter → back to page 1
    draw();
  }

  function fillSelect(sel, values, current, anyLabel) {
    const want = [anyLabel, ...values].join('|');
    if (sel.dataset.sig === want) return;
    sel.dataset.sig = want;
    mount(clear(sel), h('option', { value: '' }, anyLabel), ...values.map((v) => h('option', { value: v, selected: v === current }, v)));
    if (current && !values.includes(current)) sel.value = '';
  }

  function drawHead() {
    mount(clear(thead), 
      h(
        'tr',
        {},
        COLUMNS.map((c) =>
          c.sortable === false
            ? h('th', { class: `col-${c.key}` }, c.label)
            : h(
                'th',
                { class: `col-${c.key} sortable${f.sort === c.key ? ' sorted' : ''}`, 'aria-sort': f.sort === c.key ? (f.dir === 'asc' ? 'ascending' : 'descending') : 'none' },
                h(
                  'button',
                  {
                    onclick: () => {
                      if (f.sort === c.key) f.dir = f.dir === 'asc' ? 'desc' : 'asc';
                      else Object.assign(f, { sort: c.key, dir: c.key === 'createdAt' ? 'desc' : 'asc' });
                      f.page = 1;
                      draw();
                    },
                  },
                  c.label,
                  h('span', { class: 'sort-arrow' }, f.sort === c.key ? (f.dir === 'asc' ? '▲' : '▼') : ''),
                ),
              ),
        ),
      ),
    );
  }

  function statusControl(eq) {
    const st = STATUSES.find((s) => s.key === eq.status) || STATUSES[0];
    if (!isAdmin) return h('span', { class: `status-badge status-${st.key}` }, st.label);
    const sel = h(
      'select',
      {
        class: `status-select status-${eq.status}`,
        'aria-label': `Status for ${eq.make} ${eq.model}`,
        onclick: (e) => e.stopPropagation(),
        onchange: async (e) => {
          const next = e.target.value;
          const prev = eq.status;
          sel.className = `status-select status-${next}`;
          try {
            await setStatus(eq.id, next);
            if (next === 'archived') toast(`${eq.make} ${eq.model} moved to Listed`);
            else if (prev === 'archived') toast(`${eq.make} ${eq.model} moved back to Pending`);
          } catch (err) {
            sel.value = prev;
            sel.className = `status-select status-${prev}`;
            toast(`Couldn't change status: ${err.message}`, 'error');
          }
        },
      },
      STATUSES.map((s) => h('option', { value: s.key, selected: s.key === eq.status }, s.label)),
    );
    return sel;
  }

  function row(eq) {
    const thumb = coverThumb(eq);
    const open = () => {
      // Opening a unit clears the search/filters, so coming back shows the full list (sort order is kept).
      Object.assign(f, { q: '', make: '', model: '', warehouse: '', ein: '', serial: '', status: '', page: 1 });
      navigate(`/equipment/${eq.id}`);
    };
    return h(
      'tr',
      {
        class: 'eq-row',
        tabindex: '0',
        onclick: open,
        onkeydown: (e) => {
          if (e.key === 'Enter' && e.target === e.currentTarget) open();
        },
      },
      h('td', { class: 'col-photo' }, thumb ? h('img', { src: thumb, alt: '', loading: 'lazy', class: 'thumb' }) : h('div', { class: 'thumb thumb-empty' }, icon('image'))),
      h(
        'td',
        { 'data-label': 'Make', class: 'col-make' },
        h('strong', {}, eq.make || '—'),
        eq.followUp?.open ? h('span', { class: 'followup-tag block', title: eq.followUp.text || '' }, 'Needs follow-up') : null,
        !archive ? photoTag(eq) : null,
        offReportTag(eq),
      ),
      h('td', { 'data-label': 'Model', class: 'col-model' }, eq.model || '—', eq.year ? h('span', { class: 'muted small block' }, eq.year) : null),
      h('td', { 'data-label': 'Warehouse' }, eq.warehouse || '—'),
      h('td', { 'data-label': 'EIN', class: 'mono' }, eq.ein || '—'),
      h('td', { 'data-label': 'Serial #', class: 'mono' }, eq.serial || '—'),
      h('td', { 'data-label': 'Submitted' }, h('span', { class: 'cell-val' }, fmtDate(eq.createdAt), h('span', { class: 'muted small block' }, eq.createdByName || ''))),
      h(
        'td',
        { 'data-label': 'Status', class: 'col-status' },
        h('span', { class: 'cell-val' },
        statusControl(eq),
        isAdmin
          ? h(
              'button',
              {
                class: 'icon-btn danger',
                title: 'Delete',
                'aria-label': `Delete ${eq.make} ${eq.model}`,
                onclick: async (e) => {
                  e.stopPropagation();
                  const ok = await confirmDialog({
                    title: 'Delete this unit?',
                    message: `${eq.make} ${eq.model} (Serial ${eq.serial}) moves to Deleted units. You can restore it for 30 days; after that it and its photos are removed for good.`,
                    confirmLabel: 'Delete',
                    danger: true,
                  });
                  if (!ok) return;
                  try {
                    await deleteEquipment(eq.id, eq.status);
                    toast(`${eq.make} ${eq.model} moved to Deleted units`);
                  } catch (err) {
                    toast(`Delete failed: ${err.message}`, 'error');
                  }
                },
              },
              icon('trash'),
            )
          : null,
        ),
      ),
    );
  }

  function draw() {
    const { equipment, equipmentError, settings } = store.get();
    drawHead();

    if (equipmentError) {
      clear(tbody);
      empty.hidden = false;
      mount(clear(empty), h('p', {}, `Couldn't load equipment: ${equipmentError}`));
      return;
    }
    if (!equipment) {
      clear(tbody);
      empty.hidden = false;
      mount(clear(empty), h('div', { class: 'spinner' }));
      return;
    }

    const inTab = equipment.filter((e) => (archive ? e.status === 'archived' : e.status !== 'archived'));

    const makes = [...new Set(inTab.map((e) => e.make).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const warehouses = [...new Set([...(settings.warehouses || []), ...inTab.map((e) => e.warehouse).filter(Boolean)])].sort((a, b) => a.localeCompare(b));
    fillSelect(makeSel, makes, f.make, 'All makes');
    fillSelect(whSel, warehouses, f.warehouse, 'All warehouses');

    const q = norm(f.q);
    const rows = inTab.filter((e) => {
      if (f.make && e.make !== f.make) return false;
      if (f.warehouse && e.warehouse !== f.warehouse) return false;
      if (f.status === 'followup') {
        if (!e.followUp?.open) return false;
      } else if (f.status === 'offreport') {
        if (!e.offReport) return false;
      } else if (f.status && e.status !== f.status) return false;
      if (f.model && !norm(e.model).includes(norm(f.model))) return false;
      if (f.ein && !norm(e.ein).includes(norm(f.ein))) return false;
      if (f.serial && !norm(e.serial).includes(norm(f.serial))) return false;
      if (q) {
        const hay = norm([e.make, e.model, e.year, e.warehouse, e.ein, e.serial, e.attachments, e.comments, e.condition, e.createdByName].join(' '));
        if (!q.split(/\s+/).every((t) => hay.includes(t))) return false;
      }
      return true;
    });

    const dir = f.dir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      if (f.sort === 'createdAt') {
        const ta = a.createdAt?.toMillis?.() ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? 0;
        return (ta - tb) * dir;
      }
      return String(a[f.sort] ?? '').localeCompare(String(b[f.sort] ?? ''), undefined, { numeric: true, sensitivity: 'base' }) * dir;
    });

    count.textContent = `${rows.length} of ${inTab.length} unit${inTab.length === 1 ? '' : 's'}`;
    mount(clear(tbody), ...pg.slice(rows).map(row));

    empty.hidden = rows.length > 0;
    if (!rows.length) {
      mount(clear(empty), 
        inTab.length
          ? h('p', {}, 'No units match these filters.')
          : archive
            ? h('p', {}, 'Nothing listed yet. Units move here when they’re marked Listed.')
            : h('div', {}, h('p', {}, 'No equipment submitted yet.'), store.canEdit() ? h('a', { href: '#/new', class: 'btn btn-primary' }, 'Add the first piece of equipment') : null),
      );
    }
  }

  draw();
  return store.subscribe(draw);
}
