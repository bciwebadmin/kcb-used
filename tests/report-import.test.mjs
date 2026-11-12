// Daily-report import against an in-memory Firestore stand-in:  node --test tests/report-import.test.mjs
// Optional: put a real report at tests/fixtures/equipment-list.pdf (git-ignored — it has costs in it).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { importReport, reconcileOffReport, FieldValue, Timestamp } from '../functions/report-import.js';

function fakeDb(seed = {}) {
  const docs = new Map(Object.entries(seed));
  const isDel = (v) => v && typeof v.isEqual === 'function' && v.isEqual(FieldValue.delete());
  const docRef = (path) => ({
    id: path.split('/').pop(),
    path,
    get: async () => snap(path),
    set: async (d, o) => docs.set(path, o?.merge ? { ...(docs.get(path) || {}), ...d } : d),
    delete: async () => docs.delete(path),
    update: async (patch) => {
      const d = structuredClone(docs.get(path));
      for (const [k, v] of Object.entries(patch)) {
        const parts = k.split('.');
        let o = d;
        for (const p of parts.slice(0, -1)) o = o[p];
        if (isDel(v)) delete o[parts.at(-1)];
        else o[parts.at(-1)] = v;
      }
      docs.set(path, d);
    },
  });
  const snap = (path) => ({ exists: docs.has(path), id: path.split('/').pop(), ref: docRef(path), data: () => docs.get(path), get: (k) => docs.get(path)?.[k] });
  let n = 0;
  const col = (name, filters = []) => ({
    doc: (id = `auto${++n}`) => docRef(`${name}/${id}`),
    where: (f, _op, v) => col(name, [...filters, [f, v]]),
    limit: () => col(name, filters),
    get: async () => {
      const rows = [...docs.entries()].filter(([p, d]) => p.startsWith(`${name}/`) && p.split('/').length === 2 && filters.every(([f, v]) => d[f] === v));
      return { docs: rows.map(([p]) => snap(p)) };
    },
  });
  return {
    docs,
    doc: docRef,
    collection: col,
    batch: () => {
      const ops = [];
      return {
        set: (ref, d) => ops.push([ref, d, false]),
        create: (ref, d) => ops.push([ref, d, true]),
        commit: async () => {
          if (ops.some(([r, , c]) => c && docs.has(r.path))) throw Object.assign(new Error('6 ALREADY_EXISTS: already exists'), { code: 6 });
          for (const [r, d] of ops) await r.set(d);
        },
      };
    },
  };
}

const REPORT = `Equipment List as of 27 OCT 2026
20     1334769 2023   E50-U            BOBCAT COMPACT E B4GP18142        11010   10/01/26   1547.00   40,000.00               K Post To
21     1319942 2023   T76-U            BOBCAT COMPACT T B4CE25478        11010   10/01/26   1033.00   40,000.00               *K Post To
21     1300000 2022   S76-U            BOBCAT SKID-STEE B4CE00001        11010   10/01/26    900.00   40,000.00               A Availabl
20     1363155 2024   T76-U            BOBCAT COMPACT T B4CE30556        11010   10/01/26    481.00   40,000.00               K Post To`;

test('creates assigned photo requests (no units yet) for K / *K rows only, and never twice', async () => {
  const db = fakeDb({
    'settings/app': { warehouses: ['Lenexa - 20', 'Blue Springs - 21'] },
    'settings/reportImport': { contacts: { 'Lenexa - 20': 'u1' } },
    'users/u1': { active: true, role: 'employee', email: 'a@x.com', displayName: 'Ann' },
    'users/u2': { active: true, role: 'employee', email: 'b@x.com', notifyNewUnits: 'locations', notifyLocations: ['Blue Springs - 21'] },
    'equipment/old': { ein: '1363155', serialKey: 'B4CE30556' },
  });
  const r = await importReport({ bytes: Buffer.from(REPORT), source: 'test', db });
  assert.equal(r.rowsFound, 4);
  assert.equal(r.postToWeb, 3);
  assert.equal(r.reportDate, '27 OCT 2026');
  assert.deepEqual(r.created.map((c) => [c.ein, c.warehouse, c.assignedTo]), [['1334769', 'Lenexa - 20', 'u1'], ['1319942', 'Blue Springs - 21', 'u2']]);
  assert.deepEqual(r.skipped.map((s) => [s.ein, s.reason]), [['1363155', 'Already in the app']]);
  assert.equal([...db.docs.keys()].filter((k) => k.startsWith('equipment/')).length, 1, 'no units created — only requests');
  const req = db.docs.get(`requests/${r.created[0].requestId}`);
  assert.equal(req.equipmentId, null);
  assert.equal(req.status, 'open');
  assert.equal(req.model, 'E50');
  assert.equal(req.assignedTo, 'u1');
  assert.equal(req.importBatch, r.id);

  // Delete the request (e.g. admin removed it) — the next day's report must not bring it back.
  db.docs.delete(`requests/${r.created[0].requestId}`);
  const again = await importReport({ bytes: Buffer.from(REPORT), source: 'test', db });
  assert.equal(again.created.length, 0);
  assert.ok(again.skipped.some((s) => s.ein === '1334769' && s.reason === 'Imported before'));
});

