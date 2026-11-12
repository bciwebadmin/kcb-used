// Parser tests (no emulator needed):  node --test tests/import-parse.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseReportText, parseCsv, matchWarehouse } from '../src/import-parse.js';

// Synthetic rows in the e-Emphasys "Equipment List" layout (numbers are made up).
const REPORT = `Equipment List as of 01 JAN 2026
Whse   EIN     Year   Product Number   Prod Desc        Serial Numbers   Pline   Acquired     Hours   Curr_Cost   Adv_Price   Status
18     1000001 2025   7326129-U        80" SD BUCKET    1000001          11016   10/22/26   9999.00      100.00               HT Hold Tr
18     1000002 2025   E48-U            BOBCAT COMPACT E B6EC00001        11010   10/19/26    399.00   10,000.00               *D Down
19     1000003        7272680-U        74" HD BUCKET    1000003          11016   10/23/26                100.00               M Missing
73     1000004 2021   325G-U           JOHN DEERE TRACK 1T0325GKPMJ000   11014   10/20/26   1400.00   10,000.00               HT Hold Tr
73     1000005        642B-U           SKID STEER LOADE 5040M00001       11010   10/12/26              2,000.00               I In Trans
W5     1000006 2000   773-U            BOBCAT SKID-STEE 517600000        11010   01/09/25   9999.00   10,000.00               Demo-SIP`;

test('parses every row of the report, skipping headers', () => {
  const rows = parseReportText(REPORT);
  assert.equal(rows.length, 6);
  const [bucket, e48, noYear, deere, noHours, w5] = rows;
  assert.deepEqual([bucket.model, bucket.make, bucket.hours, bucket.status], ['80" SD BUCKET (7326129)', 'Bobcat', null, 'Hold Transfer']);
  assert.deepEqual([e48.warehouseCode, e48.ein, e48.year, e48.model, e48.serial, e48.hours, e48.status], ['18', '1000002', 2025, 'E48', 'B6EC00001', 399, 'Down']);
  assert.equal(noYear.year, null);
  assert.equal(deere.make, 'John Deere');
  assert.deepEqual([noHours.hours, noHours.status], [null, 'In Transit']);
  assert.deepEqual([w5.warehouseCode, w5.model, w5.hours], ['W5', '773', null]);
  assert.ok(rows.every((r) => !('cost' in r) && !('price' in r)), 'cost/price are never kept');
});

test('CSV with headers in any order', () => {
  const rows = parseCsv('Serial Number,Model,Whse,EIN,Hours\nB4CE1,T76-U,18,123,"1,234.5"\n');
  assert.deepEqual([rows[0].serial, rows[0].model, rows[0].warehouseCode, rows[0].ein, rows[0].hours], ['B4CE1', 'T76', '18', '123', 1234.5]);
});

test('warehouse codes match names that contain them', () => {
  const names = ['Blue Springs - 18', 'Olathe - 20', 'W5 Wichita'];
  assert.equal(matchWarehouse('18', names), 'Blue Springs - 18');
  assert.equal(matchWarehouse('W5', names), 'W5 Wichita');
  assert.equal(matchWarehouse('1', names), '');
});
