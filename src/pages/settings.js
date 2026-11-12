// Admin → Settings. Three tabs so nothing needs long scrolling:
//   Locations     — one table: each warehouse with its report code(s), photo contact and new-unit email people
//   Daily report  — report link + run/test/upload on the left, recent imports on the right
//   Email         — test email on the left, recent email activity on the right
import { h, clear, icon, toast, mount, confirmDialog } from '../ui.js';
import { store } from '../store.js';
import { saveSettings, callSendTestEmail, subscribeMailLog, saveNotifications, subscribeReportSettings, saveReportSettings, saveReportCodes } from '../data.js';
import { notifyPrefs } from './notifications.js';
import { renderReportTab } from './report-import.js';

const TABS = [
  { key: 'locations', label: 'Locations' },
  { key: 'report', label: 'Daily report' },
  { key: 'email', label: 'Email' },
];

export function renderSettings(page, match) {
  const tab = TABS.some((t) => t.key === match?.[1]) ? match[1] : 'locations';
  const body = h('div', { class: 'settings-body' });
  mount(
    page,
    h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Settings'))),
    h(
      'nav',
      { class: 'settings-tabs', 'aria-label': 'Settings sections' },
      TABS.map((t) => h('a', { href: t.key === 'locations' ? '#/admin/settings' : `#/admin/settings/${t.key}`, class: t.key === tab ? 'active' : '', 'aria-current': t.key === tab ? 'page' : null }, t.label)),
    ),
    body,
  );
  if (tab === 'report') return renderReportTab(body);
  if (tab === 'email') return renderEmailTab(body);
  return renderLocationsTab(body);
}

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------
const pname = (u) => u.displayName || u.email;
// "Springfield – 20" → "20" (the code the report uses; matched automatically).
const autoCode = (w) => w.match(/[-–—]\s*([A-Z0-9]{1,6})\s*$/i)?.[1]?.toUpperCase() || '';