test('a concurrent run that already created the unit is skipped, not duplicated', async () => {
  const db = fakeDb({ 'settings/app': { warehouses: [] }, 'reportImports/ein-1334769': { ein: '1334769' } });
  // marker appears after this run's check (simulate the race by making the first get() miss it)
  const markerPath = 'reportImports/ein-1334769';
  const saved = db.docs.get(markerPath);
  db.docs.delete(markerPath);
  const origCol = db.collection;
  db.collection = (name, f) => {
    const c = origCol(name, f);
    if (name !== 'reportImports') return c;
    return { ...c, doc: (id) => { const ref = c.doc(id); return { ...ref, get: async () => { const snap = await ref.get(); if (ref.path === markerPath) db.docs.set(markerPath, saved); return snap; } }; } };
  };
  const r = await importReport({ bytes: Buffer.from(REPORT), source: 'test', db });
  assert.ok(!r.created.some((c) => c.ein === '1334769'));
  assert.ok(r.skipped.some((s) => s.ein === '1334769' && s.reason === 'Imported before'));
  assert.equal([...db.docs.keys()].filter((k) => k.startsWith('requests/')).length, 2);
});

test('skips a unit that already has an open photo request', async () => {
  const db = fakeDb({ 'settings/app': { warehouses: [] }, 'requests/x': { ein: '1334769', serialKey: 'B4GP18142', status: 'open' } });
  const r = await importReport({ bytes: Buffer.from(REPORT), source: 'test', db });
  assert.ok(r.skipped.some((s) => s.ein === '1334769' && s.reason === 'Already has an open photo request'));
  assert.equal(r.created.length, 2);
});

test('dry run writes nothing', async () => {
  const db = fakeDb({ 'settings/app': { warehouses: [] } });
  const before = db.docs.size;
  const r = await importReport({ bytes: Buffer.from(REPORT), source: 'test', db, dryRun: true });
  assert.equal(r.created.length, 3);
  assert.deepEqual(r.unmapped.sort(), ['20', '21']);
  assert.equal(db.docs.size, before);
});

const sample = new URL('./fixtures/equipment-list.pdf', import.meta.url);
test('real PDF report', { skip: !existsSync(sample) }, async () => {
  const db = fakeDb({ 'settings/app': { warehouses: [] } });
  const r = await importReport({ bytes: readFileSync(sample), name: 'no_price.PDF', source: 'test', db, dryRun: true });
  assert.equal(r.rowsFound, 39);
  assert.deepEqual(r.created.map((c) => c.ein), ['1334769', '1363155', '1242185', '1319942']);
});

const DAY = 86400000;
const rowsOf = (...eins) => [...eins.map((ein) => ({ ein, serial: `S${ein}` })), ...Array.from({ length: 12 }, (_, i) => ({ ein: `9${i}`, serial: `X${i}` }))];

