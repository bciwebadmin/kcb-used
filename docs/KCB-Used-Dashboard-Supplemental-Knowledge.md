# SUPPLEMENTAL KNOWLEDGE — KCB Used Equipment Dashboard (conversation record)

**Companion to:** `KCB-Used-Dashboard-Knowledge-Transfer.md` (main transfer) and `KCB-Used-Dashboard-Source-Code.md` (full source).
**Covers:** the working conversation of Oct 21 → Nov 4, 2026.
**Prepared:** 2026-11-04.

**What this file adds.** The main document describes the system. This one keeps conversation-level detail that is hard to rebuild:
- exact user requests;
- the order changes were made in, and why;
- what was confirmed live versus only handed over;
- debugging evidence;
- the techniques used to test and deliver changes;
- verbatim code for the trickiest pieces, copied from the files on 2026-11-04.

**Limits — read first:**
- Oct 21–27 survives only as a compressed summary (an earlier context limit). Items from that period are marked **[Summary]**.
- Everything from the afternoon of Oct 27 onward is from the full conversation text.
- "Confirmed" means the user reported it, or a tool result showed it (a screenshot, `firebase functions:list` output, the deploy cache on her computer).
- "Delivered" means the code was written into her folder but she never confirmed it working.

---

## 1. Facts established in this conversation

### People and roles
- **Erin:** builder and maintainer.
- **Matt** (Matthew Chapman, shown as "Submitted by Matthew Chapman" in an Oct 28 screenshot) and **Lesley** (also spelled "Leslie"): admins who post units to the website and Machinery Trader.
- **Sean:** received the original example photos by text [Summary].
- **Hayden Jeffryes:** appears as a request assignee in the Nov 2 screenshot.
- **Sales reps:** viewer role.

### Matt's Oct 27 review list (paraphrased; he wrote it)
1. Rename "Inventory" to **Pending** and "Archive" to **Listed**. Pending is the home screen.
2. Import from the daily report: rows with status "K – Post to Web" or "*K – Post to Web".
3. Allow moving a unit from Pending to Listed. Leslie or Matt change it by hand after posting.
4. Keep the delete option.
5. Add an **Instructions** menu item. His text:
   - Unit pulled out and pictured by itself, "the star".
   - Unit clean; dirty units reflect on KC Bobcat.
   - Staged in front of the building or sign, with KC Bobcat in the background.
   - Example pictures to come.

Intended workflow: Matt or Leslie assign each request to the right branch person. That person takes up to 11 photos. Admins download and post, then mark the unit Listed. Sales reps still see the photos. Units are deleted 60 days after sale ("this process may change later").

### Verbatim user requirements that shaped the design
- "will be done with zapier: email attachment > ftp to web server to get url" — the daily report is fetched from a fixed URL.
- "do not make images required. Sometimes they will not take pictures from all angles" [Summary]
- "flag and delete" — the user's choice among three off-report options (see §3).
- "Need a spot to see deleted units. Not in main menu but a small link at the bottom of the tables on Pending, Listed, and Requests."
- "on daily import those should go into the Requests tab and then once uploaded moved to Pending"
- "lets merge pending and requests. So there are two tabs. One for listings with images waiting to be listed (Pending) and one for all the requests (either manual or from daily import)"
- "the settings page reworked some. The boxes are all different sizes and there is a lot of scrolling."
- "Is it possible to add an "@" sign and populate all users to tag them to notify them in the message of a unit?" Purpose: notify Lesley a unit is ready, and @ the people who posted it when help is needed.

### Daily report facts (verified by parsing the real PDFs)
- **Report URL** (set in Settings, confirmed working Oct 27): `https://www.berrycompaniesinc.com/instockinventory/no_price.PDF`. It is publicly reachable with no login, and the file includes cost columns.
- **Oct 27 report:** "Equipment List as of 27 OCT 2026", 2 pages, 39 rows. The 4 K rows:

  | Whse | EIN | Year | Model | Serial | Hours | Status |
  |---|---|---|---|---|---|---|
  | 20 | 1334769 | 2023 | E50 | B4GP18142 | 1547 | K |
  | 20 | 1363155 | 2024 | T76 | B4CE30556 | 481 | K |
  | 20 | 1242185 | 2021 | T770 | AT6328618 | 1755 | K |
  | 21 | 1319942 | 2023 | T76 | B4CE25478 | 1033 | *K |

