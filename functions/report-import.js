// Daily equipment report → photo Requests (the unit reaches Pending once its photos are uploaded).
// Zapier saves the e-Emphasys "Equipment List" email attachment to a web server; every morning
// the scheduled function fetches it from the URL saved in Settings, and every row whose ERP status is
// "K – Post to Web" (or "*K – Post to Web") becomes a photo request (Requests tab) assigned to
// that branch's photo contact. Admins can also run it on demand or upload the file by hand.
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { parseReportText, parseCsv, linesFromPdfItems, matchWarehouse, isPostToWeb } from './shared/report-parse.js';

const MAX_BYTES = 15 * 1024 * 1024;
const SYSTEM_ID = 'daily-report';
const SYSTEM_NAME = 'Daily equipment report';
export const OFF_REPORT_DAYS = 60; // delete a unit this many days after it drops off the report
export const WARN_DAYS = 7; // admins are emailed this many days before
const DAY = 24 * 60 * 60 * 1000;
const MONTHS = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
/** "27 OCT 2026" → sortable "2026-10-27" (or null). */
export function reportDateKey(d) {
  const m = String(d || '').toUpperCase().match(/^(\d{1,2})\s+([A-Z]{3})\s+(\d{4})$/);
  if (!m || !(m[2] in MONTHS)) return null;
  return `${m[3]}-${String(MONTHS[m[2]] + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

export const normalizeKey = (s) => String(s || '').trim().toUpperCase().replace(/\s+/g, '');

/** Text of every line in a PDF (same line rebuilding as the browser import). */
export async function pdfText(bytes) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await getDocument({ data: new Uint8Array(bytes), verbosity: 0, isEvalSupported: false, useSystemFonts: false }).promise;
  const lines = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    lines.push(...linesFromPdfItems((await page.getTextContent()).items));
  }
  await doc.destroy();
  return lines.join('\n');
}

/** PDF, CSV or plain report text → { rows, reportDate }. */
export async function parseReportBytes(bytes, name = '') {
  const buf = Buffer.from(bytes);
  const isPdf = buf.subarray(0, 5).toString('latin1') === '%PDF-';
  const text = isPdf ? await pdfText(buf) : buf.toString('utf8');
  let rows = /\.csv$/i.test(name) ? parseCsv(text) : parseReportText(text);
  if (!rows.length && !isPdf && /[,\t]/.test(text.split(/\r?\n/).find((l) => l.trim()) || '')) rows = parseCsv(text);
  const date = text.match(/Equipment List as of\s+(\d{1,2}\s+[A-Z]{3}\s+\d{4})/i)?.[1] || null;
  return { rows, reportDate: date, isPdf };
}

/** Strips spaces, invisible characters and quotes that sneak in when a link is copied from an email or doc. */
export function cleanUrl(url) {
  return String(url || '').replace(/[\s\u200B-\u200D\uFEFF"'<>]/g, '');
}

export async function fetchReport(rawUrl) {
  const url = cleanUrl(rawUrl);
  if (!url) throw new Error('No report link is saved yet — paste it into Report link and press Save.');
  if (!/^https?:\/\//i.test(url)) throw new Error(`The report link must start with https:// (or http://) — got “${url.slice(0, 60)}”.`);
  // Cache-buster: some web servers/CDNs keep serving yesterday's file.
  const u = new URL(url);
  // Cache-buster — except on signed links (S3/Google Cloud), where changing the query breaks the signature.
  const signed = [...u.searchParams.keys()].some((k) => /^(x-amz-|x-goog-)|^signature$|^sig$|^token$/i.test(k));
  if (!signed) u.searchParams.set('_', Date.now().toString());
  const headers = { 'Cache-Control': 'no-cache' };
  // https://user:password@host/file.pdf → HTTP basic auth (fetch won't take credentials inside the URL).
  if (u.username || u.password) {
    headers.Authorization = `Basic ${Buffer.from(`${decodeURIComponent(u.username)}:${decodeURIComponent(u.password)}`).toString('base64')}`;
    u.username = '';
    u.password = '';
  }
  const res = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(30_000), headers });
  if (!res.ok) throw new Error(`The report URL returned ${res.status} ${res.statusText || ''}`.trim());
  const len = Number(res.headers.get('content-length') || 0);
  if (len > MAX_BYTES) throw new Error('The report file is too large (over 15 MB).');
  // Read with a running byte count so a server that doesn't send a length can't fill memory.
  const chunks = [];
  let total = 0;
  for await (const chunk of res.body) {
    total += chunk.length;
    if (total > MAX_BYTES) throw new Error('The report file is too large (over 15 MB).');
    chunks.push(chunk);
  }
  const bytes = Buffer.concat(chunks);
  if (/text\/html/i.test(res.headers.get('content-type') || '') && !bytes.subarray(0, 5).toString('latin1').startsWith('%PDF')) {
    throw new Error('The report URL returned a web page instead of the report file. Check the link Zapier saves to.');
  }
  let name = u.pathname.split('/').pop() || '';
  try {
    name = decodeURIComponent(name);
  } catch {
    /* keep it encoded, e.g. "report%" */
  }
  return { bytes, lastModified: res.headers.get('last-modified') || null, name };
}

