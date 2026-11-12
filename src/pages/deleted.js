// Admin: Deleted units. Deleting a unit moves it here for TRASH_DAYS (restorable, photos kept);
// after that the purgeDeletedUnits function removes it and its photos for good.
import { h, clear, icon, toast, mount, fmtDate, pager } from '../ui.js';
import { store } from '../store.js';
import { coverThumb, restoreEquipment, TRASH_DAYS } from '../data.js';
import { purgeNow } from './detail.js';

const DAY = 86400000;
const daysLeft = (eq) => {
  const t = eq.deletedAt?.toDate?.();
  return t ? Math.max(0, Math.ceil((+t + TRASH_DAYS * DAY - Date.now()) / DAY)) : TRASH_DAYS;
};

/** Small "Deleted units (n)" link for the bottom of Pending, Listed and Requests (admins only). */
export function deletedLink() {
  if (!store.isAdmin()) return null;
  const count = h('span', {});
  const el = h('div', { class: 'deleted-link' }, h('a', { href: '#/deleted' }, icon('trash'), h('span', {}, 'Deleted units'), count));
  const update = (s) => {
    const n = (s.trash || []).length;
    count.textContent = n ? ` (${n})` : '';
  };
  update(store.get());
  const unsub = store.subscribe((s) => {
    if (!el.isConnected && el.dataset.mounted) return unsub();
    if (el.isConnected) el.dataset.mounted = '1';
    update(s);
  });
  return el;
}

export function renderDeleted(page) {
  const state = { page: 1 };
  const list = h('div', { class: 'card table-card' });
  const pg = pager(state, draw, { noun: 'units' });

  function row(eq) {
    const thumb = coverThumb(eq);
    const left = daysLeft(eq);
    return h(
      'div',
      { class: 'trash-row' },
      h('a', { href: `#/equipment/${eq.id}`, class: 'thumb' }, thumb ? h('img', { src: thumb, alt: '', loading: 'lazy' }) : icon('image')),
      h(
        'div',
        { class: 'trash-main' },
        h('a', { href: `#/equipment/${eq.id}` }, h('strong', {}, [eq.year, eq.make, eq.model].filter(Boolean).join(' '))),
        h('div', { class: 'muted small' }, [`Serial ${eq.serial}`, eq.ein && `EIN ${eq.ein}`, eq.warehouse].filter(Boolean).join(' · ')),
      ),
      h(
        'div',
        { class: 'trash-meta small' },
        h('div', {}, `Was ${eq.deletedFromStatus === 'archived' ? 'Listed' : 'Pending'} · deleted ${fmtDate(eq.deletedAt)}`),
        h('div', { class: 'muted' }, eq.deletedByEmail ? `by ${eq.deletedByEmail}` : eq.deletedReason || ''),
        h('div', { class: left <= 3 ? 'warn' : 'muted' }, left ? `Removed for good in ${left} day${left === 1 ? '' : 's'}` : 'Removed for good tonight'),
      ),
      h(
        'div',
        { class: 'btn-row trash-actions' },
        h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => purgeNow(eq, () => {}) }, 'Delete forever'),
        h(
          'button',
          {
            type: 'button',
            class: 'btn btn-primary btn-sm',
            onclick: async (e) => {
              e.currentTarget.disabled = true;
              try {
                await restoreEquipment(eq);
                toast(`${eq.make} ${eq.model} restored to ${eq.deletedFromStatus === 'archived' ? 'Listed' : 'Pending'}`);
              } catch (err) {
                toast(err.message, 'error');
                e.currentTarget.disabled = false;
              }
            },
          },
          'Restore',
        ),
      ),
    );
  }

  function draw() {
    const items = [...(store.get().trash || [])].sort((a, b) => (b.deletedAt?.toMillis?.() || 0) - (a.deletedAt?.toMillis?.() || 0));
    if (!store.get().equipment) {
      mount(clear(list), h('p', { class: 'muted pad' }, 'Loading…'));
      return;
    }
    if (!items.length) {
      mount(clear(list), h('p', { class: 'muted pad' }, 'Nothing has been deleted in the last 30 days.'));
      pg.slice([]);
      return;
    }
    mount(clear(list), ...pg.slice(items).map(row));
  }

  mount(
    page,
    h(
      'div',
      { class: 'page-head' },
      h(
        'div',
        {},
        h('a', { href: '#/', class: 'back-link', onclick: (e) => { if (history.length > 1) { e.preventDefault(); history.back(); } } }, icon('back'), 'Back'),
        h('h1', {}, 'Deleted units'),
        h('p', { class: 'muted' }, `Units deleted by an admin or removed after 60 days off the equipment report. Restore one to put it back where it was; after ${TRASH_DAYS} days they’re removed for good with their photos.`),
      ),
    ),
    list,
    pg.el,
  );
  draw();
  return store.subscribe(draw);
}

