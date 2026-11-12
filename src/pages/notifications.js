// Shared email-notification settings form (used on My account and by admins on the Users page).
import { h, toast, icon, mount } from '../ui.js';
import { store } from '../store.js';
import { saveNotifications } from '../data.js';

/** Effective settings for a user, including defaults for accounts created before these settings existed. */
export function notifyPrefs(u = {}) {
  return {
    newUnits: u.notifyNewUnits || (u.role === 'admin' && u.notify !== false ? 'all' : 'none'),
    locations: Array.isArray(u.notifyLocations) ? u.notifyLocations : [],
    assigned: u.notifyAssigned !== false,
    messages: u.notifyMessages !== false,
    photosReady: u.notifyPhotosReady !== false,
  };
}

/** One-line summary for tables, e.g. "All new units · assignments". */
export function notifySummary(u) {
  const p = notifyPrefs(u);
  const units =
    p.newUnits === 'all' ? 'All new units' : p.newUnits === 'locations' ? (p.locations.length ? p.locations.join(', ') : 'No locations picked') : 'No new units';
  return `${units} · assignments ${p.assigned ? 'on' : 'off'} · messages ${p.messages ? 'on' : 'off'}`;
}

let seq = 0;

/**
 * Builds the settings form for `user` (a users/{uid} doc with `uid`).
 * onSaved() runs after a successful save.
 */
export function notificationsForm(user, { onSaved, compact = false } = {}) {
  const id = `nf${++seq}`;
  const p = notifyPrefs(user);
  const self = user.uid === store.get().user?.uid;
  const warehouses = [...new Set([...(store.get().settings.warehouses || []), ...p.locations])].sort((a, b) => a.localeCompare(b));

  const assigned = h('input', { type: 'checkbox', checked: p.assigned });
  const messagesCb = h('input', { type: 'checkbox', checked: p.messages });
  const readyCb = h('input', { type: 'checkbox', checked: p.photosReady });
  const radio = (value, label, hint) =>
    h(
      'label',
      { class: 'radio-row' },
      h('input', { type: 'radio', name: `${id}-mode`, value, checked: p.newUnits === value, onchange: sync }),
      h('span', {}, h('strong', {}, label), hint ? h('span', { class: 'muted small block' }, hint) : null),
    );

  const locBoxes = warehouses.map((w) => {
    const cb = h('input', { type: 'checkbox', value: w, checked: p.locations.includes(w) });
    return { cb, el: h('label', { class: 'chip-check' }, cb, h('span', {}, w)) };
  });
  const locWrap = h(
    'div',
    { class: 'loc-picker' },
    locBoxes.length ? h('div', { class: 'chip-checks' }, locBoxes.map((b) => b.el)) : h('p', { class: 'muted small' }, 'No warehouses set up yet — an admin can add them under Settings.'),
  );

  const msg = h('p', { class: 'form-msg', role: 'alert' });
  const btn = h('button', { type: 'submit', class: 'btn btn-primary' }, 'Save notifications');

  const form = h(
    'form',
    {
      class: compact ? 'notify-form' : 'card narrow-left notify-form',
      onsubmit: async (e) => {
        e.preventDefault();
        msg.className = 'form-msg';
        msg.textContent = '';
        const mode = form.querySelector(`input[name="${id}-mode"]:checked`)?.value || 'none';
        const locations = locBoxes.filter((b) => b.cb.checked).map((b) => b.cb.value);
        if (mode === 'locations' && !locations.length) {
          msg.textContent = 'Pick at least one location, or choose a different option.';
          return;
        }
        btn.disabled = true;
        try {
          await saveNotifications(user.uid, { newUnits: mode, locations: mode === 'locations' ? locations : [], assigned: assigned.checked, messages: messagesCb.checked, photosReady: readyCb.checked });
          msg.className = 'form-msg ok';
          msg.textContent = 'Saved.';
          toast('Notification settings saved');
          onSaved?.();
        } catch (err) {
          msg.textContent = err.message;
        } finally {
          btn.disabled = false;
        }
      },
    },
    compact ? null : h('h2', { class: 'section-title' }, 'Email notifications'),
    h('p', { class: 'muted small' }, `Emails go to ${user.email}.`),
    h(
      'div',
      { class: 'notify-group' },
      h('span', { class: 'label-like' }, 'Requests & messages'),
      h('label', { class: 'check-inline' }, assigned, h('span', {}, self ? 'Email me when a photo request is assigned to me' : 'Email them when a photo request is assigned to them')),
      h('label', { class: 'check-inline' }, readyCb, h('span', {}, `${self ? 'Email me' : 'Email them'} when photos are uploaded for a request ${self ? 'I' : 'they'} made${user.role === 'admin' ? ' (and, as an admin, for units from the daily report)' : ''}`)),
      h('label', { class: 'check-inline' }, messagesCb, h('span', {}, self ? 'Email me when someone messages me about a unit, or replies' : 'Email them when someone messages them about a unit, or replies')),
    ),
    h(
      'div',
      { class: 'notify-group' },
      h('span', { class: 'label-like' }, 'New units submitted'),
      radio('all', 'Notify on all', 'Every unit submitted at any location'),
      radio('locations', 'Notify by location', 'Only units at the locations you pick'),
      locWrap,
      radio('none', 'Off'),
    ),
    msg,
    h('div', { class: 'form-actions-row' }, btn),
  );

  function sync() {
    const mode = form.querySelector(`input[name="${id}-mode"]:checked`)?.value;
    locWrap.hidden = mode !== 'locations';
  }
  sync();
  return form;
}

/** Admin: edit someone else's settings in a dialog. */
export function notificationsDialog(user) {
  const dlg = h('dialog', { class: 'dialog dialog-wide' });
  const close = () => dlg.close();
  mount(dlg, 
    h('div', { class: 'dialog-head' }, h('h3', {}, `Email notifications · ${user.displayName || user.email}`), h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Close', onclick: close }, icon('x'))),
    notificationsForm(user, { compact: true, onSaved: close }),
  );
  dlg.addEventListener('close', () => dlg.remove());
  document.body.append(dlg);
  dlg.showModal();
  return dlg;
}