- **First successful import** (Oct 27, 2:24 PM, "Run now" by Erin Thompson): the report was "as of 26 OCT 2026", with 39 units and 1 marked Post to Web.
  - **2024 Bobcat T76 · Serial B4CE30556 · EIN 1363155 → Springfield– 20**, unassigned (no branch contact).
  - Under the pre-requests-first code this created a **Pending unit** with no photos.
  - Erin then deleted it by accident. The next run showed "Imported before", which led to the **Add again** feature.
  - Whether it was re-added is **unknown**.
- Two earlier "Run now" attempts the same afternoon **failed** with "The report URL must start with https://". Cause: the old **Run now** button read the saved link, and the link hadn't been saved yet.

### Locations
Configured as of Oct 27 (from the Settings screenshot): Blue Springs – 18, Joplin – 73, Olathe – 19, Sedalia – W5, Springfield– 20, St Joe – 76, Tracy – 21.
- **Springfield– 20** has no space before the dash.
- None had a photo contact then, except test data.

### Deployed functions
`firebase functions:list` output, pasted by the user on Oct 28. All v2, us-central1, nodejs22. Memory is 256 MB unless noted.
- **Callable:** adminPassword, createUser, deleteUser, runReportImport (512), sendTestEmail, setupDownloads, updateUser.
- **Scheduled:** dailyReportImport (512), purgeDeletedUnits.
- **Firestore triggers:** onEquipmentCreated, onEquipmentDeleted, onEquipmentUpdated, onMessageCreated, onRequestImportCreated, onRequestWritten.

That is 15 functions. `downloadPhotos` (HTTP, 512) was added after this list and is **not confirmed deployed**.

### Environment
- Erin works on **Windows** in **PowerShell**, in `C:\Users\ECharboneau\Downloads\KCBUsed`.
- She deploys herself, usually `npm run build` then `firebase deploy --only …`.
- Files were delivered straight into that folder through the Claude desktop bridge.

---

## 2. Exact code, functions, configuration, field names
Verbatim snippets are in the **Appendix** at the end; the full files are in the source bundle. Identifiers that are easy to get wrong:

