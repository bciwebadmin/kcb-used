// Requests → Import: turn an equipment list (e-Emphasys "Equipment List" PDF, pasted report text, or CSV)
// into many photo requests at once, with a preview to fix makes, map warehouses and skip duplicates.
import { h, clear, icon, toast, mount } from '../ui.js';
import { store } from '../store.js';
import { PHOTO_SLOTS } from '../config.js';
import { createRequestsBatch, findCandidate, normalizeKey } from '../data.js';
import { parseReportText, parseCsv, linesFromPdfItems, matchWarehouse } from '../import-parse.js';
import { navigate, setLeaveGuard } from '../main.js';

const AS_IS = '__as_is__';

async function pdfToText(file) {
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), verbosity: 0 }).promise;
  const lines = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    lines.push(...linesFromPdfItems((await page.getTextContent()).items));
  }
  return lines.join('\n');
}

function parseAny(text, filename = '') {
  if (/\.csv$/i.test(filename)) return parseCsv(text);
  const report = parseReportText(text);
  if (report.length) return report;
  const first = text.split(/\r?\n/).find((l) => l.trim()) || '';
  return /[,\t]/.test(first) ? parseCsv(text) : [];
}

function staff() {
  return (store.get().users || []).filter((u) => u.active && u.role !== 'viewer').sort((a, b) => (a.displayName || a.email).localeCompare(b.displayName || b.email));
}