test('units no longer on the report are flagged, warned, then deleted after 60 days', async () => {
  const now = Date.UTC(2026, 11, 1);
  const db = fakeDb({
    'equipment/on': { ein: '100', serialKey: 'S100', status: 'archived' },
    'equipment/new-off': { ein: '200', serialKey: 'S200', status: 'archived' },
    'equipment/old-off': { ein: '300', serialKey: 'S300', status: 'archived', offReport: { since: Timestamp.fromMillis(now - 61 * DAY), warned: true } },
    'equipment/warn': { ein: '400', serialKey: 'S400', status: 'active', offReport: { since: Timestamp.fromMillis(now - 55 * DAY), warned: false } },
    'equipment/back': { ein: '500', serialKey: 'S500', status: 'archived', offReport: { since: Timestamp.fromMillis(now - 10 * DAY) } },
    'equipment/kept': { ein: '600', serialKey: 'S600', status: 'archived', offReportKeep: true },
    'equipment/noid': { ein: '', serialKey: '—', status: 'active' },
    'equipment/trash': { ein: '700', serialKey: 'S700', status: 'deleted' },
    'requests/gone': { ein: '800', serialKey: 'S800', status: 'open', createdBy: 'daily-report' },
    'requests/still': { ein: '100', serialKey: 'S100', status: 'open', createdBy: 'daily-report' },
    'requests/manual': { ein: '900', serialKey: 'S900', status: 'open', createdBy: 'u1' },
  });
  const r = await reconcileOffReport({ db, rows: rowsOf('100', '500'), reportDate: '01 DEC 2026', now });
  assert.deepEqual(r.flagged.map((x) => x.id), ['new-off']);
  assert.deepEqual(r.cleared.map((x) => x.id), ['back']);
  assert.deepEqual(r.warn.map((x) => x.id), ['warn']);
  assert.deepEqual(r.deleted.map((x) => x.id), ['old-off']);
  assert.equal(db.docs.get('equipment/old-off').status, 'deleted', 'moved to Deleted units, not removed');
  assert.equal(db.docs.get('equipment/old-off').deletedFromStatus, 'archived');
  assert.ok(db.docs.get('equipment/new-off').offReport.since);
  assert.equal(db.docs.get('equipment/back').offReport, undefined);
  assert.equal(db.docs.get('equipment/warn').offReport.warned, true);
  assert.equal(db.docs.get('equipment/kept').offReport, undefined);
  assert.equal(db.docs.get('equipment/noid').offReport, undefined);
  assert.equal(db.docs.get('equipment/trash').offReport, undefined);
  assert.deepEqual(r.requestsRemoved.map((x) => x.id), ['gone']);
  assert.ok(!db.docs.has('requests/gone') && db.docs.has('requests/still') && db.docs.has('requests/manual'));
  // Warned once only.
  const again = await reconcileOffReport({ db, rows: rowsOf('100', '500'), reportDate: '01 DEC 2026', cfg: { lastCleanRows: 14 }, now });
  assert.equal(again.warn.length, 0);
});

test('a cut-short or older report changes nothing', async () => {
  const db = fakeDb({ 'equipment/a': { ein: '1', serialKey: 'S1', status: 'active' } });
  const short = await reconcileOffReport({ db, rows: rowsOf().slice(0, 5), reportDate: '01 DEC 2026' });
  assert.match(short.skippedReason, /cut short/);
  const shrunk = await reconcileOffReport({ db, rows: rowsOf(), reportDate: '01 DEC 2026', cfg: { lastCleanRows: 40 } });
  assert.match(shrunk.skippedReason, /cut short/);
  const old = await reconcileOffReport({ db, rows: rowsOf(), reportDate: '01 NOV 2026', cfg: { lastCleanDate: '2026-11-15' } });
  assert.match(old.skippedReason, /older/);
  assert.equal(db.docs.get('equipment/a').offReport, undefined);
});

test('an admin can add a previously imported unit again (e.g. deleted by mistake)', async () => {
  const db = fakeDb({
    'settings/app': { warehouses: [] },
    'reportImports/ein-1363155': { ein: '1363155' },
    'equipment/old': { ein: '1363155', serialKey: 'B4CE30556', status: 'deleted' },
  });
  const first = await importReport({ bytes: Buffer.from(REPORT), source: 'test', db });
  const row = first.skipped.find((s) => s.ein === '1363155');
  assert.equal(row.reason, 'Imported before');
  assert.equal(row.canReimport, true);
  const again = await importReport({ bytes: Buffer.from(REPORT), source: 'test', db, reimport: [row.key] });
  assert.ok(again.created.some((c) => c.ein === '1363155'));
  // Unit in Deleted units but never marked → offered, not silently skipped.
  const db2 = fakeDb({ 'settings/app': { warehouses: [] }, 'equipment/old': { ein: '1363155', serialKey: 'B4CE30556', status: 'deleted' } });
  const r2 = await importReport({ bytes: Buffer.from(REPORT), source: 'test', db: db2 });
  assert.match(r2.skipped.find((s) => s.ein === '1363155').reason, /Deleted units/);
});