| Thing | Exact value |
|---|---|
| System author id | `createdBy: 'daily-report'`, display name `'Daily equipment report'` (constants `SYSTEM_ID`, `SYSTEM_NAME` in `functions/report-import.js`) |
| Marker doc ids | `reportImports/ein-${encodeURIComponent(EIN)}`, or `serial-${…}` when there is no EIN |
| Re-import keys | `'ein:<EIN>'` / `'serial:<SERIAL>'` (normalized upper-case, no spaces), sent as `runReportImport({ reimport: [key] })` |
| Skip reasons shown in the UI | `Imported before` · `Already in the app` · `In Deleted units — restore it, or add again` · `Already has an open photo request` · `Error: …` |
| Request closed by the system | `completedBy: 'listed'` (`completedByName: 'Marked as Listed'`) or `'deleted'` (`'Unit deleted'`) — no "Photos ready" email |
| Auto-delete reason | `deletedReason: 'Not on the equipment report for 60 days'` |
| Off-report fields | `offReport: { since: Timestamp, sinceReport: '27 OCT 2026', warned: false }`, `offReportKeep: true`, `offReportKeepBy: email` |
| Reconcile bookkeeping | `settings/reportImport.lastCleanRows`, `.lastCleanDate` (`'YYYY-MM-DD'` from `reportDateKey('27 OCT 2026')`) |
| Mentions | `messages.mentions: [uid…]` (≤25); inserted text is `@<displayName or email>` |
| Download form fields | POST `/api/download` with `token` (ID token), `id`, optional `slot` |
| Settings tab routes | `#/admin/settings`, `#/admin/settings/report`, `#/admin/settings/email`; old `#/admin/report` still works (it's linked in failure emails) |
| Mail log types | `new-submission`, `request-assigned`, `message`, `welcome`, `password`, `request-import`, `photos-ready`, `report-import`, `off-report`, `test` |
| Schedules | daily import `'30 8 * * *'`, purge `'15 2 * * *'`, both `America/Chicago` |
| Constants | `OFF_REPORT_DAYS = 60` (in **both** `functions/report-import.js` and `src/config.js`), `WARN_DAYS = 7`, trash 30 days (`TRASH_DAYS` in `src/data.js`, and hard-coded in `purgeDeletedUnits`), `MAX_BYTES` 15 MB for report fetches |

Reconciliation safety thresholds: at least 10 rows, at least 60% of `lastCleanRows`, and a report date not older than `lastCleanDate`. Uploads (`source === 'upload'`) never change flags.

---

## 3. Decisions made in this conversation, and why

1. **The 11th photo is "Serial Plate"** (key `serialPlate`), not "Additional". The user's example set included a serial-plate photo. The key was renamed before anything was stored.
2. **Daily import is server-side and scheduled.** Zapier only puts the file at a URL; the dashboard pulls it at 8:30 AM Central.
   - The parser was moved to `functions/shared/report-parse.js`, so the browser (manual import) and the function share one parser.
   - `src/import-parse.js` just re-exports it.
3. **Requests first, units on upload.** At first the import created Pending units plus requests. The user changed this the same day so Pending only holds units that have photos.
   - Units created from a request store `requestId`.
   - For daily-report requests, `onEquipmentCreated` skips the new-unit email, so admins get one "Photos ready" email instead of two.
4. **Off-report handling.** Offered three options:
   - flag only;
   - flag, then delete after 60 days (recommended was option 1, flag only);
   - hide immediately.

   The user picked **flag and delete**. Matching is by EIN **or** serial, against **all** report rows, because units drop off "K" once posted but stay on the report until sold.

   I warned before go-live: if the report isn't a complete inventory, units missing from it would be deleted after 60 days. The user hasn't answered whether the 39-row report is complete.
5. **Soft delete with trash.**
   - Status `deleted` is kept out of the normal lists by splitting the snapshot in `main.js` into `store.equipment` and `store.trash`.
   - Restore goes back to `deletedFromStatus`.
   - Restoring an auto-deleted unit sets `offReportKeep` so it isn't deleted again the next morning.
   - Only **units** go to trash; requests are still hard-deleted.
6. **One-time imports, with an override.** Markers stop deliberately deleted units from coming back. "Add again" was added after the accidental delete.
7. **Pending and Requests merged** into one menu item with two cards (`workTabs`) that show live counts. The "Pending" nav badge now counts open requests assigned to me plus my units flagged for follow-up.
8. **Settings in tabs.**
   - The Locations tab combines what used to be four cards: warehouses, branch new-unit emails, photo contacts, report codes.
   - Location add/remove saves immediately; there's no Save button.
   - The report code is derived from the location name.
9. **Downloads are server-side** (see §4), not via bucket CORS.
10. **@mentions always email**, regardless of the "message emails" setting. A name typed without picking it from the list is not a mention.
11. **All angles ticked is saved as `[]`.** An empty list already meant "all angles" everywhere.
12. **Instructions icon:** the user's skid-steer PNG was vectorised into one SVG path (`SKID_PATH`), so the icon stays sharp at every size. Example photos for the slots are stored at 900 px, with 400 px `-sm` versions.

---

## 4. Problems encountered and how they were resolved

| # | Symptom (user-reported) | Root cause | Resolution | Status |
|---|---|---|---|---|
| 1 | "archive needs to be changed to listed and there is no instructions tab" (Oct 27) | Her **source and build were correct**: checked the device files and the `.firebase/hosting.*.cache` asset hash. The open browser tab was stale. | Told her to hard-refresh (Ctrl+Shift+R), and that GitHub CI could redeploy an older build. | Resolved (later screenshots show the new nav) |
| 2 | "Last import failed … The report URL must start with https://" | Run now used the saved (empty) link | Run now saves and uses the typed link; URLs are cleaned of whitespace, zero-width characters and quotes; clearer empty-link message | Fixed, then a successful import |
| 3 | Accidentally deleted unit not re-imported ("Imported before") | By-design marker | `reimport` keys plus an **Add again** button; deleted-only matches become re-importable | Delivered; first deploy of `runReportImport` failed, then the user reported "deploy complete" |
| 4 | Deploy: "Functions deploy had errors … runReportImport(us-central1)" | Unknown; only one function failed, so likely transient | `firebase deploy --only functions:runReportImport` (`--debug` for the reason) | User: "deploy complete" |
| 5 | Browser showed `401 UNAUTHENTICATED … cloudfunctions.googleapis.com … GetFunction` | She had opened a Google REST API link in a browser; not an app error | Explained; use `firebase functions:list` | n/a |
| 6 | "Download failed: Failed to fetch. If downloads fail on a new domain, the storage bucket CORS setting needs that domain" | Bucket CORS never set (`gsutil cors set cors.json …` was never run) | Step 1: callable `setupDownloads` sets CORS automatically on the first admin download. Still failing ("deploy complete but still cant download"; the actual error text was never seen). Step 2: **server-side downloads** through `/api/download` → `downloadPhotos` (`archiver` zip) | **Delivered, unconfirmed.** Needs `cd functions; npm install` (new `archiver` dependency) and `firebase deploy --only hosting,functions` |
| 7 | Admin: "Missing or insufficient permissions" on New photo request, with all 11 angles selected (screenshot Nov 2) | `requestShapeOk` still had `d.angles.size() <= 10` from the 10-slot days | Rule raised to `<= 20`; the form and bulk import save all-ticked as `[]` | Delivered; deploy `hosting,firestore:rules` unconfirmed |
| 8 | Independent code review (Oct 27) found 11 issues | See below | Most fixed | Fixed in code |

**Review findings — fixed:**
- Follow-ups on report units couldn't be resolved, the badge didn't count them, and photos on those units couldn't be retaken.
- An email failure marked a successful import as failed.
- A partial run lost its digest emails.
- Two concurrent runs could duplicate units (now `batch.create`).
- Deleting a unit left its request stuck open.
- Warehouse-code removal didn't stick (merge kept the key).
- The cache-buster broke signed URLs.
- Report fetches had no size limit, and a `%` in the filename crashed decoding.
- Clients could set import-only fields when creating a unit.
- The header "Add photos" link didn't complete the request.
- Smaller items: marker ids containing `/`; the empty-key guard; a CSV status spelled "Post to Web"; a warehouse code with no letters or digits; Hidden clearing `listedAt`; the toast wording; the failure-email link.

**Review findings — not done:**
- Restricting `runReportImport` URLs to https only and blocking private/link-local hosts. Low risk, since it's admin-only.

**Earlier [Summary] problems:**
- A device commit failed silently and left placeholder project IDs. Since then, files are re-read and compared after every sync.
- Resend 403 because the sender domain was kcbobcat.com instead of used.kcbobcat.com.
- "nullnull" on mobile, fixed with the `mount()` helper.
- The wrong unit linked to a request by EIN, fixed by requiring explicit confirmation.
- CSS collisions.
- A race in the test-page harness.

---

## 5. Confirmed implemented vs. delivered-only vs. proposed

| Item | State |
|---|---|
| Pending/Listed rename, Mark as Listed, photo-count tags | **Confirmed** (screenshots Oct 27/28 show the nav and the Mark as Listed button) |
| Instructions page with step cards and 9 examples | **Confirmed live** (user asked to change the icon, so they saw it) |
| Traced skid-steer icon | Delivered Oct 27; not explicitly confirmed |
| Left Side / Left Rear examples (from HEIC) | **Delivered Nov 3**; deploy unconfirmed |
| Daily import (manual Run now) | **Confirmed working** Oct 27 ("working!") |
| Scheduled daily import | Deployed (in functions list); whether a morning run succeeded was never reported |
| Requests-first import, Pending/Requests merge, Deleted units, soft delete, purge | Deployed (purgeDeletedUnits is in the functions list; nav in screenshots); trash UI not explicitly confirmed |
| Settings tabs rework | Deployed (later screenshots show SETTINGS); layout not explicitly confirmed |
| Add again | Deployed after retry; use not confirmed |
| Off-report flag/delete | Deployed; behaviour not observed yet (needs time) |
| @mentions | Deployed Oct 28; user asked whether it emails (answered yes); not confirmed by use |
| `setupDownloads` (auto-CORS) | Deployed; downloads **still failed** afterwards |
| Server-side downloads (`downloadPhotos`, `/api/download`) | **Delivered only** |
| Angle limit fix | **Delivered only** |
| Making the report file private | **Proposed only** |
| Assigning photo contacts for all locations | **Proposed/user action** |
| Removing `setupDownloads`, `cors.json`, jszip | Proposed for after downloads are confirmed |
| Running and updating `tests/rules.test.js` | Proposed; never run |

---

## 6. Outstanding work and next steps (in order)

1. **Get downloads working.** Ask Erin to run this from KCBUsed:
   ```
   cd functions; npm install; cd ..
   npm run build
   firebase deploy --only hosting,functions,firestore:rules
   ```
   Then test **Download all photos** and a single photo as an admin and as an employee.
   - If it fails, get the toast text and run `firebase functions:log --only downloadPhotos`.
   - Check `firebase functions:list` includes `downloadPhotos`.
   - Note that Hosting-rewritten requests time out at 60 s.
2. **Confirm the request with all angles now saves** (Nov 2 fix), and that the Instructions page shows all 11 examples.
3. **Report privacy:** propose a random file name or basic auth for `no_price.PDF`. The importer supports `https://user:pass@host/...`, but the Zapier side would have to change.
4. **Is the 39-row report complete inventory?** If not, off-report deletion will wrongly flag units after 60 days. Check the Daily report preview's "Would flag" list.
5. **Assign photo contacts** for each location (Settings → Locations).
6. **Tidy up:** update README stale lines (the "10 standard photos" header, the "Permanently delete" row); remove the CORS fallback after downloads are confirmed; run the rules tests.
7. **Legacy unit:** the 2024 Bobcat T76 (EIN 1363155) — confirm whether it should be a request (Add again) or a unit.

---

## 7. How work was done here (repeat in the new account)

- **Delivery:** edited files were written into `C:\Users\ECharboneau\Downloads\KCBUsed` through the desktop bridge, then re-read from the device and byte-compared to confirm they landed.
  - In a new account, ask how she wants changes delivered.
  - Never overwrite `functions/.env`; she edited it herself.
- **Checking what's deployed:** `.firebase/hosting.ZGlzdA.cache` in her folder lists the asset hashes of the last hosting deploy. Compare it with `dist/assets/index-*.js` to see whether a fix actually went live.
- **Tests:** run `cd functions && node --test ../tests/report-import.test.mjs ../tests/import-parse.test.mjs` from the functions folder, so `firebase-admin` resolves. The report-import tests use a small in-memory Firestore fake (supports `set`/`update` with dotted keys and `FieldValue.delete()`, `delete`, `batch.create` failing with code 6). 10 tests passed at last run.
- **Visual checks:** a temporary Vite harness rendered single pages with mocked `data.js` and `main.js`, screenshotted with Playwright at 1200 px and 390 px. It isn't kept in the repo (`harness/` is git-ignored).
- **Images:** iPhone HEIC files were converted with `pillow-heif` (`ImageOps.exif_transpose`). Slot orientation was judged by which side of the machine faces the camera: front pointing to the frame's right means the camera sees the machine's **left** side.
- **Reply style:** say what was wrong, what changed, and what she must do, then give the exact deploy targets last.

---

## Appendix — verbatim code for the hardest-to-reconstruct pieces (copied 2026-11-04)

### Status codes and Post-to-Web detection

`functions/shared/report-parse.js`

```js
// ERP status column is cut off at 10 characters ("A Availabl", "K Post To") — show the full words where we know them.
const STATUS_WORDS = { A: 'Available', D: 'Down', M: 'Missing', I: 'In Transit', HT: 'Hold Transfer', K: 'Post to Web' };
function cleanStatus(raw) {
  const s = String(raw || '').replace(/^\*+/, '').trim();
  const m = s.match(/^([A-Z]{1,2})(?:\s+(.*))?$/);
  if (m && STATUS_WORDS[m[1]]) return STATUS_WORDS[m[1]];
  return s;
}
```

`functions/shared/report-parse.js`

```js
function statusCode(raw) {
  const t = String(raw || '').trim();
  const m = t.match(/^(\*?[A-Z]{1,2})(?:[\s–-]|$)/);
  if (m) return m[1];
  if (/^\*?\s*post to (web)?$/i.test(t)) return t.startsWith('*') ? '*K' : 'K'; // spelled out in a spreadsheet
  return '';
}
```

`functions/shared/report-parse.js`

```js
export function isPostToWeb(row) {
  return /^\*?K$/.test(row.statusCode || '');
}
```


### Report URL cleaning + fetch

`functions/report-import.js`

```js
export function cleanUrl(url) {
  return String(url || '').replace(/[\s\u200B-\u200D\uFEFF"'<>]/g, '');
}
```

`functions/report-import.js`

```js
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
```


### Off-report reconciliation (flag → warn → soft delete)

`functions/report-import.js`

```js
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
```


### "Photos ready" routing

`functions/index.js`

```js
// Photos uploaded for a request: tell whoever asked. For units from the daily report (no person asked),
// tell the admins, who download the photos and post the unit.
async function photosReady(id, req) {
  const SLOTS = 11;
  const eqSnap = req.equipmentId ? await db.doc(`equipment/${req.equipmentId}`).get() : null;
  const eq = eqSnap?.exists ? eqSnap.data() : null;
  let recipients;
  if (req.createdBy === 'daily-report') {
    const admins = await db.collection('users').where('role', '==', 'admin').where('active', '==', true).get();
    recipients = admins.docs.map((d) => ({ uid: d.id, ...d.data() }));
  } else {
    const u = await db.doc(`users/${req.createdBy}`).get();
    recipients = u.exists && u.get('active') ? [{ uid: u.id, ...u.data() }] : [];
  }
  recipients = recipients.filter((u) => u.uid !== req.completedBy && u.email && u.notifyPhotosReady !== false);
  if (!recipients.length) {
    await logSkipped({ type: 'photos-ready', ref: id, reason: 'Nobody to tell (the requester uploaded the photos themselves, is inactive, or has these emails turned off).' });
    return;
  }
  const count = eq ? Object.values(eq.photos || {}).filter(Boolean).length : 0;
  const base = APP_URL.value().replace(/\/$/, '');
  const link = req.equipmentId ? `${base}/#/equipment/${req.equipmentId}` : `${base}/#/requests`;
  await sendEmails(
    recipients.map((u) => ({
      to: [u.email],
      ...photosReadyEmail({ req, eq, recipientName: u.displayName || u.email, completedByName: req.completedByName || 'Someone', link, count, total: SLOTS }),
    })),
    { idempotencyKey: `ready/${id}/${req.completedAt?.toMillis?.() || ''}`, type: 'photos-ready', ref: id },
  );
}
```


### Scheduled daily import

`functions/index.js`

```js
// Every morning (Central time). The Zapier zap should have saved the day's report by then.
export const dailyReportImport = onSchedule(
  { schedule: '30 8 * * *', timeZone: 'America/Chicago', secrets: [RESEND_API_KEY], timeoutSeconds: 300, memory: '512MiB', retryCount: 0 },
  async () => {
    const cfg = (await db.doc('settings/reportImport').get()).data() || {};
    if (!cfg.enabled || !cfg.url) {
      logger.info('Daily report import is off or has no URL');
      return;
    }
    let result;
    try {
      const file = await fetchReport(cfg.url);
      result = await importReport({ ...file, source: 'schedule' });
    } catch (err) {
      logger.error('Daily report import failed', err);
      await recordFailure({ source: 'schedule', error: err.message });
      await emailAdminsFailure(err.message);
      return;
    }
    // The units are in; an email problem is logged in mailLog, not reported as a failed import.
    await emailImportDigests(result).catch((err) => logger.error('Import digest emails failed', err));
    await emailOffReport(result).catch((err) => logger.error('Off-report email failed', err));
  },
);
```


### Trash purge

`functions/index.js`

```js
// Deleted units stay restorable for 30 days, then go for good (onEquipmentDeleted removes photos/messages).
export const purgeDeletedUnits = onSchedule({ schedule: '15 2 * * *', timeZone: 'America/Chicago', retryCount: 0 }, async () => {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const snap = await db.collection('equipment').where('status', '==', 'deleted').get();
  const old = snap.docs.filter((d) => (d.get('deletedAt')?.toMillis?.() ?? 0) < cutoff);
  for (const d of old) await d.ref.delete();
  logger.info('Purged deleted units', { count: old.length });
});
```


### Bucket CORS setter (now fallback only)

`functions/index.js`

```js
// ---------------------------------------------------------------------------
// Admin: allow the site to download photos from Storage in the browser (bucket CORS).
// Called automatically the first time an admin's download is blocked; replaces the gsutil step.
// ---------------------------------------------------------------------------
export const setupDownloads = onCall(async (request) => {
  await requireAdmin(request);
  const project = process.env.GCLOUD_PROJECT || JSON.parse(process.env.FIREBASE_CONFIG || '{}').projectId || '';
  const origins = [...new Set([APP_URL.value().replace(/\/$/, ''), 'https://used.kcbobcat.com', project && `https://${project}.web.app`, project && `https://${project}.firebaseapp.com`, 'http://localhost:5173'].filter(Boolean))];
  try {
    await getStorage().bucket().setCorsConfiguration([{ origin: origins, method: ['GET', 'HEAD'], responseHeader: ['Content-Type', 'Content-Disposition'], maxAgeSeconds: 3600 }]);
  } catch (err) {
    logger.error('setupDownloads failed', err);
    throw new HttpsError('failed-precondition', err.message || 'Storage refused the change.');
  }
  return { ok: true, origins };
});
```


### Server-side download handler (/api/download)

`functions/downloads.js`

```js
export async function handleDownload(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'Use the Download button in the app.');
  const { token, id, slot } = req.body || {};
  let uid;
  try {
    uid = (await getAuth().verifyIdToken(String(token || ''))).uid;
  } catch {
    return fail(res, 401, 'Your sign-in expired — reload the page and try again.');
  }
  const db = getFirestore();
  const [userSnap, eqSnap] = await Promise.all([db.doc(`users/${uid}`).get(), db.doc(`equipment/${String(id || '').replace(/\//g, '')}`).get()]);
  if (!userSnap.exists || userSnap.get('active') !== true) return fail(res, 403, 'Your account isn’t active.');
  if (!eqSnap.exists) return fail(res, 404, 'That unit no longer exists.');
  const eq = eqSnap.data();
  const prefix = `equipment/${eqSnap.id}/`;
  const bucket = getStorage().bucket();
  const list = SLOTS.map(([key, label], i) => ({ key, label, i, photo: eq.photos?.[key] })).filter((s) => s.photo?.path?.startsWith(prefix) && !s.photo.path.includes('..'));

  if (slot) {
    const s = list.find((x) => x.key === slot);
    if (!s) return fail(res, 404, 'No photo for that angle.');
    const file = bucket.file(s.photo.path);
    res.set({
      'Content-Type': s.photo.contentType || 'image/jpeg',
      'Content-Disposition': `attachment; filename="${photoName(eq, s.i, s.label, s.photo)}"`,
      'Cache-Control': 'private, no-store',
    });
    file
      .createReadStream()
      .on('error', (err) => {
        logger.error('Photo download failed', err);
        if (!res.headersSent) fail(res, 500, 'Couldn’t read that photo.');
        else res.end();
      })
      .pipe(res);
    return;
  }

  if (!list.length) return fail(res, 404, 'This unit has no photos.');
  res.set({
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="${fileBase(eq)}-photos.zip"`,
    'Cache-Control': 'private, no-store',
  });
  const zip = archiver('zip', { store: true }); // JPEGs don't compress; storing is fastest
  zip.on('error', (err) => {
    logger.error('Zip failed', err);
    res.end();
  });
  zip.pipe(res);
  for (const s of list) zip.append(bucket.file(s.photo.path).createReadStream(), { name: photoName(eq, s.i, s.label, s.photo) });
  await zip.finalize();
}
```


### Soft delete / restore

`src/data.js`

```js
export function deleteEquipment(id, fromStatus) {
  return updateEquipment(id, {
    status: 'deleted',
    deletedAt: serverTimestamp(),
    deletedByEmail: auth.currentUser.email,
    deletedFromStatus: fromStatus === 'deleted' ? 'active' : fromStatus || 'active',
    deletedReason: null,
  });
}
```

`src/data.js`

```js
export function restoreEquipment(eq) {
  const patch = {
    status: eq.deletedFromStatus || 'active',
    deletedAt: deleteField(),
    deletedByEmail: deleteField(),
    deletedFromStatus: deleteField(),
    deletedReason: deleteField(),
  };
  if (eq.offReport) Object.assign(patch, { offReport: deleteField(), offReportKeep: true, offReportKeepBy: auth.currentUser.email });
  return updateEquipment(eq.id, patch);
}
```


### Pending | Requests switcher

`src/main.js`

```js
// Pending and Requests share one menu item; these tabs switch between them.
function workTabs(active) {
  const pendingN = h('span', { class: 'work-count' });
  const reqN = h('span', { class: 'work-count' });
  const update = (s) => {
    pendingN.textContent = String((s.equipment || []).filter((e) => e.status !== 'archived').length);
    reqN.textContent = String((s.requests || []).filter((r) => r.status !== 'done').length);
  };
  update(store.get());
  const prev = shellUnsub;
  const unsub = store.subscribe(update);
  shellUnsub = () => {
    prev?.();
    unsub();
  };
  return h(
    'nav',
    { class: 'work-tabs', 'aria-label': 'Pending and requests' },
    h('a', { href: '#/', class: active === 'pending' ? 'active' : '', 'aria-current': active === 'pending' ? 'page' : null }, h('span', {}, 'Pending'), pendingN, h('span', { class: 'work-hint' }, 'Photos in, waiting to be listed')),
    h('a', { href: '#/requests', class: active === 'requests' ? 'active' : '', 'aria-current': active === 'requests' ? 'page' : null }, h('span', {}, 'Requests'), reqN, h('span', { class: 'work-hint' }, 'Units that still need photos')),
  );
}
```


### "Deleted units" footer link

`src/pages/deleted.js`

```js
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
```


### @mention picker

`src/pages/messages.js`

```js
function mentionBox(textarea) {
  const pop = h('ul', { class: 'mention-pop', role: 'listbox', hidden: true });
  const picked = new Map(); // "@Name" → uid
  let matches = [];
  let sel = 0;
  let start = -1;

  const people = () => (store.get().users || []).filter((u) => u.active && u.uid !== store.get().user?.uid).sort((a, b) => pname(a).localeCompare(pname(b)));

  function close() {
    pop.hidden = true;
    start = -1;
  }
  function choose(u) {
    const tag = `@${pname(u)}`;
    const v = textarea.value;
    const caret = textarea.selectionStart;
    textarea.value = `${v.slice(0, start)}${tag} ${v.slice(caret)}`;
    const pos = start + tag.length + 1;
    textarea.setSelectionRange(pos, pos);
    picked.set(tag, u.uid);
    close();
    textarea.focus();
  }
  function draw() {
    mount(
      clear(pop),
      ...matches.map((u, i) =>
        h(
          'li',
          { role: 'option', class: i === sel ? 'active' : '', 'aria-selected': String(i === sel), onmousedown: (e) => { e.preventDefault(); choose(u); } },
          h('strong', {}, pname(u)),
          h('span', { class: 'muted small' }, ` ${u.email}${u.role === 'viewer' ? ' · view only' : ''}`),
        ),
      ),
    );
    pop.hidden = !matches.length;
  }
  function onInput() {
    const caret = textarea.selectionStart;
    const before = textarea.value.slice(0, caret);
    const m = before.match(/(^|\s)@([^@\n]{0,30})$/);
    if (!m) return close();
    const q = m[2].toLowerCase();
    // Stop once the text after @ can't be the start of any name (e.g. a normal sentence after an email-ish @).
    matches = people().filter((u) => pname(u).toLowerCase().startsWith(q) || pname(u).toLowerCase().split(/\s+/).some((w) => w.startsWith(q)) || u.email.toLowerCase().startsWith(q)).slice(0, 8);
    if (!matches.length) return close();
    start = caret - m[2].length - 1;
    sel = 0;
    draw();
  }
  textarea.addEventListener('input', onInput);
  textarea.addEventListener('click', onInput);
  textarea.addEventListener('blur', () => setTimeout(close, 120));
  textarea.addEventListener('keydown', (e) => {
    if (pop.hidden) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % matches.length; draw(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + matches.length) % matches.length; draw(); }
    else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); choose(matches[sel]); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  });

  return {
    pop,
    mentioned: () => [...picked].filter(([tag]) => textarea.value.includes(tag)).map(([, uid]) => uid),
    reset: () => picked.clear(),
    insertAt: () => {
      // "@" button: start a mention at the caret.
      const caret = textarea.selectionStart ?? textarea.value.length;
      const v = textarea.value;
      const pre = caret > 0 && !/\s/.test(v[caret - 1]) ? ' @' : '@';
      textarea.value = v.slice(0, caret) + pre + v.slice(caret);
      textarea.focus();
      textarea.setSelectionRange(caret + pre.length, caret + pre.length);
      onInput();
    },
  };
}
```

`src/pages/messages.js`

```js
function withMentions(text, mentions = []) {
  const users = store.get().users || [];
  const tags = mentions.map((uid) => users.find((u) => u.uid === uid)).filter(Boolean).map((u) => `@${pname(u)}`).sort((a, b) => b.length - a.length);
  if (!tags.length) return text;
  const re = new RegExp(`(${tags.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
  return text.split(re).map((part) => (tags.includes(part) ? h('span', { class: 'mention' }, part) : part));
}
```


### New-unit email skip for report requests
`functions/index.js` (inside `onEquipmentCreated`)

```js
  if (eq.importBatch) return;
  // Answering a photo request from the daily report → the admins get a "Photos ready" email instead (onRequestWritten).
  if (eq.requestId) {
    const req = await db.doc(`requests/${eq.requestId}`).get();
    if (req.get('createdBy') === 'daily-report') return;
  }
```


### Report code from a location name
`src/pages/settings.js`

```js
const autoCode = (w) => w.match(/[-–—]\s*([A-Z0-9]{1,6})\s*$/i)?.[1]?.toUpperCase() || '';
```