export function renderImportRequests(page) {
  const me = store.get().user.uid;
  let rows = []; // parsed + preview state
  let sourceName = '';
  setLeaveGuard(() => rows.some((r) => r.include));

  // ---------- step 1: choose / paste ----------
  const fileInput = h('input', { type: 'file', accept: '.pdf,.txt,.csv,application/pdf,text/csv,text/plain', hidden: true, onchange: (e) => e.target.files[0] && readFile(e.target.files[0]) });
  const drop = h(
    'button',
    { type: 'button', class: 'import-drop', onclick: () => fileInput.click() },
    icon('download'),
    h('strong', {}, 'Choose a file'),
    h('span', { class: 'muted small' }, 'e-Emphasys Equipment List PDF, or a CSV with columns like Whse, EIN, Year, Model, Serial, Hours'),
  );
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('drag'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('drag'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('drag');
    const f = e.dataTransfer.files[0];
    if (f) readFile(f);
  });
  const paste = h('textarea', { rows: 4, placeholder: 'Or paste the report text / spreadsheet rows here…', 'aria-label': 'Paste equipment list' });
  const pasteBtn = h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => load(parseAny(paste.value), 'pasted text') }, 'Read pasted text');
  const stepMsg = h('p', { class: 'form-msg', role: 'alert' });

  async function readFile(file) {
    stepMsg.className = 'form-msg';
    stepMsg.textContent = `Reading ${file.name}…`;
    try {
      const text = /\.pdf$/i.test(file.name) || file.type === 'application/pdf' ? await pdfToText(file) : await file.text();
      load(parseAny(text, file.name), file.name);
    } catch (err) {
      stepMsg.textContent = `Couldn’t read ${file.name}: ${err.message}`;
    } finally {
      fileInput.value = '';
    }
  }

  // ---------- step 2: preview ----------
  const preview = h('div', { hidden: true });
  const assignSel = h('select', { id: 'im-assign' });
  const dueInput = h('input', { type: 'date', id: 'im-due' });
  const notesInput = h('textarea', { id: 'im-notes', rows: 2, maxlength: 1500, placeholder: 'Added to every request, e.g. “For the November sale flyer”' });
  const angleBoxes = PHOTO_SLOTS.map((s) => {
    const cb = h('input', { type: 'checkbox', value: s.key });
    return { cb, el: h('label', { class: 'chip-check' }, cb, h('span', {}, s.label)) };
  });
  const whMap = {}; // code -> warehouse name or AS_IS
  const whBox = h('div', { class: 'wh-map' });
  const tbody = h('tbody');
  const summary = h('span', { class: 'muted' });
  const createBtn = h('button', { type: 'button', class: 'btn btn-primary btn-lg', onclick: create }, 'Create requests');
  const createMsg = h('p', { class: 'form-msg', role: 'alert' });

  function fillAssign() {
    const cur = assignSel.value;
    mount(clear(assignSel), h('option', { value: '' }, 'Unassigned'), ...staff().map((u) => h('option', { value: u.uid }, `${u.displayName || u.email}${u.uid === me ? ' (me)' : ''}`)));
    assignSel.value = cur;
  }

  function load(parsed, name) {
    stepMsg.className = 'form-msg';
    if (!parsed.length) {
      stepMsg.textContent = 'No equipment rows found. For a PDF, use the e-Emphasys “Equipment List” report; for a spreadsheet, include a header row (Whse, EIN, Year, Model, Serial…).';
      return;
    }
    sourceName = name;
    const { requests = [], equipment = [], settings } = store.get();
    const open = requests.filter((r) => r.status !== 'done');
    const seen = new Set();
    rows = parsed.map((p) => {
      const key = normalizeKey(p.serial) || `EIN:${normalizeKey(p.ein)}`;
      const dupFile = seen.has(key);
      seen.add(key);
      const dupReq = open.find((r) => (p.serial && r.serialKey === normalizeKey(p.serial)) || (p.ein && normalizeKey(r.ein) === normalizeKey(p.ein)));
      const cand = findCandidate({ serial: p.serial, ein: p.ein }, equipment);
      // Link to an existing unit only on a confident match: same serial, and the EIN agrees (or the unit has none).
      const sure = cand && cand.by === 'serial' && (!cand.eq.ein || !p.ein || normalizeKey(cand.eq.ein) === normalizeKey(p.ein));
      return { ...p, include: !dupReq && !dupFile, dupReq, dupFile, cand, link: Boolean(sure) };
    });
    // Warehouse code mapping, auto-matched to the app's warehouse names.
    const names = settings.warehouses || [];
    for (const code of [...new Set(rows.map((r) => r.warehouseCode).filter(Boolean))]) {
      if (!(code in whMap)) whMap[code] = matchWarehouse(code, names) || AS_IS;
    }
    stepMsg.className = 'form-msg ok';
    stepMsg.textContent = `Found ${rows.length} unit${rows.length === 1 ? '' : 's'} in ${name}.`;
    preview.hidden = false;
    drawMap();
    drawRows();
    preview.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function whName(code) {
    const v = whMap[code];
    return !v || v === AS_IS ? code || '' : v;
  }

  function drawMap() {
    const codes = Object.keys(whMap).filter((c) => rows.some((r) => r.warehouseCode === c));
    const names = store.get().settings.warehouses || [];
    if (!codes.length) {
      mount(clear(whBox), h('p', { class: 'muted small' }, 'No warehouse codes in this file.'));
      return;
    }
    mount(
      clear(whBox),
      ...codes.map((code) =>
        h(
          'label',
          { class: 'wh-row' },
          h('span', { class: 'wh-code mono' }, code),
          h('span', { class: 'muted' }, '→'),
          h(
            'select',
            {
              onchange: (e) => {
                whMap[code] = e.target.value;
                drawRows();
              },
            },
            names.map((n) => h('option', { value: n, selected: whMap[code] === n }, n)),
            h('option', { value: AS_IS, selected: whMap[code] === AS_IS }, `Use “${code}” as-is`),
          ),
          h('span', { class: 'muted small' }, `${rows.filter((r) => r.warehouseCode === code).length} units`),
        ),
      ),
    );
  }

  function drawRows() {
    mount(
      clear(tbody),
      ...rows.map((r, i) => {
        const inc = h('input', { type: 'checkbox', checked: r.include, 'aria-label': `Include ${r.model} ${r.serial}`, onchange: (e) => { r.include = e.target.checked; drawSummary(); } });
        const make = h('input', { class: 'make-input', value: r.make, maxlength: 80, 'aria-label': 'Make', oninput: (e) => (r.make = e.target.value.trim()) });
        const flags = [];
        if (r.dupReq) flags.push(h('span', { class: 'flag warn' }, 'Already requested'));
        if (r.dupFile) flags.push(h('span', { class: 'flag warn' }, 'Duplicate in file'));
        if (r.cand) {
          const linkCb = h('input', { type: 'checkbox', checked: r.link, onchange: (e) => (r.link = e.target.checked) });
          flags.push(
            h(
              'label',
              { class: 'flag info', title: `${r.cand.eq.make} ${r.cand.eq.model} · Serial ${r.cand.eq.serial}${r.cand.eq.ein ? ` · EIN ${r.cand.eq.ein}` : ''}` },
              linkCb,
              ` In inventory (same ${r.cand.by}) — add photos to it`,
            ),
          );
        }
        return h(
          'tr',
          { class: r.include ? '' : 'excluded' },
          h('td', { class: 'c-inc' }, inc),
          h('td', { 'data-label': 'Whse' }, whName(r.warehouseCode)),
          h('td', { 'data-label': 'EIN', class: 'mono' }, r.ein || '—'),
          h('td', { 'data-label': 'Unit', class: 'c-unit' }, h('span', { class: 'muted' }, r.year || ''), make, h('strong', {}, r.model)),
          h('td', { 'data-label': 'Serial', class: 'mono' }, r.serial || '—'),
          h('td', { 'data-label': 'Hours' }, r.hours != null ? r.hours.toLocaleString() : '—'),
          h('td', { 'data-label': 'ERP status' }, r.status || '—'),
          h('td', { class: 'c-flags' }, flags),
        );
      }),
    );
    drawSummary();
  }

  function drawSummary() {
    const n = rows.filter((r) => r.include).length;
    summary.textContent = `${n} of ${rows.length} selected`;
    createBtn.textContent = n ? `Create ${n} request${n === 1 ? '' : 's'}` : 'Create requests';
    createBtn.disabled = n === 0;
    tbody.querySelectorAll('tr').forEach((tr, i) => tr.classList.toggle('excluded', !rows[i].include));
  }

  const setAll = (on) => {
    rows.forEach((r) => (r.include = on));
    drawRows();
  };

  async function create() {
    createMsg.className = 'form-msg';
    createMsg.textContent = '';
    const chosen = rows.filter((r) => r.include);
    if (!chosen.length) return;
    const assignee = staff().find((u) => u.uid === assignSel.value) || null;
    const angles = angleBoxes.every((a) => a.cb.checked) ? [] : angleBoxes.filter((a) => a.cb.checked).map((a) => a.cb.value);
    const shared = notesInput.value.trim();
    const list = chosen.map((r) => ({
      make: (r.make || '').slice(0, 80),
      model: (r.model || '').slice(0, 80),
      serial: (r.serial || '').slice(0, 60),
      ein: (r.ein || '').slice(0, 40),
      warehouse: whName(r.warehouseCode).slice(0, 80),
      warehouseCode: r.warehouseCode || '',
      year: Number.isInteger(r.year) ? r.year : null,
      hours: typeof r.hours === 'number' ? r.hours : null,
      angles,
      dueDate: dueInput.value || null,
      notes: [shared, r.status && `ERP status: ${r.status}`, r.notes].filter(Boolean).join('\n').slice(0, 2000),
      equipmentId: r.cand && r.link ? r.cand.eq.id : null,
      source: sourceName.slice(0, 120),
    }));
    createBtn.disabled = true;
    createBtn.textContent = 'Creating…';
    try {
      await createRequestsBatch(list, { assignee });
      rows = [];
      setLeaveGuard(null);
      toast(`${list.length} photo request${list.length === 1 ? '' : 's'} created${assignee && assignee.uid !== me ? ` — ${assignee.displayName || assignee.email} will get one summary email` : ''}`);
      navigate('/requests');
    } catch (err) {
      createMsg.textContent = `Couldn’t create the requests: ${err.message}`;
      drawSummary();
    }
  }

  mount(
    preview,
    h(
      'section',
      { class: 'card' },
      h('h2', { class: 'section-title' }, 'Apply to every request'),
      h(
        'div',
        { class: 'form-grid' },
        h('div', { class: 'field' }, h('label', { for: 'im-assign' }, 'Assign to'), assignSel),
        h('div', { class: 'field' }, h('label', { for: 'im-due' }, 'Needed by'), dueInput),
        h('div', { class: 'field wide' }, h('label', { for: 'im-notes' }, 'Notes'), notesInput),
      ),
      h(
        'div',
        { class: 'field wide angles-field', style: 'margin-top:14px' },
        h('div', { class: 'angles-head' }, h('span', { class: 'label-like' }, 'Angles needed'), h('span', { class: 'muted small' }, 'Leave all unchecked for “all angles”.')),
        h('div', { class: 'chip-checks' }, angleBoxes.map((a) => a.el)),
      ),
    ),
    h('section', { class: 'card' }, h('h2', { class: 'section-title' }, 'Warehouses'), h('p', { class: 'muted small' }, 'Match the codes in the file to your warehouse names.'), whBox),
    h(
      'section',
      { class: 'card table-card' },
      h(
        'div',
        { class: 'section-head pad' },
        h('div', {}, h('h2', { class: 'section-title' }, 'Units'), summary),
        h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'link-btn', onclick: () => setAll(true) }, 'Select all'), h('button', { type: 'button', class: 'link-btn', onclick: () => setAll(false) }, 'Select none')),
      ),
      h('p', { class: 'muted small pad-x' }, 'Units that already have an open request start unticked. Fix a make by typing in its box. Cost and price columns from the report are not imported.'),
      h(
        'div',
        { class: 'table-scroll' },
        h('table', { class: 'import-table' }, h('thead', {}, h('tr', {}, ['', 'Whse', 'EIN', 'Unit', 'Serial #', 'Hours', 'ERP status', ''].map((t) => h('th', {}, t)))), tbody),
      ),
    ),
    h('div', { class: 'form-actions' }, createMsg, h('div', { class: 'form-actions-row' }, h('a', { href: '#/requests', class: 'btn btn-ghost' }, 'Cancel'), createBtn)),
  );

  mount(
    page,
    h('div', { class: 'page-head' }, h('div', {}, h('a', { href: '#/requests', class: 'back-link' }, icon('back'), 'Back to requests'), h('h1', {}, 'Import photo requests'), h('p', { class: 'muted' }, 'Create a request for every unit in an equipment list. You’ll see a preview before anything is created.'))),
    h('section', { class: 'card' }, h('h2', { class: 'section-title' }, '1. Equipment list'), fileInput, drop, h('div', { class: 'paste-row' }, paste, pasteBtn), stepMsg),
    preview,
  );
  fillAssign();
  const unsub = store.subscribe(fillAssign);
  return () => {
    unsub();
    setLeaveGuard(null);
  };
}
