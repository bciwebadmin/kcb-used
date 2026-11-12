// Turns an equipment list (e-Emphasys "Equipment List" report as PDF/text, or a CSV) into photo-request rows.
// Pure functions — no Firebase — shared by the browser (manual import) and the daily-import Cloud Function.

const KNOWN_MAKES = [
  ['JOHN DEERE', 'John Deere'],
  ['BOBCAT', 'Bobcat'],
  ['KUBOTA', 'Kubota'],
  ['CATERPILLAR', 'Caterpillar'],
  ['CAT ', 'Caterpillar'],
  ['CASE', 'Case'],
  ['TAKEUCHI', 'Takeuchi'],
  ['DOOSAN', 'Doosan'],
  ['KOMATSU', 'Komatsu'],
  ['NEW HOLLAND', 'New Holland'],
  ['GEHL', 'Gehl'],
  ['JCB', 'JCB'],
  ['ALLEN', 'Allen'],
];

// ERP status column is cut off at 10 characters ("A Availabl", "K Post To") — show the full words where we know them.
const STATUS_WORDS = { A: 'Available', D: 'Down', M: 'Missing', I: 'In Transit', HT: 'Hold Transfer', K: 'Post to Web' };
function cleanStatus(raw) {
  const s = String(raw || '').replace(/^\*+/, '').trim();
  const m = s.match(/^([A-Z]{1,2})(?:\s+(.*))?$/);
  if (m && STATUS_WORDS[m[1]]) return STATUS_WORDS[m[1]];
  return s;
}
/** "K Post To" → "K", "*K Post To" → "*K" (the star is kept: it's a separate ERP flag). */
function statusCode(raw) {
  const t = String(raw || '').trim();
  const m = t.match(/^(\*?[A-Z]{1,2})(?:[\s–-]|$)/);
  if (m) return m[1];
  if (/^\*?\s*post to (web)?$/i.test(t)) return t.startsWith('*') ? '*K' : 'K'; // spelled out in a spreadsheet
  return '';
}
/** Rows the daily import adds to Pending: ERP status "K – Post to Web" or "*K – Post to Web". */
export function isPostToWeb(row) {
  return /^\*?K$/.test(row.statusCode || '');
}

/** One report row → request fields. */
function fromReport(m) {
  const [, whse, ein, year, product, descRaw, serial, , acquired, rest] = m;
  const desc = descRaw.replace(/\s+/g, ' ').trim();
  const part = product.replace(/-[A-Z]$/, ''); // "T770-U" → "T770"
  const isAttachment = /^\d{6,}$/.test(part); // e.g. 7326129 = bucket part number (models like 773 stay models)
  const upper = desc.toUpperCase();
  // Bobcat dealer: anything without a recognisable make defaults to Bobcat (editable in the preview).
  const make = (KNOWN_MAKES.find(([k]) => upper.startsWith(k)) || [null, 'Bobcat'])[1];
  // rest = "[hours] cost [adv price] status…"
  const nums = rest.match(/^((?:[\d,]+\.\d\d\s+)*)(.*)$/);
  const numbers = (nums[1].trim().match(/[\d,]+\.\d\d/g) || []).map((n) => Number(n.replace(/,/g, '')));
  const status = cleanStatus(nums[2]);
  const code = statusCode(nums[2]);
  // With 2+ numbers the first is hours (the next is cost). 9999 means "unknown" in the ERP.
  const hours = numbers.length >= 2 && numbers[0] > 0 && numbers[0] < 9999 ? numbers[0] : null;
  return {
    warehouseCode: whse,
    ein,
    year: year ? Number(year) : null,
    make,
    model: isAttachment ? `${desc} (${part})` : part,
    description: desc,
    serial,
    hours,
    status,
    statusCode: code,
    acquired,
  };
}

