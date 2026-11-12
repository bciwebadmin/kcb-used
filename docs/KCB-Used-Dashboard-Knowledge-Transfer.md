**PROJECT KNOWLEDGE TRANSFER DOCUMENT**

**Project:** K.C. Bobcat Used Equipment Photo Dashboard (used.kcbobcat.com) — Claude project "KCB Used Image Dashboard"

**Prepared For:** Migration to Claude Teams

**Knowledge Cutoff:** 2026-11-04

**Migration Status:** Partial → Complete once the companion file `KCB-Used-Dashboard-Source-Code.md` (full source, generated alongside this document) is uploaded too. See §20 for what is not verified.

---

## How this document was produced (read first)

- **Sources actually used:** (1) the live working copy of the source code in this session (every file under the project folder, read directly while writing this); (2) the project README / setup doc (`claude/used-equipment-setup.md` in the old Claude project, which mirrors the repo `README.md`); (3) a compressed summary of the earliest conversation (Oct 21–27, 2026), which was cut off by a context limit — earlier turns are only known in summarized form; (4) the full text of the conversation from Oct 27 to Nov 4, 2026; (5) two short saved-memory notes (brand colors, project basics).
- **Labels used below:** **[Verified]** = read in the current code or seen in a tool result; **[Stated]** = the user said it; **[Summary]** = known only from the compressed history of the first week; **[Unverified]** = changed in code and handed over, but the user never confirmed it worked in production; **[Recommendation]** = my suggestion, not a decision.
- Code shown here is copied from the current source, not recalled. The complete source is in the companion file.

---

## 1. PROJECT IDENTITY & EXECUTIVE OVERVIEW

| Item | Value |
|---|---|
| Name | Used Equipment Dashboard ("KCB Used Image Dashboard") |
| Organization | K.C. Bobcat (Kansas City–area Bobcat equipment dealer; part of the Berry Companies group — the daily report is hosted on berrycompaniesinc.com) |
| Production URL | https://used.kcbobcat.com **[Verified: APP_URL, custom domain]** |
| Firebase project ID | `kcb-used` **[Verified]** (also reachable at kcb-used.web.app / kcb-used.firebaseapp.com) |
| Owner / builder | Erin (web operations); works on Windows, PowerShell, project folder `C:\Users\ECharboneau\Downloads\KCBUsed` **[Verified]** |
| Primary admins/users | Matt (Matthew Chapman) and Lesley (also spelled "Leslie" by the user) — admins who post units to the website and Machinery Trader **[Stated]**; branch staff ("photo contacts", e.g. Hayden Jeffryes seen as an assignee) take photos; sales reps are view-only |
| Stage | **In production, actively iterated.** Feature requests arrive from Matt's review and from users in the field. |

**Purpose.** An internal web app where branch employees photograph used machines in a standard set of angles and upload them; admins download the photos, post the unit on kcbobcat.com and Machinery Trader, then mark it "Listed". Sales reps can see photos of everything.

**Business objectives [Stated, Oct 27 review by Matt]:**
1. One place for used-unit photos with a consistent shot list and quality standard (Instructions page).
2. Automatically know which units need photos: the ERP's daily equipment report lists units with status "K – Post to Web"; those become photo requests automatically.
3. Route each request to the right person at the right branch, email them, and email admins when photos are in.
4. Track Pending → Listed; clean up units after they sell (Matt: "delete listings 60 days after sale; this process may change later").

**Key deliverables (all built):** login + roles; submission form with 11 photo slots; Pending/Requests/Listed views; photo requests with assignment and emails; daily report import (Zapier → web URL → scheduled function); messages with follow-up flags and @-mentions; Instructions page with example photos; Settings (locations, daily report, email); user management; deleted-units trash with restore.

**Success looks like:** every "Post to Web" unit gets photographed and listed without manual chasing; admins get "Photos ready" emails; downloads work for everyone; no duplicate or resurrected units.

---

## 2. COMPANY, BRAND & BUSINESS CONTEXT