function renderLocationsTab(body) {
  let cfg = {};
  const table = h('div', { class: 'loc-table', role: 'table', 'aria-label': 'Locations' });
  const newName = h('input', { id: 'wh-new', placeholder: 'New location, e.g. Lenexa – 22', maxlength: 80, autocomplete: 'off' });

  const staff = () => (store.get().users || []).filter((u) => u.active && u.role !== 'viewer').sort((a, b) => pname(a).localeCompare(pname(b)));
  const active = () => (store.get().users || []).filter((u) => u.active);
  const warehouses = () => [...(store.get().settings.warehouses || [])];

  async function saveWarehouses(list, msg) {
    try {
      await saveSettings({ warehouses: list });
      toast(msg);
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function addLocation(e) {
    e.preventDefault();
    const v = newName.value.trim();
    if (!v) return;
    const list = warehouses();
    if (list.some((w) => w.toLowerCase() === v.toLowerCase())) {
      toast('That location is already in the list', 'error');
      return;
    }
    newName.value = '';
    await saveWarehouses([...list, v].sort((a, b) => a.localeCompare(b)), `${v} added`);
  }

  async function removeLocation(w) {
    const ok = await confirmDialog({ title: `Remove ${w}?`, message: 'It disappears from the warehouse dropdowns. Units already at this location keep it.', confirmLabel: 'Remove', danger: true });
    if (ok) await saveWarehouses(warehouses().filter((x) => x !== w), `${w} removed`);
  }

  async function setNotify(u, warehouse, on) {
    const p = notifyPrefs(u);
    let locations = p.locations.filter((w) => w !== warehouse);
    if (on) locations = [...locations, warehouse];
    try {
      await saveNotifications(u.uid, { newUnits: locations.length ? 'locations' : 'none', locations, assigned: p.assigned, messages: p.messages, photosReady: p.photosReady });
      toast(on ? `${pname(u)} will be emailed about new units at ${warehouse}` : `${pname(u)} removed from ${warehouse}`);
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function setContact(w, uid) {
    try {
      await saveReportSettings({ contacts: { ...(cfg.contacts || {}), [w]: uid || null } });
      const u = staff().find((x) => x.uid === uid);
      toast(u ? `${pname(u)} gets photo requests for ${w}` : `${w} uses the automatic choice`);
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function setCode(code, w) {
    const codes = { ...(cfg.codes || {}) };
    if (w) codes[code] = w;
    else delete codes[code];
    try {
      await saveReportCodes(codes);
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function codeCell(w) {
    const auto = autoCode(w);
    const extra = Object.entries(cfg.codes || {}).filter(([, v]) => v === w).map(([k]) => k);
    const input = h('input', { class: 'mono code-input', placeholder: 'code', maxlength: 10, 'aria-label': `Add a report code for ${w}`, hidden: true });
    const addBtn = h('button', { type: 'button', class: 'link-btn small', onclick: () => { addBtn.hidden = true; input.hidden = false; input.focus(); } }, '+ code');
    const commit = () => {
      const c = input.value.trim().toUpperCase();
      input.value = '';
      input.hidden = true;
      addBtn.hidden = false;
      if (c && c !== auto) setCode(c, w);
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      if (e.key === 'Escape') { input.value = ''; commit(); }
    });
    input.addEventListener('blur', commit);
    return h(
      'div',
      { class: 'loc-cell loc-codes', 'data-label': 'Report code' },
      auto ? h('span', { class: 'code-chip', title: 'Matched automatically from the name' }, auto) : null,
      extra.map((c) => h('span', { class: 'code-chip extra' }, c, h('button', { type: 'button', class: 'icon-btn sm', 'aria-label': `Remove code ${c}`, onclick: () => setCode(c, null) }, icon('x')))),
      !auto && !extra.length ? h('span', { class: 'warn small' }, 'none') : null,
      addBtn,
      input,
    );
  }

  function contactCell(w) {
    const people = staff();
    const cur = cfg.contacts?.[w] || '';
    const fallback =
      people.find((u) => u.notifyNewUnits === 'locations' && (u.notifyLocations || []).includes(w) && u.role === 'employee') ||
      people.find((u) => u.notifyNewUnits === 'locations' && (u.notifyLocations || []).includes(w));
    return h(
      'div',
      { class: 'loc-cell', 'data-label': 'Photo contact' },
      h(
        'select',
        { class: `compact${cur || fallback ? '' : ' unset'}`, 'aria-label': `Photo contact for ${w}`, onchange: (e) => setContact(w, e.target.value) },
        h('option', { value: '' }, fallback ? `Auto · ${pname(fallback)}` : 'Unassigned'),
        people.map((u) => h('option', { value: u.uid, selected: u.uid === cur }, pname(u))),
      ),
    );
  }

  function notifyCell(w, everywhere) {
    const here = active().filter((u) => { const p = notifyPrefs(u); return p.newUnits === 'locations' && p.locations.includes(w); });
    const candidates = active().filter((u) => notifyPrefs(u).newUnits !== 'all' && !here.includes(u)).sort((a, b) => pname(a).localeCompare(pname(b)));
    return h(
      'div',
      { class: 'loc-cell loc-people', 'data-label': 'New-unit emails' },
      here.map((u) => h('span', { class: 'person-chip' }, pname(u), h('button', { type: 'button', class: 'icon-btn sm', 'aria-label': `Remove ${pname(u)} from ${w}`, onclick: () => setNotify(u, w, false) }, icon('x')))),
      !here.length && !everywhere.length ? h('span', { class: 'warn small' }, 'Nobody') : null,
      candidates.length
        ? h(
            'select',
            {
              class: 'compact add-person',
              'aria-label': `Add someone to ${w}`,
              onchange: (e) => {
                const u = candidates.find((x) => x.uid === e.target.value);
                e.target.value = '';
                if (u) setNotify(u, w, true);
              },
            },
            h('option', { value: '' }, '+ Add'),
            candidates.map((u) => h('option', { value: u.uid }, pname(u))),
          )
        : null,
    );
  }

  function draw() {
    const whs = warehouses().sort((a, b) => a.localeCompare(b));
    const everywhere = active().filter((u) => notifyPrefs(u).newUnits === 'all');
    mount(
      clear(table),
      h('div', { class: 'loc-row loc-head', role: 'row' }, ['Location', 'Report code', 'Photo contact', 'New-unit emails', ''].map((t) => h('div', { role: 'columnheader' }, t))),
      h(
        'div',
        { class: 'loc-row loc-all', role: 'row' },
        h('div', { class: 'loc-name' }, 'All locations'),
        h(
          'div',
          { class: 'loc-cell loc-all-people' },
          everywhere.length ? everywhere.map((u) => h('span', { class: 'person-chip dark' }, pname(u))) : h('span', { class: 'muted small' }, 'Nobody'),
          h('span', { class: 'muted small' }, 'Emailed about every new unit — change per person under Users → Email alerts.'),
        ),
      ),
      ...whs.map((w) =>
        h(
          'div',
          { class: 'loc-row', role: 'row' },
          h('div', { class: 'loc-name' }, w),
          codeCell(w),
          contactCell(w),
          notifyCell(w, everywhere),
          h('div', { class: 'loc-cell loc-remove' }, h('button', { type: 'button', class: 'icon-btn', title: `Remove ${w}`, 'aria-label': `Remove ${w}`, onclick: () => removeLocation(w) }, icon('trash'))),
        ),
      ),
      !whs.length ? h('p', { class: 'muted small pad' }, 'No locations yet — add one below.') : null,
    );
  }

  mount(
    body,
    h(
      'section',
      { class: 'card' },
      h(
        'div',
        { class: 'section-head' },
        h('h2', { class: 'section-title' }, 'Locations'),
        h('form', { class: 'inline-add', onsubmit: addLocation }, h('label', { for: 'wh-new', class: 'sr-only' }, 'New location'), newName, h('button', { type: 'submit', class: 'btn btn-ghost' }, icon('plus'), h('span', {}, 'Add'))),
      ),
      h(
        'p',
        { class: 'muted small' },
        h('strong', {}, 'Report code'),
        ' — the warehouse number on the daily report (taken from the name; add others if needed). ',
        h('strong', {}, 'Photo contact'),
        ' — gets the photo requests for units the report adds there. ',
        h('strong', {}, 'New-unit emails'),
        ' — emailed when someone submits a unit there.',
      ),
      table,
    ),
  );

  draw();
  const unsubCfg = subscribeReportSettings(
    (d) => {
      cfg = d || {};
      draw();
    },
    () => draw(),
  );
  let sig = '';
  const unsubStore = store.subscribe((st) => {
    const next = JSON.stringify([st.settings.warehouses, (st.users || []).map((u) => [u.uid, u.active, u.role, u.displayName, u.notifyNewUnits, u.notifyLocations, u.notify])]);
    if (next === sig) return;
    sig = next;
    draw();
  });
  return () => {
    unsubCfg();
    unsubStore();
  };
}

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------
function renderEmailTab(body) {
  const testMsg = h('div', { class: 'test-result', hidden: true });
  const testBtn = h(
    'button',
    {
      type: 'button',
      class: 'btn btn-primary',
      onclick: async () => {
        testBtn.disabled = true;
        testBtn.textContent = 'Sending…';
        testMsg.hidden = false;
        testMsg.className = 'test-result';
        testMsg.textContent = '';
        try {
          const { data } = await callSendTestEmail();
          testMsg.className = `test-result ${data.ok ? 'ok' : 'bad'}`;
          testMsg.textContent = data.ok
            ? `Sent to ${data.to} from ${data.from}. It should also appear in Resend → Emails.`
            : `Resend refused it: ${data.error}. Sender: ${data.from}. ${hintFor(data.error)}`;
        } catch (err) {
          testMsg.className = 'test-result bad';
          testMsg.textContent =
            err.code === 'functions/not-found' || /not.?found|internal/i.test(err.message)
              ? `The email functions don’t seem to be deployed (${err.message}). Run “firebase deploy --only functions” and check its output for errors.`
              : `Couldn’t reach the email function: ${err.message}`;
        } finally {
          testBtn.disabled = false;
          testBtn.textContent = 'Send test email to me';
        }
      },
    },
    'Send test email to me',
  );
  const logList = h('ul', { class: 'mail-log' }, h('li', { class: 'muted small' }, 'Loading…'));
  const labels = { 'off-report': 'Off-report units', 'photos-ready': 'Photos ready', 'report-import': 'Report import', 'new-submission': 'New unit', 'request-assigned': 'Request assigned', message: 'Unit message', welcome: 'Welcome', password: 'Password reset', 'request-import': 'Imported requests', test: 'Test' };
  const unsubLog = subscribeMailLog(
    (rows) => {
      clear(logList);
      if (!rows.length) {
        mount(logList, h('li', { class: 'muted small' }, 'No email activity recorded yet. If you’ve submitted units or assigned requests and nothing shows here, the email functions aren’t running — redeploy them.'));
        return;
      }
      mount(
        logList,
        ...rows.map((r) =>
          h(
            'li',
            { class: r.ok ? 'ok' : r.skipped ? 'skip' : 'bad' },
            h('span', { class: 'mail-status' }, r.ok ? 'Sent' : r.skipped ? 'Skipped' : 'Failed'),
            h('span', { class: 'mail-body' }, h('strong', {}, labels[r.type] || r.type || 'Email'), r.to?.length ? ` → ${r.to.join(', ')}` : '', r.error ? h('span', { class: 'block small' }, r.error) : null),
            h('span', { class: 'muted small' }, r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : ''),
          ),
        ),
      );
    },
    (err) => mount(clear(logList), h('li', { class: 'muted small' }, `Couldn’t load email activity: ${err.message}`)),
  );

  mount(
    body,
    h(
      'div',
      { class: 'settings-grid' },
      h(
        'section',
        { class: 'card' },
        h('h2', { class: 'section-title' }, 'Check email'),
        h('p', { class: 'muted small' }, 'Emails are sent through Resend. The test checks the API key and sender domain.'),
        h('div', { class: "btn-row", style: "margin-top:12px" }, testBtn),
        testMsg,
      ),
      h('section', { class: 'card scroll-card' }, h('h2', { class: 'section-title' }, 'Recent email activity'), h('p', { class: 'muted small' }, 'What was sent, skipped (and why), or failed.'), h('div', { class: 'scroll-body' }, logList)),
    ),
  );
  return unsubLog;
}

function hintFor(error = '') {
  if (/not authorized for this domain|domain is not verified|verify/i.test(error)) {
    return 'In Resend, the sender’s domain must be verified (Domains) and the API key must be allowed to send from it (API Keys → domain: All domains or that domain). Or change MAIL_FROM in functions/.env to an address on a domain the key can use, then redeploy functions.';
  }
  if (/401|invalid_api|api key is invalid|unauthor/i.test(error)) {
    return 'The RESEND_API_KEY secret looks wrong — set it again with “firebase functions:secrets:set RESEND_API_KEY”, then redeploy functions.';
  }
  return '';
}