const ROW = /^(\S{1,4})\s+(\d{5,9})\s+(?:(\d{4})\s+)?(\S+)\s+(.+?)\s+(\S+)\s+(\d{5})\s+(\d{2}\/\d{2}\/\d{2,4})\s*(.*)$/;

/** Parses report text (one row per line, any amount of spacing). */
export function parseReportText(text) {
  const rows = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, ' ').trim();
    const m = line.match(ROW);
    if (m) rows.push(fromReport(m));
  }
  return rows;
}

/** Rebuilds text lines from pdf.js text items (words with x/y positions). */
export function linesFromPdfItems(items) {
  const byY = new Map();
  for (const it of items) {
    if (!it.str || !it.str.trim()) continue;
    const y = Math.round(it.transform[5]);
    const key = [...byY.keys()].find((k) => Math.abs(k - y) <= 2) ?? y;
    if (!byY.has(key)) byY.set(key, []);
    byY.get(key).push({ x: it.transform[4], s: it.str });
  }
  return [...byY.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, words]) => words.sort((a, b) => a.x - b.x).map((w) => w.s).join(' '));
}

// ---------- CSV ----------

function splitCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',' || c === '\t') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

const HEADERS = {
  warehouseCode: ['whse', 'warehouse', 'branch', 'location'],
  ein: ['ein', 'equipment id', 'equip id', 'stock', 'stock #', 'stock number'],
  year: ['year', 'yr'],
  make: ['make', 'manufacturer', 'mfr'],
  model: ['model', 'product number', 'product', 'prod number'],
  description: ['prod desc', 'description', 'desc'],
  serial: ['serial', 'serial number', 'serial numbers', 'serial #', 'sn'],
  hours: ['hours', 'hrs', 'meter'],
  status: ['status'],
  notes: ['notes', 'comments'],
};

/** CSV with a header row (column names matched loosely; order doesn't matter). */
export function parseCsv(text) {
  const [head, ...body] = splitCsv(text);
  if (!head) return [];
  const idx = {};
  head.forEach((h, i) => {
    const k = h.trim().toLowerCase().replace(/[_.]+/g, ' ');
    for (const [field, names] of Object.entries(HEADERS)) if (idx[field] === undefined && names.includes(k)) idx[field] = i;
  });
  const get = (r, f) => (idx[f] === undefined ? '' : String(r[idx[f]] ?? '').trim());
  return body
    .map((r) => {
      const modelRaw = get(r, 'model').replace(/-[A-Z]$/, '');
      const desc = get(r, 'description');
      const year = Number(get(r, 'year')) || null;
      const hours = Number(get(r, 'hours').replace(/,/g, ''));
      return {
        warehouseCode: get(r, 'warehouseCode'),
        ein: get(r, 'ein'),
        year,
        make: get(r, 'make') || (KNOWN_MAKES.find(([k]) => desc.toUpperCase().startsWith(k)) || [null, 'Bobcat'])[1],
        model: /^\d{6,}$/.test(modelRaw) && desc ? `${desc} (${modelRaw})` : modelRaw || desc,
        description: desc,
        serial: get(r, 'serial'),
        hours: Number.isFinite(hours) && hours > 0 && hours < 9999 ? hours : null,
        status: cleanStatus(get(r, 'status')),
        statusCode: statusCode(get(r, 'status')),
        notes: get(r, 'notes'),
      };
    })
    .filter((x) => x.serial || x.ein || x.model);
}

/** Picks the app warehouse whose name contains the report's code as its own token ("Blue Springs - 18" ↔ "18"). */
export function matchWarehouse(code, warehouses) {
  if (!code) return '';
  const c = code.trim().toUpperCase();
  const exact = warehouses.find((w) => w.trim().toUpperCase() === c);
  if (exact) return exact;
  const token = c.replace(/[^A-Z0-9]/g, '');
  if (!token) return '';
  const re = new RegExp(`(^|[^A-Z0-9])${token}([^A-Z0-9]|$)`, 'i');
  return warehouses.find((w) => re.test(w)) || '';
}