- **Brand:** K.C. Bobcat. Main site kcbobcat.com **[Stated]**. Tools should use the K.C. Bobcat logo (`public/kc-bobcat-logo.png`) and match kcbobcat.com.
- **Brand colors [Stated, Verified in `src/styles.css`]:** orange `#f30` (CSS `--brand: #ff3300`, darker `--brand-dark: #cc2900`, tint `--brand-tint: #fff0eb`), grey `#666` (`--muted: #666666`), black `#000`.
- **Font [Verified]:** Adobe Fonts kit `hvz7keh`, family `'din-2014'` (fallbacks Barlow, Segoe UI, system-ui). The kit must have `used.kcbobcat.com` added as an allowed domain or it falls back to system fonts.
- **Emails** use the same palette: white header with orange bottom border, logo at `${APP_URL}/kc-bobcat-logo.png`, orange CTA buttons.
- **Locations (warehouses) currently configured [Verified from a screenshot, Oct 27]:** Blue Springs – 18, Joplin – 73, Olathe – 19, Sedalia – W5, Springfield– 20 (note: no space before the dash in the stored name), St Joe – 76, Tracy – 21. The number is the ERP warehouse code.
- **ERP:** e-Emphasys. The report used is "Equipment List" (`no_price.PDF`).
- **Photo standards (Instructions page; text from Matt, styled by the user's mockup) [Stated]:**
  1. *Let It Stand Alone* — pull the unit out and shoot it by itself; no other units in frame; "it's the star".
  2. *Clean It First* — dirty units are a direct reflection of KC Bobcat.
  3. *Stage It at Our Store* — in front of the building or sign, KC Bobcat in the background.
- **Terminology the users use:** "Pending" (photos in, waiting to be posted), "Listed" (posted), "Requests" (photos needed), "photo contact" (per-branch person), "EIN" (equipment ID number in the ERP), "Post to Web" (ERP status K).
- **Business rules:** costs/prices from the report are never imported; viewers (sales reps) must not see private comments; units deleted on purpose must not come back from the next day's report.

---

## 3. TECHNICAL ARCHITECTURE & TECHNOLOGY STACK

```
Browser (Vite-built SPA, vanilla JS, hash routes)
  ├─ Firebase Auth (email/password; no self sign-up)
  ├─ Firestore (realtime listeners for equipment, requests, users, settings)
  ├─ Cloud Storage (photo uploads, create-only)
  ├─ Callable functions (user admin, report import, test email, setupDownloads)
  └─ POST /api/download  ──Hosting rewrite──▶ downloadPhotos (HTTP function, streams photo/zip)

Cloud Functions v2 (Node 22, us-central1)
  ├─ Firestore triggers → emails via Resend REST API (+ mailLog audit)
  ├─ dailyReportImport (08:30 America/Chicago) → fetch report URL → parse PDF → requests
  └─ purgeDeletedUnits (02:15 America/Chicago) → hard-delete trash older than 30 days

Zapier (owned by the user): report email attachment → FTP to web server →
  https://www.berrycompaniesinc.com/instockinventory/no_price.PDF
```

| Technology | Version / setting [Verified] | Use & notes |
|---|---|---|
| Vite | ^8.3.5 | Build tool. `npm run build` → `dist/`. Single main bundle ~745 kB (size warning is harmless). |
| Vanilla JS | ES modules | No framework. DOM built with helper `h()` in `src/ui.js`. Hash routing in `src/main.js`. |
| Firebase JS SDK | ^13.1.0 (modular) | Auth, Firestore, Storage, Functions. |
| pdfjs-dist | ^5.7.284 (browser and functions) | Browser: manual bulk import parsing (lazy-loaded, worker via `?url`). Functions: `pdfjs-dist/legacy/build/pdf.mjs` for the daily report. |
| jszip | ^3.10.2 | No longer used by downloads (server zips now); still a dependency. |
| firebase-functions | ^7.4.0 (v2 API) | All functions are v2. |
| firebase-admin | ^14.5.0 | Server writes bypass rules. |
| archiver | ^7.0.1 | Server-side zip streaming in `functions/downloads.js`. |
| Node | 22 (`engines.node`) | Functions runtime. |
| Resend | REST API `https://api.resend.com` | All email. Secret `RESEND_API_KEY`. Sender must be on verified domain **used.kcbobcat.com**. |
| Firebase Hosting | `public: dist`, SPA rewrite `** → /index.html`, plus `/api/download → downloadPhotos` | Security headers set in `firebase.json`; `/assets/**` immutable cache; everything else `no-cache`. |
| GitHub Actions | `.github/workflows/firebase-hosting-merge.yml`, `...-pull-request.yml` | Deploy **hosting only** on push to `main` (secret `FIREBASE_SERVICE_ACCOUNT`, variable `FIREBASE_PROJECT_ID`). Repo name/URL not known in this context. |
| Firebase plan | Blaze (required for functions/scheduler) | Cloud Scheduler is used by the two scheduled functions. |

**Environment / config [Verified, secrets omitted]:**
- `functions/.env`: `APP_URL=https://used.kcbobcat.com` · `MAIL_FROM=Used Equipment <used-equipment@used.kcbobcat.com>`
- Secret: `firebase functions:secrets:set RESEND_API_KEY` (never in repo). Local emulator: `functions/.secret.local` (git-ignored; example file provided).
- `src/firebase-config.js`: web config for `kcb-used` (public values; `storageBucket: 'kcb-used.firebasestorage.app'`), `FUNCTIONS_REGION = 'us-central1'`.
- `src/firebase.js`: `VITE_USE_EMULATORS=true` switches to emulators (demo project `demo-used-equipment`).

---

## 4. COMPLETE PROJECT STRUCTURE [Verified]

```
KCBUsed/
├─ index.html                      SPA shell (Adobe Fonts kit, favicons)
├─ vite.config.js
├─ firebase.json / .firebaserc     hosting (+ /api/download rewrite), rules, functions, emulators; default project kcb-used
├─ firestore.rules  storage.rules  firestore.indexes.json (empty)
├─ cors.json                       legacy bucket CORS (origins used.kcbobcat.com, localhost:5173)
├─ README.md                       setup + feature reference (mirrors the Claude project doc)
├─ public/
│  ├─ kc-bobcat-logo.png, favicon*, icon-192/512, apple-touch-icon
│  └─ examples/<slotKey>.jpg (900px) + <slotKey>-sm.jpg (400px) — all 11 angles
├─ src/
│  ├─ main.js        auth bootstrap, data listeners, routes, shell/nav, Pending|Requests switcher (workTabs), leave guard
│  ├─ config.js      PHOTO_SLOTS, EXAMPLE_PHOTOS, STATUSES, ROLES, CONDITIONS, OFF_REPORT_DAYS, THUMB_MAX…
│  ├─ data.js        every Firestore/Storage/callable call (see §6)
│  ├─ store.js       tiny global store {user, profile, equipment, trash, requests, users, settings}
│  ├─ ui.js          h(), mount(), clear(), icon(), toast(), confirmDialog(), pager(), passwordInput()…
│  ├─ firebase.js / firebase-config.js
│  ├─ import-parse.js  re-exports functions/shared/report-parse.js (shared parser)
│  ├─ styles.css
│  └─ pages/
│     inventory.js (Pending/Listed tables) · detail.js (unit page) · submit.js (add/edit/photos)
│     requests.js (Requests list + New request) · import-requests.js (manual bulk import)
│     messages.js (thread, follow-ups, @mentions) · instructions.js · deleted.js (trash)
│     settings.js (tabs: Locations | Daily report | Email) · report-import.js (Daily report tab)
│     users.js · account.js · notifications.js · login.js · first-password.js
├─ functions/
│  ├─ index.js          all exported functions
│  ├─ report-import.js  daily import + off-report reconciliation
│  ├─ shared/report-parse.js  PDF/CSV/text parser (also used by the browser)
│  ├─ downloads.js      /api/download handler (photo or zip)
│  ├─ emails.js         HTML/text templates
│  ├─ mailer.js         Resend sender + mailLog
│  ├─ scripts/create-admin.mjs  bootstrap first admin (needs gcloud ADC)
│  └─ .env, .secret.local.example
└─ tests/
   import-parse.test.mjs · report-import.test.mjs (in-memory Firestore fake) · rules.test.js (emulator; never run here)
```

**Routes (`src/main.js`) [Verified]:**

| Hash route | Page | Notes |
|---|---|---|
| `#/` | Pending (inventory, `archive:false`) | shows Pending/Requests switcher |
| `#/requests` | Requests list | shows switcher; nav item "Pending" stays active |
| `#/requests/new`, `#/requests/import` | New request / manual bulk import | |
| `#/listed` (alias `#/archive`) | Listed | |
| `#/new(?request=ID)` | Add equipment (prefilled from request) | edit roles only |
| `#/equipment/ID(?messages)` | Unit detail | |
| `#/equipment/ID/edit(?request=ID)` | Edit / add photos | |
| `#/instructions` | Instructions | |
| `#/deleted` | Deleted units | admin |
| `#/admin/users` | Users | admin |
| `#/admin/settings(/locations\|report\|email)`, `#/admin/report` (old link) | Settings tabs | admin |
| `#/account` | My account (password, notifications) | |

Main nav: **Pending · Listed · Instructions** (+ Users, Settings for admins), "Add" dropdown (Equipment listing / Photo request / Import photo requests), user menu.

---

## 5. DATA STRUCTURES, SCHEMAS & FIELD DEFINITIONS [Verified]

**Firestore collections**

| Path | Fields | Who writes |
|---|---|---|
| `users/{uid}` | `email, displayName, role ('admin'\|'employee'\|'viewer'), active, notifyNewUnits ('all'\|'locations'\|'none'), notifyLocations[], notifyAssigned, notifyMessages, notifyPhotosReady, notifyUpdatedAt, mustChangePassword` | role/active only via functions; notify* by self or admin; `mustChangePassword` cleared by self |
| `equipment/{id}` | `make, model, year, hours, warehouse, ein, serial, serialKey, condition, price, attachments, comments, status ('active'=Pending\|'hidden'\|'archived'=Listed\|'deleted'), photos{slotKey:{path,url,thumbPath,thumbUrl,uploadedBy,…}}, createdBy, createdByEmail, createdByName, createdAt, updatedAt, updatedByEmail, listedAt, listedByEmail, followUp{open,text,byId,byName,at,messageId,resolved…}, offReport{since,sinceReport,warned}, offReportKeep, offReportKeepBy, deletedAt, deletedByEmail, deletedFromStatus, deletedReason, requestId` (legacy report units also `importBatch, reportStatus, reportStatusCode, reportDescription`) | clients per rules; admin-only fields protected |
| `equipment/{id}/messages/{mid}` | `text, kind ('note'\|'action'\|'resolved'), mentions[uid] (≤25), authorId, authorName, authorEmail, createdAt` | any active user |
| `equipment/{id}/private/notes` | `text, updatedAt, updatedByEmail` | admins/employees; hidden from viewers |
| `requests/{id}` | `make, model, serial, serialKey, ein, warehouse, warehouseCode, year, hours, angles[] (empty = all), dueDate 'YYYY-MM-DD'\|null, notes, source, status ('open'\|'done'), equipmentId\|null, assignedTo, assignedToName, assignedBy, createdBy ('daily-report' for imports), createdByEmail, createdByName, completedAt, completedBy ('listed'\|'deleted' when closed by system), completedByName, importBatch, reportStatus, reportStatusCode, reportDescription, createdAt, updatedAt` | |
| `requestImports/{id}` | `count, assignedTo, createdBy, createdByName, createdAt` | manual bulk import trigger doc |
| `settings/app` | `warehouses[]` | admin |
| `settings/reportImport` (admin-read only) | `url, enabled, contacts{warehouseName: uid\|null}, codes{CODE: warehouseName}, lastRun{id,ok,at,created,reportDate,error}, lastCleanRows, lastCleanDate, updatedAt, updatedByEmail` | admin / functions |
| `reportRuns/{id}` | `source ('schedule'\|'manual'\|'upload'), byUid, byName, fileName, reportDate, rowsFound, postToWeb, created[], skipped[] (with reason, key, canReimport), unmapped[], errors[], offReport{flagged,cleared,warn,deleted,requestsRemoved\|skippedReason}, ok, error, at` | functions only |
| `reportImports/ein-{EIN}` or `serial-{SERIAL}` (URI-encoded) | `ein, serial, requestId\|equipmentId, runId, existing?, at` | functions only; the "never import twice" marker |
| `mailLog/{id}` | `type, ref, to[], subject, ok, skipped, resendIds[], error, createdAt` | functions only; shown in Settings → Email |

**Storage:** `equipment/{equipmentId}/{slot}-{timestamp}.jpg` and `-thumb.jpg` (thumb 480 px generated in browser). Rules: read if active; **create only** (no overwrite) for admin/employee, < 30 MB, `image/*`; delete admin only.

**Photo slots (keys are stored — never rename) [Verified `src/config.js`]:**
`rightSide, rightSideRear, rearEngine, leftRear, leftSide, leftFront, front, rightFront, interior, hourMeter, serialPlate` (11; table thumbnail `COVER_SLOT = 'rightFront'`). The same list is hard-coded in three more places that must stay in sync: `firestore.rules` (`onlyAddsPhotos`), `functions/emails.js` (`SLOT_ORDER`, different display order), `functions/downloads.js` (`SLOTS`, same order as config).

**Daily report format (e-Emphasys "Equipment List as of 27 OCT 2026", PDF) [Verified]:**
Columns: `Whse  EIN  Year  Product Number  Prod Desc  Serial Numbers  Pline  Acquired  Hours  Curr_Cost  Adv_Price  Status`. Status is truncated to 10 chars; codes: `A Availabl`→Available, `D`→Down, `M`→Missing, `I`→In Transit, `HT`→Hold Transfer, `K Post To`→**Post to Web**; a leading `*` is a separate ERP flag (`*K` also counts). Hours `9999` = unknown. Product numbers of 6+ digits are attachments (e.g. buckets). Make defaults to Bobcat. Cost/price are parsed past but never stored.

Row regex (in `functions/shared/report-parse.js`):
```js
const ROW = /^(\S{1,4})\s+(\d{5,9})\s+(?:(\d{4})\s+)?(\S+)\s+(.+?)\s+(\S+)\s+(\d{5})\s+(\d{2}\/\d{2}\/\d{2,4})\s*(.*)$/;
export function isPostToWeb(row) { return /^\*?K$/.test(row.statusCode || ''); }
```
CSV fallback accepts header names like Whse/Warehouse/Branch, EIN/Stock #, Year, Make, Model/Product Number, Prod Desc, Serial, Hours, Status, Notes.

**Warehouse matching:** report code → explicit `settings/reportImport.codes[code]` → else a warehouse whose name contains the code as its own token (`matchWarehouse`, e.g. "20" ↔ "Springfield– 20") → else the raw code.

---

## 6. EXISTING CUSTOM CODE & IMPLEMENTATIONS

> Full source of every file is in the companion `KCB-Used-Dashboard-Source-Code.md`. Below: what each piece does, plus the most important snippets copied verbatim.

### 6.1 Roles & security rules
- **Purpose:** enforce admin / employee / viewer; protect system fields; allow anyone active to *add* photos (fulfilling requests) without editing details.
- **Location:** `firestore.rules`, `storage.rules`. **Status:** deployed. **Known issue:** `tests/rules.test.js` was written early and has **never been run** (emulators couldn't download in the build sandbox); it likely doesn't cover later changes.
- Key rules: only admins change `status`; creators can edit their own unit; `onlyAddsPhotos(id, allowReplace)` lets any editor fill empty slots (and replace on legacy `createdBy=='daily-report'` units); `followUp`, listing, off-report, deleted and import fields are admin/function-only; `settings/reportImport` is admin-read only because the URL points at a file with costs; `requests.angles.size() <= 20` (was 10 — see §10).

### 6.2 Unit workflow: Pending → Listed → Deleted
- `setStatus(id, status)` (`src/data.js`) records `listedAt/listedByEmail` when Listed; Hidden keeps listing history.
- Detail page: admin **Mark as Listed** (confirms if < 11 photos) / **Move back to Pending**; status select (Pending/Hidden/Listed).
- **Soft delete [Verified code]:** `deleteEquipment(id, fromStatus)` sets `status:'deleted', deletedAt, deletedByEmail, deletedFromStatus`. `restoreEquipment(eq)` puts it back (and, if it was auto-deleted for being off the report, marks it Keep). `purgeEquipment(id)` hard-deletes. `main.js` splits the listener: `equipment` (non-deleted) vs `trash` (deleted) in the store, so deleted units are invisible everywhere except `#/deleted`.
- Functions: `onEquipmentUpdated` deletes replaced photo files; on status → archived/deleted it closes that unit's open requests (`completedBy: 'listed'|'deleted'`, no "photos ready" email). `onEquipmentDeleted` deletes the Storage folder, messages, private notes and open requests. `purgeDeletedUnits` hard-deletes trash older than 30 days.

### 6.3 Photo requests
- Created by hand (`createRequest`), by manual bulk import (`createRequestsBatch`, chunks of 10 because rules do lookups; then a `requestImports` doc triggers one digest email), or by the daily import.
- Linking to an existing unit only when the user confirms (an early bug auto-linked the wrong unit by EIN).
- Fulfilling: linked → `#/equipment/ID/edit?request=ID` (photos-only mode for non-owners); unlinked → `#/new?request=ID` prefilled; saving calls `completeRequest(id, equipmentId)`. New units created from a request carry `requestId`.
- Ticking every angle saves `angles: []` (= all angles) — see §10.

### 6.4 Daily report import (most complex piece)
- **Location:** `functions/report-import.js`, `functions/index.js` (`dailyReportImport`, `runReportImport`, `emailImportDigests`, `emailOffReport`, `emailAdminsFailure`), UI `src/pages/report-import.js` (Settings → Daily report).
- **Flow:** `fetchReport(url)` (cleans pasted URL, supports `https://user:pass@host` basic auth, cache-buster `_=` except on signed URLs, 15 MB streaming cap, rejects HTML) → `parseReportBytes` (PDF via pdf.js legacy → `linesFromPdfItems` → `parseReportText`) → for each Post-to-Web row: skip if marker exists ("Imported before", re-importable), if a live unit has the EIN/serial ("Already in the app"), if only a deleted unit has it ("In Deleted units — restore it, or add again"), or if an open request exists → else create a **request only** (no unit) assigned via `pickAssignee` → marker created with `batch.create` (fails if a concurrent run beat it) → per-row try/catch so one bad row doesn't lose the run → `reconcileOffReport` → `reportRuns` doc → one digest email per assignee.
- `pickAssignee` (verbatim):
```js
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
```
- **Off-report reconciliation** (`reconcileOffReport`): compares every non-deleted unit with *all* report rows (any status). Not on report → `offReport{since}` tag; back on → cleared; 7 days before 60 → admins warned once; at 60 days → soft-deleted with `deletedReason: 'Not on the equipment report for 60 days'`; `offReportKeep` units are never touched; units with no EIN and no real serial ignored; open **daily-report** requests for units no longer on the report are deleted. **Safety:** skipped if < 10 rows, < 60 % of last clean row count, or the report date is older than one already processed; uploaded files never change flags. Constants `OFF_REPORT_DAYS = 60` (must match `src/config.js`), `WARN_DAYS = 7`.
- `runReportImport` callable (admin): `{ url? | fileBase64+fileName, dryRun?, reimport?: ['ein:123'|'serial:ABC'] }`. UI buttons: **Test link** (dry run), **Run import now** (saves the typed link first, then runs), **Upload a report file instead** (dry run then confirm), **Add again** on re-importable skipped rows.
- Schedule: `'30 8 * * *'`, `timeZone: 'America/Chicago'`, 512 MiB, 300 s, `retryCount: 0`. Email failures are logged, never mark the import as failed.
- Tests: `npm run test:import` (10 passing at last run) — includes the real-PDF test if `tests/fixtures/equipment-list.pdf` exists (git-ignored, contains costs).

### 6.5 Downloads
- **Current approach [Verified code, Unverified in production]:** browser posts a hidden form (`token` = Firebase ID token, `id`, optional `slot`) into a hidden iframe at `/api/download`; Hosting rewrites to `downloadPhotos` (`functions/downloads.js`), which verifies the token, checks the user is active, and streams either one photo or a zip (`archiver`, store mode) with `Content-Disposition: attachment`. File names: `<EIN or serial>-<Make>-<Model>_NN-<Angle>.jpg`, zip `<base>-photos.zip`. Client code (`src/data.js`):
```js
async function postDownload(fields) {
  const token = await auth.currentUser.getIdToken();
  const name = `dl-${Date.now()}`;
  const frame = h('iframe', { name, hidden: true, title: 'download' });
  const form = h('form', { method: 'POST', action: '/api/download', target: name, hidden: true });
  for (const [k, v] of Object.entries({ token, ...fields })) if (v) form.append(h('input', { type: 'hidden', name: k, value: v }));
  document.body.append(frame, form);
  return new Promise((resolve, reject) => {
    // A file download never "loads" the frame; an error page does.
    const done = setTimeout(() => cleanup(resolve), 4000);
    frame.addEventListener('load', () => { /* reads error text → reject */ });
    form.submit();
    function cleanup(next) { setTimeout(() => { frame.remove(); form.remove(); }, 60000); next(); }
  });
}
```
- `withDownloadFix` (detail page) + callable `setupDownloads` (sets bucket CORS) remain from the previous approach; now effectively unused but harmless.

### 6.6 Messages, follow-ups and @mentions
- Thread per unit; `kind:'action'` sets `followUp.open` (via `onMessageCreated`, admin SDK), `kind:'resolved'` clears it. Who may resolve: submitter, admin, or any editor on legacy daily-report units.
- **@mentions [Verified, tested in a harness]:** `mentionBox(textarea)` in `src/pages/messages.js` — typing `@` lists active users (excluding self), arrow/Enter/Tab to pick, inserts `@Display Name `; an "@ Tag" button inserts `@`. Stored as `mentions: [uid]`. Tagged users are **always** emailed ("X tagged you: …"), even with message emails off. Names typed without picking are not mentions.
- Recipients otherwise: submitter + everyone who posted + assignees/completers of requests linked to the unit, minus the author, respecting `notifyMessages`.

### 6.7 Emails (`functions/emails.js`, sent by `functions/mailer.js`)
Templates: `newSubmissionEmail`, `welcomeEmail` (temp password), `passwordEmail`, `assignmentEmail`, `messageEmail` (+mentioned), `importDigestEmail`, `photosReadyEmail`, `offReportEmail`, `reportFailedEmail`. `sendEmails` uses `/emails` or `/emails/batch` (one email per recipient, max 100/batch), `Idempotency-Key` headers, and logs every attempt to `mailLog`. Notable routing: units created from a daily-report request skip the new-unit email (admins get "Photos ready" instead); "Photos ready" goes to the requester, or to all active admins for `createdBy:'daily-report'` requests, respecting `notifyPhotosReady`.

### 6.8 Users & accounts
Callables: `createUser` (temp password typed or generated like `Kc7m-Pw4x-R9tQ`, emailed; `mustChangePassword`), `updateUser` (role/active; can't remove last admin or demote self), `adminPassword` (set/generate/link), `deleteUser` (unassigns open requests; can't delete self/last admin), `sendTestEmail`. First admin: `functions/scripts/create-admin.mjs`.

### 6.9 Settings (`src/pages/settings.js`) — three tabs
*Locations*: one table per warehouse — auto report code from the name + extra codes (`saveReportCodes` replaces the whole map, because merge can't remove keys), photo contact select (`Auto · <name>` fallback or "Unassigned" in red), new-unit email people (chips + add), remove location; add location in header. *Daily report*: link, auto toggle, Test/Run/Upload, "How it works", recent imports (scroll box). *Email*: test email + activity log.

### 6.10 Instructions page (`src/pages/instructions.js`)
Three step cards with inline SVG icons; the skid-steer glyph is a vector traced from the user-supplied PNG (`SKID_PATH`, drawn with `skid(x, y, size)`); 11-shot grid with example photos (`public/examples`), click to enlarge. Examples also appear faded behind empty slots on the upload form.

### 6.11 UI helpers (`src/ui.js`)
`h(tag, attrs, ...children)` element builder; `mount()` is null-safe (fixes the "nullnull" bug — never use native `append(null)`); `pager(state, onChange, {noun, scrollTo})` 20 per page; `confirmDialog`, `toast`, `icon(name)`, `passwordInput` (eye toggle).

---

## 7. PROJECT HISTORY & MAJOR DECISIONS

| Date | Event / decision | Why | Still in effect |
|---|---|---|---|
| Oct 21 [Summary] | Built on Firebase + Vite vanilla JS, GitHub-connected; email+password login; admins managed in-app; fields Year, Hours, Price, Condition, Attachments | User's choices | Yes |
| Oct 21–22 [Summary] | Email via **Resend** (user's choice) instead of Firebase extension; sender must be `used.kcbobcat.com` (key restricted to that domain) | 403 "API key not authorized for this domain" when sender was kcbobcat.com | Yes |
| Oct 22 [Summary] | Photos **optional** ("Sometimes they will not take pictures from all angles") | Field reality | Yes (`ALL_PHOTOS_REQUIRED = false`) |
| Oct 22–26 [Summary] | Added: photo requests (to-do), assign-to with email, branch notifications (2–3 per warehouse), viewer role for sales reps, messages + follow-up, public/private comments, initial password emails, hamburger menu, mobile tables, Add dropdown, manual bulk import from PDF/CSV, 20-per-page pagination, delete users | User requests | Yes |
| Oct 22 [Summary] | Request→unit linking requires explicit confirmation | Auto-match by EIN linked the wrong unit | Yes |
| Oct 27 | Matt's review: rename Inventory→**Pending**, Archive→**Listed** (status keys unchanged: active/archived); Mark as Listed; delete from both tabs; Instructions page | Matches their workflow | Yes |
| Oct 27 | 11th slot added — named **Serial Plate** (not "Additional") | User's example photos included a serial plate | Yes |
| Oct 27 | Daily import automated: **Zapier → web server → fixed URL → scheduled function** | User: "will be done with zapier: email attachment > ftp to web server to get url" | Yes |
| Oct 27 | Initially imports created Pending units + requests; **changed same day to requests only** — unit is created when photos are uploaded | User: "those should go into the Requests tab and then once uploaded moved to Pending" | Yes |
| Oct 27 | Units off the report: **flag, then delete after 60 days**, admin "Keep", warn 7 days before | User chose "flag and delete" over hide-only/flag-only | Yes |
| Oct 27 | Deletion became **soft delete** with a Deleted units page (link under the lists, not in the menu) + 30-day purge | User asked for a place to see deleted units | Yes |
| Oct 27 | **Pending and Requests merged** under one menu item with two tabs | User: two tabs — listings with images waiting (Pending) and all requests | Yes |
| Oct 27 | Settings reorganized into tabs with one Locations table | "Boxes all different sizes and a lot of scrolling" | Yes |
| Oct 27 | Report "never re-import" markers; then **"Add again"** override | Accidental delete couldn't be re-imported | Yes |
| Oct 28 | Downloads: CORS failure → auto-CORS (`setupDownloads`) → still failing → **server-side downloads via `/api/download`** | Remove the bucket-CORS dependency entirely | Yes (unverified) |
| Oct 28 | **@mentions** in messages | Notify Lesley a unit is ready / ask submitters for help | Yes |
| Nov 2 | Rules angle limit raised to 20; all-ticked angles saved as `[]` | "Missing or insufficient permissions" creating a request with all 11 angles | Yes (deploy unconfirmed) |
| Nov 3 | Left Side / Left Rear example photos added (HEIC converted) | Last two missing examples | Yes (deploy unconfirmed) |

Rejected/obsolete approaches: Firebase Trigger Email extension (replaced by Resend REST); importing units directly into Pending (replaced by requests-first); hard delete (replaced by soft delete); browser-side zip with JSZip + bucket CORS (replaced by server zip).

---

## 8. COMPLETED WORK & CURRENT FUNCTIONALITY

| Area | Status |
|---|---|
| Auth, roles, temp passwords, password resets, user admin | Deployed, in use [Verified by usage] |
| Submission form, 11 slots, thumbnails, duplicate-serial warning, public/private comments | Deployed, in use (screenshot Oct 28 showed 11/11 photos) |
| Pending/Listed tables, filters (incl. Needs follow-up, Not on report), photo count tags, pagination | Deployed |
| Pending/Requests switcher; badge = my assigned open requests + my follow-ups | Code delivered Oct 27; screenshots after show the new nav [Verified visually Oct 28] |
| Photo requests (manual + bulk + daily) | Deployed; daily import ran successfully Oct 27 (1 request) |
| Daily report scheduled import, off-report reconciliation, Add again | Deployed Oct 27–28 (`runReportImport` needed a second deploy; user reported "deploy complete") |
| Soft delete / Deleted units / purge | Deployed (purgeDeletedUnits listed by `firebase functions:list`) |
| Messages, follow-ups, @mentions + emails | Deployed Oct 28 |
| Instructions page with all 11 examples | Code delivered Nov 3 — **deploy not confirmed** |
| Server-side downloads | Code delivered Oct 28 — **not confirmed working** |
| Angles ≤ 20 rule fix | Code delivered Nov 2 — **deploy not confirmed** |

Deploy command reference (Windows PowerShell, from `KCBUsed`):
```
cd functions; npm install; cd ..      # when functions dependencies change
npm run build
firebase deploy --only hosting,functions,firestore
```

---

## 9. ACTIVE TASKS, INCOMPLETE WORK & ROADMAP

| # | Item | Priority | Status / next step |
|---|---|---|---|
| 1 | Confirm photo downloads work (server zip) | **High** | Ask the user to deploy hosting+functions (needs `npm install` in functions for `archiver`) and test Download all photos as admin and non-admin. If it fails, get the toast text and `firebase functions:log --only downloadPhotos`. Hosting rewrites cap at 60 s — very large zips could time out. |
| 2 | Confirm Nov 2 rules fix and Nov 3 examples are deployed | High | `firebase deploy --only hosting,firestore:rules` |
| 3 | Report file is publicly downloadable with cost columns (`https://www.berrycompaniesinc.com/instockinventory/no_price.PDF`) | High (data exposure) | Recommend random file name or basic auth (import already supports `https://user:pass@…`). User has not acted on it. |
| 4 | Branch photo contacts mostly "Unassigned" (as of Oct 27 only Springfield had one) | Medium | Admins set them in Settings → Locations; otherwise imported requests are unassigned. |
| 5 | README is partly stale: header says "10 standard photos"; table row "Permanently delete units"; Requests/Pending descriptions predate merge | Low | Update README/project doc. |
| 6 | `tests/rules.test.js` never run; likely outdated | Medium | Run `npm run test:rules` locally (needs Java) and update. |
| 7 | Legacy units from the first day of import (`createdBy:'daily-report'`, e.g. 2024 Bobcat T76) | Low | Either fine as is or delete & "Add again". Status unknown. |
| 8 | `setupDownloads`, `withDownloadFix`, `cors.json`, jszip dependency now redundant | Low | Remove after downloads are confirmed. |
| 9 | Matt: "delete listings 60 days after sale; this may change later" | Watch | Off-report rule implements this; constant `OFF_REPORT_DAYS` in two files. |
| 10 | Deleted *requests* are hard-deleted (only units go to trash) | Low | Only if asked. |
| 11 | GitHub Actions deploys hosting from the repo — if the repo isn't pushed, an older build can overwrite a local deploy | Medium | Confirm repo is current; repo URL unknown. |

---

## 10. TROUBLESHOOTING HISTORY & LESSONS LEARNED

| Problem | Root cause | Fix / lesson |
|---|---|---|
| Files "synced" but device still had placeholder project IDs [Summary] | A commit to the user's folder silently failed | After syncing, re-read and compare files. |
| Resend 403 "API key not authorized for this domain" [Summary] | `MAIL_FROM` used kcbobcat.com; key restricted to used.kcbobcat.com | Sender must be `@used.kcbobcat.com`. Email tab "Send test email" shows Resend's exact error. |
| "nullnull" text on mobile [Summary] | Native `append(null)` prints "null" | Always use `mount()` from `ui.js`. |
| Wrong unit linked to a request [Summary] | Auto-match by EIN | Require explicit confirmation. |
| Input padding/search icon, stretched radios, `.empty` class clash [Summary] | CSS specificity/global rules | Scope styles. |
| "The report URL must start with https://" though link looked right (Oct 27) | **Run import now** used the saved (empty) link, not the typed one | Run now saves the typed link first; URLs are sanitized of spaces/zero-width chars/quotes. |
| Daily import marked unit "Imported before" after an accidental delete | By-design marker | Added "Add again" override (`reimport` keys). |
| Downloads: "Failed to fetch … CORS" (Oct 28) | Bucket CORS never set (one-time gsutil step skipped) | Moved downloads server-side; don't go back to browser fetches from Storage. |
| User opened a `cloudfunctions.googleapis.com` link → 401 CREDENTIALS_MISSING | That's Google's REST API in a browser, not an app error | Look at deploy output / `firebase functions:list` instead. |
| `runReportImport` failed in one deploy | Unknown, likely transient | Redeploy the single function: `firebase deploy --only functions:runReportImport` (add `--debug` for reason). |
| "Missing or insufficient permissions" creating a request with all 11 angles (Nov 2) | Rules still capped `angles.size() <= 10` after the 11th slot | When adding a slot, update **config, firestore.rules (whitelist + addedOk + any size limits), emails.js SLOT_ORDER, downloads.js SLOTS**. |
| Review findings fixed (Oct 27): follow-ups on report units unresolvable; email failure marking import failed; partial import losing digests; concurrent runs duplicating; codes map not removable via merge; signed URL cache-buster; unbounded fetch; client could set import fields on create; "Add photos" didn't complete request | Independent code review | All fixed; keep `batch.create` for markers, per-row try/catch, `saveReportCodes` full replace. |

**Don't repeat:** hard deletes; importing units straight to Pending; relying on bucket CORS; `setDoc(..., {merge:true})` to remove map keys; adding photo slots in one place only.

---

## 11. DEVELOPMENT CONVENTIONS & USER PREFERENCES

**Explicit [Stated]:**
- Colors must match kcbobcat.com (#f30, #666, #000) and use the K.C. Bobcat logo.
- Photos not required; menu items named as the business uses them (Pending, Listed, Requests, Instructions).
- Deleted-units link small, at the bottom of lists, not in the main menu.
- Settings should avoid long scrolling and mismatched box sizes.

**Inferred from how we worked:**
- Erin pastes screenshots/error text from users and expects an end-to-end fix, not a list of options — unless a choice is genuinely hers (then 2–3 options with a recommendation, e.g. off-report handling).
- Short replies: what changed, anything she must do, then the exact deploy command(s) last. She runs commands in **Windows PowerShell** from `C:\Users\ECharboneau\Downloads\KCBUsed`.
- Changed files were written directly into her KCBUsed folder via the desktop bridge and verified by re-reading. In the new project, ask how files should be delivered (download, repo PR, or bridge).
- Always mention when something needs a deploy and which targets (`hosting`, `functions`, `firestore`), and when `npm install` in `functions` is needed.
- Code style: vanilla ES modules, `h()`/`mount()` builders, small comments explaining *why*, plain-language UI copy and toasts, mobile-first checks at 390 px.
- Keep README (and the Claude project doc copy) updated with each feature.

---

## 12. CONTENT, MARKETING & SEO KNOWLEDGE
Not applicable — internal, `noindex` tool (index.html has `robots: noindex, nofollow`). UI copy conventions: plain, short sentences; curly quotes/apostrophes; "Pending/Listed/Requests" capitalized as nouns; email subjects like "Photos ready: 2026 Bobcat T76 (Olathe – 19)", "Matt tagged you: … (Serial …)".

---

## 13. INTEGRATIONS, AUTOMATIONS & EXTERNAL SERVICES

| Integration | Flow | Auth | Failure mode / monitoring |
|---|---|---|---|
| **Zapier** (user-owned) | Report email attachment → FTP → `https://www.berrycompaniesinc.com/instockinventory/no_price.PDF` (must keep same name, overwritten daily) | Zapier/FTP credentials — not in this project | If the file stops updating, the import keeps re-reading yesterday's file (dedupe prevents duplicates). If the URL breaks, admins get a "Daily report import failed" email; history in Settings → Daily report. |
| **Daily import function** | 08:30 CT fetch → requests → digest emails | none (public URL) or basic auth in URL | `reportRuns`, `settings/reportImport.lastRun`, functions logs |
| **Resend** | All emails | `RESEND_API_KEY` secret; domain used.kcbobcat.com verified (DKIM/SPF/MX on used.kcbobcat.com) | `mailLog` (Settings → Email), functions logs |
| **Firebase Hosting / custom domain** | used.kcbobcat.com DNS at kcbobcat.com's DNS host | — | Auth → Authorized domains must include used.kcbobcat.com |
| **GitHub Actions** | push to main → hosting deploy | `FIREBASE_SERVICE_ACCOUNT` secret, `FIREBASE_PROJECT_ID` var | Functions/rules are NOT deployed by CI |
| **Adobe Fonts** | kit `hvz7keh` | domain allow-list | falls back to system fonts |

What would break: renaming the report file; changing the report's column layout (regex); changing warehouse names (codes match by name token; photo contacts and notification locations are keyed by the warehouse **name**); revoking the Resend key; removing the `/api/download` rewrite.

---

## 14. IMPORTANT URLS, REFERENCES & RESOURCES

| Resource | Why |
|---|---|
| https://used.kcbobcat.com | Production app |
| https://kcbobcat.com | Brand reference |
| https://www.berrycompaniesinc.com/instockinventory/no_price.PDF | Daily report source (public — contains costs) |
| Firebase console, project `kcb-used` | Auth, Firestore, Storage, Functions, Hosting |
| Storage bucket `gs://kcb-used.firebasestorage.app` | Photos |
| Resend dashboard (Domains, API Keys, Emails) | Email delivery |
| `C:\Users\ECharboneau\Downloads\KCBUsed` | User's working copy (deploys run from here) |
| GitHub repo | Exists (hosting CI) — **URL not known in this context** |
| Old Claude project doc `claude/used-equipment-setup.md` | Same content as README |

---

## 15. CRITICAL KNOWLEDGE THE NEW CLAUDE MUST RETAIN

1. Stack is Vite + vanilla JS + Firebase (project `kcb-used`, region us-central1) + Resend; no framework — don't introduce one.
2. Status keys are `active` (shown as **Pending**), `hidden`, `archived` (shown as **Listed**), `deleted` (trash). Never rename stored keys; change labels only.
3. Photo slot keys (11) are stored data; adding/removing a slot means editing `src/config.js`, `firestore.rules` (whitelist, `addedOk`, size limits), `functions/emails.js`, `functions/downloads.js`, and example images.
4. Pending = units that exist (photos uploaded); Requests = photos still needed. Daily import creates **requests only**; units are created on upload.
5. Only rows with ERP status `K`/`*K` ("Post to Web") are imported; costs never stored.
6. `reportImports` markers make imports one-time; "Add again" (`reimport`) is the deliberate override.
7. Off-report: flag → warn at 53 days → soft-delete at 60 → purge 30 days later. `OFF_REPORT_DAYS` lives in two files.
8. Safety: reconciliation skips short/older reports and uploaded files — keep it.
9. Deletion is soft (`status:'deleted'`); `main.js` keeps deleted units out of `store.equipment`. Hard delete only via Delete forever or purge.
10. `settings/reportImport` is admin-only to read (cost file URL).
11. System-created docs use `createdBy: 'daily-report'`; rules and UI special-case it.
12. Admin-only/system fields (followUp, listed*, offReport*, deleted*, import fields, requestId) are blocked for non-admin writes — extend those lists when adding similar fields.
13. Callable functions need the user's profile `active === true`; `requireAdmin` checks role.
14. Emails: one per recipient, idempotency keys, every attempt in `mailLog`. Sender `used-equipment@used.kcbobcat.com`.
15. Tagged (@) users are emailed regardless of their message setting.
16. Units created from a daily-report request skip the new-unit email; admins get "Photos ready".
17. Downloads go through `/api/download` (Hosting rewrite → `downloadPhotos`); do not reintroduce browser fetches from Storage.
18. Always use `mount()` (null-safe), never native `append(null)`.
19. Warehouse names are keys for contacts and notification locations — renaming a warehouse orphans them.
20. GitHub CI deploys hosting only; functions/rules must be deployed manually by the user.
21. The user deploys; changes aren't live until she runs the commands — always say which targets.
22. Requests rules: `angles.size() <= 20`; empty `angles` = all angles.
23. Storage is create-only; photo replacement uploads a new file and `onEquipmentUpdated` deletes the old one.
24. Tests: `npm run test:import` (works); `npm run test:rules` (emulator, stale).
25. Don't expose or commit `RESEND_API_KEY`; `functions/.env` holds only APP_URL and MAIL_FROM.

---

## 16. RECOMMENDED CLAUDE PROJECT INSTRUCTIONS → see "Ready-to-copy 1" below.
## 17. RECOMMENDED PROJECT KNOWLEDGE FILES

| File | Purpose | Reconstructable? |
|---|---|---|
| `KCB-Used-Dashboard-Knowledge-Transfer.md` (this) | Context, history, decisions | Generated |
| `KCB-Used-Dashboard-Source-Code.md` | Full current source of every text file (rules, functions, pages, config, tests) | Generated from the live working copy on 2026-11-04 |
| `README.md` | Setup + feature reference | In the source bundle |
| Sample report PDF (`no_price.PDF`) | Parser reference | **User must provide** (contains costs — consider redacting) |
| Instructions mockup / example photos | Design reference | Images live in `public/examples/`; mockup PNG must be re-uploaded if needed |
| GitHub repo link or zip | Ground truth for future edits | **User must provide** |

## 18. FIRST-CONVERSATION BOOTSTRAP PROMPT → see "Ready-to-copy 2".
## 19. MIGRATION VALIDATION CHECKLIST → see "Ready-to-copy 3".
## 20. KNOWLEDGE GAPS & MIGRATION RISKS → see "Ready-to-copy 4".

---
---

# Ready-to-copy 1 — NEW CLAUDE PROJECT INSTRUCTIONS

```
You are the developer and maintainer of the K.C. Bobcat Used Equipment Dashboard (https://used.kcbobcat.com), an internal web app for K.C. Bobcat (Kansas City Bobcat dealer, Berry Companies). Erin (web operations) owns it; Matt and Lesley are the admins who post units; branch staff take photos; sales reps view only.

STACK: Vite + vanilla JS ES modules (no framework), Firebase project "kcb-used" (Auth email/password, Firestore, Storage, Hosting, Cloud Functions v2 Node 22 in us-central1), Resend for email (sender used-equipment@used.kcbobcat.com, secret RESEND_API_KEY), Zapier delivers the daily e-Emphasys report to a fixed URL. GitHub Actions deploys hosting only.

WORKFLOW: daily report rows with ERP status K/*K ("Post to Web") → photo Requests assigned to each location's photo contact → staff upload photos (unit created in Pending) → admins get "Photos ready" → admins post to website/Machinery Trader and "Mark as Listed". Units off the report 60 days → Deleted units (restorable 30 days).

RULES:
- Read the knowledge files (transfer doc + full source) before changing code; base edits on the current source, never on memory.
- Never rename stored keys (statuses active/hidden/archived/deleted; the 11 photo slot keys; roles admin/employee/viewer).
- A photo-slot change touches src/config.js, firestore.rules, functions/emails.js, functions/downloads.js.
- Keep system/admin-only fields protected in firestore.rules; keep settings/reportImport admin-only.
- Deletion is soft; imports are one-time (reportImports markers) with "Add again" as the override.
- Downloads go through /api/download (server), not browser fetches from Storage.
- Use h()/mount() from src/ui.js; never append(null).
- Brand: #f30 orange, #666 grey, #000 black, K.C. Bobcat logo, DIN 2014 (Adobe kit hvz7keh).

WORKING WITH ERIN: She forwards user screenshots/errors and wants the fix done end-to-end. Reply briefly: what was wrong, what changed, anything she must do, then exact deploy commands last (Windows PowerShell, run from her KCBUsed folder), naming targets: hosting / functions / firestore, and `cd functions; npm install` when function deps change. Ask only when the decision is genuinely hers; offer 2–3 options with a recommendation. Update README with each feature. Say clearly what is verified vs. untested, and never claim something is live until she has deployed it. If information is missing (repo URL, secrets, current deployed state), ask rather than assume.
```

# Ready-to-copy 2 — FIRST-CONVERSATION BOOTSTRAP PROMPT

```
This project continues the K.C. Bobcat Used Equipment Dashboard (used.kcbobcat.com). Before doing anything:
1. Read all project knowledge, especially KCB-Used-Dashboard-Knowledge-Transfer.md and KCB-Used-Dashboard-Source-Code.md, and the project instructions.
2. Summarize back to me in under 15 bullets: the stack, the Requests → Pending → Listed workflow, how the daily report import works, how deletion works, and the files that must change together when a photo slot changes.
3. List anything in the knowledge that conflicts, looks stale, or is missing (e.g. repo URL, whether the Oct 28 download fix and Nov 2–3 changes were deployed).
4. Treat items marked Unverified as not confirmed in production.
5. Don't change rules, functions, or stored data shapes without telling me the impact first.
6. Tell me how you'll deliver file changes (I deploy from Windows PowerShell in C:\Users\ECharboneau\Downloads\KCBUsed), then confirm you're ready.
```

# Ready-to-copy 3 — MIGRATION VALIDATION CHECKLIST

- [ ] New Claude project created in Teams; instructions (Ready-to-copy 1) pasted
- [ ] `KCB-Used-Dashboard-Knowledge-Transfer.md` uploaded
- [ ] `KCB-Used-Dashboard-Source-Code.md` uploaded (full source)
- [ ] GitHub repo connected or repo link added (if available)
- [ ] Optional: sample report PDF uploaded (redact costs if preferred)
- [ ] Bootstrap prompt sent; new Claude's summary matches §1–§6
- [ ] New Claude correctly lists the 4 files to change for a photo slot
- [ ] New Claude identifies open items: downloads verification, report URL exposure, unassigned photo contacts, stale rules tests, README drift
- [ ] Confirmed which changes are live (run `firebase functions:list`; test Download all photos; create a request with all angles; open Instructions)
- [ ] Secrets stay only in Firebase (`RESEND_API_KEY`) — nothing secret pasted into the project

# Ready-to-copy 4 — KNOWLEDGE GAPS & MIGRATION RISKS

| Gap | Risk | How to recover |
|---|---|---|
| Server-side downloads (Oct 28) never confirmed working in production | **High** | Deploy (with `npm install` in functions) and test as admin + non-admin; check `downloadPhotos` logs |
| Nov 2 rules fix and Nov 3 example photos — deploy not confirmed | Medium | `firebase deploy --only hosting,firestore:rules` |
| First week (Oct 21–27) known only from a compressed summary; exact early wording/decisions may be missing | Medium | The code is the source of truth; ask Erin about anything surprising |
| GitHub repository name/URL and whether it is current with the local folder | Medium | Ask Erin; push the KCBUsed folder |
| Zapier zap details and FTP target | Medium | Erin owns the zap — document trigger, file name, schedule |
| Report URL publicly exposes cost data | **High** (business) | Random file name or basic auth |
| `tests/rules.test.js` never executed; rules untested by automation | Medium | Run `npm run test:rules` with Java + emulators, fix |
| Current Firestore data state (which legacy report units exist, photo contacts set, notification settings) | Low–Medium | Check Firebase console / Settings → Locations |
| Exact Resend/domain DNS configuration | Low | Resend dashboard; "Send test email" in Settings → Email |
| User names/spelling (Lesley vs Leslie) and full admin list | Low | Users page |
| Old Claude memory beyond two short notes (brand colors, project basics) | Low | Already folded into this document |