function pickAssignee(warehouse, contacts, users) {
  const ok = (u) => u && u.active && u.email && u.role !== 'viewer';
  const set = contacts?.[warehouse];
  const chosen = set && users.find((u) => u.uid === set);
  if (ok(chosen)) return chosen;
  // Fallback: someone set to get new-unit emails for this location (employees before admins).
  const local = users
    .filter((u) => ok(u) && u.notifyNewUnits === 'locations' && (u.notifyLocations || []).includes(warehouse))
    .sort((a, b) => (a.role === 'employee' ? 0 : 1) - (b.role === 'employee' ? 0 : 1));
  return local[0] || null;
}

/**
 * Creates Pending units + photo requests for the report's "Post to Web" rows that aren't in the app yet.
 * Returns the run summary (also saved to reportRuns/{id}). With dryRun nothing is written.
 */
// reimport: row keys ('ein:123' / 'serial:ABC') an admin chose to add again even though they were imported before.
export async function importReport({ bytes, name = '', source, by = null, dryRun = false, lastModified = null, reimport = [], db = getFirestore() }) {
  const force = new Set(reimport);
  const runRef = db.collection('reportRuns').doc();
  const { rows, reportDate } = await parseReportBytes(bytes, name);
  if (!rows.length) throw new Error('No equipment rows were found in the report. Is it the e-Emphasys “Equipment List” PDF?');

  const wanted = rows.filter(isPostToWeb);
  const [appSnap, cfgSnap, usersSnap] = await Promise.all([
    db.doc('settings/app').get(),
    db.doc('settings/reportImport').get(),
    db.collection('users').where('active', '==', true).get(),
  ]);
  const warehouses = appSnap.get('warehouses') || [];
  const cfg = cfgSnap.data() || {};
  const users = usersSnap.docs.map((d) => ({ uid: d.id, ...d.data() }));

  const created = [];
  const skipped = [];
  const unmapped = new Set();
  const seen = new Set();

  const errors = [];
  for (const r of wanted) {
    try {
    const einKey = normalizeKey(r.ein);
    const serialKey = normalizeKey(r.serial);
    const label = [r.year, r.make, r.model].filter(Boolean).join(' ');
    const rowKey = einKey ? `ein:${einKey}` : `serial:${serialKey}`;
    const base = { key: rowKey, ein: r.ein || '', serial: r.serial || '', unit: label, year: r.year || null, make: r.make || '', model: r.model || '', hours: r.hours ?? null, warehouseCode: r.warehouseCode || '' };
    if (!einKey && !serialKey) continue;
    const key = einKey || `S:${serialKey}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // Already imported once (even if the request was since done or deleted) → never re-create it.
    const marker = db.collection('reportImports').doc(einKey ? `ein-${encodeURIComponent(einKey)}` : `serial-${encodeURIComponent(serialKey)}`);
    const [markerSnap, byEin, bySerial, reqByEin, reqBySerial] = await Promise.all([
      marker.get(),
      einKey ? db.collection('equipment').where('ein', '==', r.ein).limit(5).get() : null,
      serialKey ? db.collection('equipment').where('serialKey', '==', serialKey).limit(5).get() : null,
      einKey ? db.collection('requests').where('ein', '==', r.ein).get() : null,
      serialKey ? db.collection('requests').where('serialKey', '==', serialKey).get() : null,
    ]);
    const again = force.has(rowKey);
    if (markerSnap.exists && !again) {
      skipped.push({ ...base, reason: 'Imported before', canReimport: true });
      continue;
    }
    const units = [...(byEin?.docs || []), ...(bySerial?.docs || [])];
    const existing = units.find((d) => d.get('status') !== 'deleted');
    const inTrash = units.find((d) => d.get('status') === 'deleted');
    if (!existing && inTrash && !again) {
      skipped.push({ ...base, reason: 'In Deleted units — restore it, or add again', equipmentId: inTrash.id, canReimport: true });
      continue;
    }
    if (existing) {
      skipped.push({ ...base, reason: 'Already in the app', equipmentId: existing.id });
      if (!dryRun) await marker.set({ ein: r.ein || '', serial: r.serial || '', equipmentId: existing.id, runId: runRef.id, existing: true, at: FieldValue.serverTimestamp() }, { merge: true });
      continue;
    }
    // Someone already asked for photos of it (e.g. a request made by hand).
    const openReq = [...(reqByEin?.docs || []), ...(reqBySerial?.docs || [])].find((d) => d.get('status') === 'open');
    if (openReq) {
      skipped.push({ ...base, reason: 'Already has an open photo request', requestId: openReq.id });
      if (!dryRun) await marker.set({ ein: r.ein || '', serial: r.serial || '', requestId: openReq.id, runId: runRef.id, existing: true, at: FieldValue.serverTimestamp() }, { merge: true });
      continue;
    }

    const warehouse = cfg.codes?.[r.warehouseCode] || matchWarehouse(r.warehouseCode, warehouses) || r.warehouseCode || 'Unknown';
    if (!cfg.codes?.[r.warehouseCode] && !matchWarehouse(r.warehouseCode, warehouses)) unmapped.add(r.warehouseCode || '?');
    const assignee = pickAssignee(warehouse, cfg.contacts, users);
    const reqRef = db.collection('requests').doc();
    const now = FieldValue.serverTimestamp();
    const item = { ...base, warehouse, equipmentId: null, requestId: reqRef.id, assignedTo: assignee?.uid || null, assignedToName: assignee ? assignee.displayName || assignee.email : null };
    created.push(item);
    if (dryRun) continue;

    const batch = db.batch();
    batch.set(reqRef, {
      make: (r.make || 'Bobcat').slice(0, 80),
      model: (r.model || '').slice(0, 80),
      serial: (r.serial || '').slice(0, 60),
      serialKey,
      ein: (r.ein || '').slice(0, 40),
      warehouse: warehouse.slice(0, 80),
      warehouseCode: r.warehouseCode || '',
      year: Number.isInteger(r.year) ? r.year : null,
      hours: typeof r.hours === 'number' ? r.hours : null,
      angles: [],
      dueDate: null,
      notes: `From the daily equipment report${reportDate ? ` (${reportDate})` : ''} — ERP status: ${r.statusCode ? `${r.statusCode} ` : ''}${r.status}.`,
      source: (name || 'Daily report').slice(0, 120),
      equipmentId: null, // the unit is created when the photos are uploaded (Add photos → new unit, prefilled)
      reportStatus: r.status || '',
      reportStatusCode: r.statusCode || '',
      reportDescription: r.description || '',
      status: 'open',
      assignedTo: assignee?.uid || null,
      assignedToName: item.assignedToName,
      assignedBy: assignee ? SYSTEM_ID : null,
      completedAt: null,
      completedBy: null,
      completedByName: null,
      createdBy: SYSTEM_ID,
      createdByEmail: '',
      createdByName: SYSTEM_NAME,
      importBatch: runRef.id,
      createdAt: now,
      updatedAt: now,
    });
    // create() fails if another run (e.g. "Run now" during the scheduled run) got there first.
    const markerData = { ein: r.ein || '', serial: r.serial || '', requestId: reqRef.id, runId: runRef.id, at: now };
    if (again) batch.set(marker, markerData);
    else batch.create(marker, markerData);
    try {
      await batch.commit();
    } catch (err) {
      if (err.code === 6 || /already exists/i.test(err.message)) {
        created.pop();
        skipped.push({ ...base, reason: 'Imported before' });
        continue;
      }
      throw err;
    }
    } catch (err) {
      // One bad row (or a write failure) shouldn't stop the rest, or lose the record of what was created.
      logger.error('Report import row failed', { ein: r.ein, serial: r.serial, err: err.message });
      errors.push(`${r.ein || r.serial}: ${err.message}`);
      skipped.push({ ein: r.ein || '', serial: r.serial || '', unit: [r.year, r.make, r.model].filter(Boolean).join(' '), warehouseCode: r.warehouseCode || '', reason: `Error: ${err.message}`.slice(0, 200) });
    }
  }

  const summary = {
    source,
    byUid: by?.uid || null,
    byName: by ? by.displayName || by.email : null,
    fileName: name || null,
    reportDate,
    lastModified,
    rowsFound: rows.length,
    postToWeb: wanted.length,
    created,
    skipped,
    unmapped: [...unmapped],
    errors,
    ok: true,
    dryRun,
  };
  // Units that have dropped off the report: flag, warn, and delete after OFF_REPORT_DAYS.
  // Only from the live link (an uploaded file may be an old report) and only when the report read cleanly.
  summary.offReport = source === 'upload' ? { skippedReason: 'Uploaded files don’t change the “not on report” flags.' } : await reconcileOffReport({ db, rows, reportDate, cfg, dryRun });

  if (!dryRun) {
    await runRef.set({ ...summary, at: FieldValue.serverTimestamp() });
    await db.doc('settings/reportImport').set({ lastRun: { id: runRef.id, ok: true, at: FieldValue.serverTimestamp(), created: created.length, reportDate } }, { merge: true });
  }
  logger.info('Report import', { source, reportDate, rows: rows.length, postToWeb: wanted.length, created: created.length, skipped: skipped.length });
  return { id: dryRun ? null : runRef.id, ...summary };
}

/**
 * Compares every unit in the app with ALL rows of the report (any ERP status).
 * - Not on the report → `offReport: { since }` (shows a "Not on report" tag; admins can choose "Keep").
 * - Back on the report → flag cleared.
 * - Off for WARN_DAYS before the deadline → listed in a heads-up email to admins (returned as `warn`).
 * - Off for OFF_REPORT_DAYS → deleted (photos, messages and open requests are cleaned up by onEquipmentDeleted).
 * Units with `offReportKeep` are never flagged or deleted. Units with no EIN and no serial are ignored.
 */
export async function reconcileOffReport({ db, rows, reportDate, cfg = {}, dryRun = false, now = Date.now() }) {
  const prevRows = cfg.lastCleanRows || 0;
  const dateKey = reportDateKey(reportDate);
  // Safety: a cut-off or unreadable file must not flag half the inventory.
  if (rows.length < 10 || (prevRows && rows.length < prevRows * 0.6)) {
    return { skippedReason: `The report only had ${rows.length} units (last time ${prevRows || 'unknown'}), so nothing was flagged in case the file was cut short.` };
  }
  if (dateKey && cfg.lastCleanDate && dateKey < cfg.lastCleanDate) {
    return { skippedReason: `This report (${reportDate}) is older than one already processed, so flags weren’t changed.` };
  }
  const eins = new Set(rows.map((r) => normalizeKey(r.ein)).filter(Boolean));
  const serials = new Set(rows.map((r) => normalizeKey(r.serial)).filter(Boolean));
  const snap = await db.collection('equipment').get();
  const out = { flagged: [], cleared: [], warn: [], deleted: [] };
  const writes = [];
  for (const d of snap.docs) {
    const eq = d.data();
    if (eq.status === 'deleted') continue;
    const einKey = normalizeKey(eq.ein);
    const serialKey = eq.serialKey || normalizeKey(eq.serial);
    const realSerial = serialKey && serialKey !== '—';
    if (!einKey && !realSerial) continue;
    const label = { id: d.id, unit: [eq.year, eq.make, eq.model].filter(Boolean).join(' '), ein: eq.ein || '', serial: eq.serial || '', warehouse: eq.warehouse || '', status: eq.status };
    const onReport = (einKey && eins.has(einKey)) || (realSerial && serials.has(serialKey));
    if (onReport) {
      if (eq.offReport) {
        out.cleared.push(label);
        writes.push(() => d.ref.update({ offReport: FieldValue.delete() }));
      }
      continue;
    }
    if (eq.offReportKeep) continue;
    if (!eq.offReport) {
      out.flagged.push(label);
      writes.push(() => d.ref.update({ offReport: { since: Timestamp.fromMillis(now), sinceReport: reportDate || null, warned: false } }));
      continue;
    }
    const since = eq.offReport.since?.toMillis?.() ?? now;
    const deleteAt = since + OFF_REPORT_DAYS * DAY;
    if (now >= deleteAt) {
      // Into Deleted units (restorable for 30 days), not gone for good.
      out.deleted.push(label);
      writes.push(() =>
        d.ref.update({
          status: 'deleted',
          deletedAt: Timestamp.fromMillis(now),
          deletedByEmail: null,
          deletedFromStatus: eq.status,
          deletedReason: `Not on the equipment report for ${OFF_REPORT_DAYS} days`,
        }),
      );
    } else if (now >= deleteAt - WARN_DAYS * DAY && !eq.offReport.warned) {
      out.warn.push({ ...label, deleteAt: new Date(deleteAt).toISOString() });
      writes.push(() => d.ref.update({ 'offReport.warned': true }));
    }
  }
  // Photo requests from the report for units that have since dropped off it (e.g. sold before photos) aren't needed.
  const reqs = await db.collection('requests').where('createdBy', '==', SYSTEM_ID).get();
  out.requestsRemoved = [];
  for (const d of reqs.docs) {
    const q = d.data();
    if (q.status !== 'open') continue;
    const einKey = normalizeKey(q.ein);
    const serialKey = q.serialKey || normalizeKey(q.serial);
    if ((einKey && eins.has(einKey)) || (serialKey && serials.has(serialKey))) continue;
    out.requestsRemoved.push({ id: d.id, unit: [q.year, q.make, q.model].filter(Boolean).join(' '), ein: q.ein || '', serial: q.serial || '', warehouse: q.warehouse || '' });
    writes.push(() => d.ref.delete());
  }

  if (!dryRun) {
    for (const w of writes) await w();
    await db.doc('settings/reportImport').set({ lastCleanRows: rows.length, lastCleanDate: dateKey || cfg.lastCleanDate || null }, { merge: true });
  }
  return out;
}

/** Records a failed run so admins see it in Settings. */
export async function recordFailure({ source, by = null, error }) {
  const db = getFirestore();
  const ref = db.collection('reportRuns').doc();
  await ref.set({ source, byUid: by?.uid || null, byName: by ? by.displayName || by.email : null, ok: false, error: String(error).slice(0, 500), at: FieldValue.serverTimestamp() });
  await db.doc('settings/reportImport').set({ lastRun: { id: ref.id, ok: false, at: FieldValue.serverTimestamp(), error: String(error).slice(0, 500) } }, { merge: true });
  return ref.id;
}

// Re-exported for tests (which live outside functions/ and can't resolve firebase-admin directly).
export { FieldValue, Timestamp };
