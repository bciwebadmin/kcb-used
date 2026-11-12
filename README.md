# Used Equipment Dashboard — used.kcbobcat.com

Internal dashboard where employees sign in, submit a used unit with 10 standard photos, and admins get an email for each new submission and can download the photos any time.

**Stack:** Vite + vanilla JS · Firebase Auth (email/password) · Firestore · Cloud Storage · Cloud Functions (Node 22) · Resend for email · Firebase Hosting deployed from GitHub Actions.

---

## What it does

| | Viewer | Employee | Admin |
|---|---|---|---|
| Sign in (email + password, admin-created accounts only; show/hide password) | ✓ | ✓ | ✓ |
| Change their own password (My account) | ✓ | ✓ | ✓ |
| **Pending** (home) and **Listed** tabs + search/filter (make, model, warehouse, EIN, serial #, status); Pending rows show a photo count (e.g. 9/11) | ✓ | ✓ | ✓ |
| **Instructions** page: the three photo rules and an example of every angle (examples also show faded behind empty photo slots) | ✓ | ✓ | ✓ |
| Submit a unit (details + up to 11 photos) | — | ✓ | ✓ |
| Edit their own submissions (details, replace photos) | — | ✓ | any unit |
| View unit, download one photo or all as a .zip | ✓ | ✓ | ✓ |
| Add photos to empty slots on any unit | — | ✓ | ✓ |
| Message the submitter about a unit; flag it for more photos/changes | ✓ | ✓ | ✓ |
| Mark a follow-up done | — | own units | ✓ |
| Photo Requests: request photos for a unit, check requests off, see open/completed | ask only | ✓ | ✓ |
| Edit/delete a photo request | own | own | any |
| **Mark as Listed** once the photos are posted (moves the unit from Pending to Listed and records who/when); move back to Pending; or set status Pending / Hidden / Listed | — | — | ✓ |
| Permanently delete units from either tab (photos are cleaned up automatically) | — | — | ✓ |
| Daily report import settings: report link, branch photo contacts, warehouse codes, run now / upload by hand, history | — | — | ✓ |
| Email notifications: assigned photo requests, photos ready for my requests (on/off) and new units (all / by location / off) — set in My account | ✓ | ✓ | ✓ |
| Set anyone's email notifications | — | — | ✓ |
| Delete users (removes their login; their units/photos/messages stay, open requests assigned to them are unassigned) | — | — | ✓ |
| Add users — they're emailed their login + a temporary password (typed or generated) and must choose their own at first sign-in; change roles, deactivate | — | — | ✓ |
| Reset someone's password: email a new temporary password, email/copy a reset link, or set it directly (optionally emailing it) | — | — | ✓ |
| Manage the warehouse list | — | — | ✓ |

**Viewer** is for people who only need to look — e.g. sales reps: they can browse, view and download photos, and ask for photos via Requests, but can't submit, edit or upload. Change anyone's level on the Users page.
Photo slots: Right Side, Right Side Rear, Rear Engine, Left Rear, Left Side, Left Front, Front, Right Front, Interior, Hour Meter, Serial Plate. Photos are optional — employees add whichever angles they have (set `ALL_PHOTOS_REQUIRED` in `src/config.js` to require all 11). Example shots live in `public/examples/<slot>.jpg` (+ `-sm.jpg`). Photos are stored at full resolution; a small thumbnail is generated in the browser for the table and email.

Form fields: Make, Model, Year, Hours, Warehouse, EIN, Serial #, Condition, Price, Attachments/options, and **Public comments** (everyone sees) and **Private comments** (admins and employees only — hidden from viewers/sales reps) under the photos. A duplicate serial number triggers a warning before submitting.

**Messages / follow-ups** — every unit page has a Messages thread. Type **@** (or tap *@ Tag*) to tag anyone — e.g. “@Lesley ready to post” — and they get an email even if they've turned message emails off. Anyone can write to the person who submitted it (they get an email with a link straight to the thread); replies email whoever else posted. Tick *Needs more photos or changes* to flag the unit: it shows a red banner on the unit, a "Needs follow-up" tag in the Pending table (filter: Status → Needs follow-up), and a count on the submitter's Pending tab until they (or an admin) click **Mark done** — which emails the person who asked. Anyone can turn message emails off under My account.

**Importing requests in bulk** — Requests → **Import** (or Add → Import photo requests). Upload the e-Emphasys *Equipment List* PDF, a CSV (header row with columns like Whse, EIN, Year, Model, Serial, Hours, Make, Status), or paste the report text. A preview lets you pick one assignee, due date and angles for the batch, map warehouse codes (18, W5…) to your warehouse names, fix makes, and untick rows. Units that already have an open request start unticked; units already in inventory with the same serial are linked so the photos go onto them. Cost and price columns are never imported. The assignee gets **one summary email** for the whole batch. Parser tests: `npm run test:import`.

**Workflow** — The menu is **Pending** (with two tabs: *Pending* and *Requests*) · **Listed** · **Instructions**. (1) Every morning the daily equipment report turns each “K – Post to Web” / “*K – Post to Web” unit into a **photo request** (Requests tab) assigned to that location's photo contact, who gets one email listing their units. Requests can also be added by hand. (2) They take the photos (see Instructions) and tap *Upload photos*: the form is prefilled from the report, saving creates the unit in **Pending**, checks the request off, and emails the admins **Photos ready**. (3) Matt/Leslie download the photos, post the unit to the website and Machinery Trader, and click **Mark as Listed**. Sales reps (viewers) still see the photos under Listed.

**Deleted units** — deleting a unit (or the 60-day off-report clean-up) moves it to *Deleted units* — a small link under the Pending, Listed and Requests lists (admins). From there an admin can **Restore** it to where it was or **Delete forever**; after 30 days the `purgeDeletedUnits` function removes it and its photos for good.

**Daily report import** — Settings → *Daily report*. Zapier saves the report email's PDF attachment to a web server (always the same file name, overwritten daily); paste that link and tick *Import automatically every morning*. The `dailyReportImport` function reads it at 8:30 AM Central. Units already in the app (same EIN or serial) or imported before — even if since deleted or listed — are skipped, so deleting a unit doesn't bring it back the next day. **Test link** previews without saving; **Run import now** imports immediately; or upload a PDF by hand (preview first). If the link stops working, admins get an email and the failure shows in the history. **Units no longer on the report** (any ERP status — usually sold) get a *Not on report* tag (filter: Status → Not on report, on both tabs) and **move to Deleted units 60 days later** (open photo requests from the report for units that drop off are removed right away); admins get an email listing anything due within a week, and an admin can open a unit and click **Keep** to stop it. A unit that reappears on the report is un-flagged. Flags only change when the report reads cleanly (at least 10 units and not under 60% of the last good report) and isn't older than one already processed; uploaded files never change flags. Change the 60 days in `OFF_REPORT_DAYS` (both `functions/report-import.js` and `src/config.js`). Report codes like “20” match a warehouse whose name contains the code (“Lenexa - 20”); map any others under *Warehouse codes*. The report includes cost columns — keep the file somewhere not publicly listed (a long random file name, or basic auth via `https://user:password@host/file.pdf`); costs are never imported.

**Settings** has three tabs. *Locations* is one table: each warehouse with its report code (taken from the name, e.g. “Springfield – 20” → 20; add extra codes with + code), its **photo contact** for imported units, and the people emailed about new units submitted there (2–3 per branch; the same setting each person sees under My account). Add or remove locations at the top. *Daily report* has the report link, Test/Run/upload, and recent imports side by side. *Email* has the test email and recent email activity.

**Photo Requests** (Requests tab) work like a to-do list. **New request** opens its own page. Anyone can ask for photos of a unit (make/model/serial/EIN, warehouse, which angles, an optional "needed by" date, notes) and **assign it to someone** — they get an email with an "Upload photos" link (no email if you assign yourself; reassigning emails the new person). If the serial or EIN matches a unit already in inventory, the form shows that unit and asks whether it's the same one; it's only linked if you tick the box (and a mismatched model is flagged). Linked requests open that unit to add photos; unlinked ones open a new submission prefilled from the request. Saving checks the request off. The requester or an admin can reassign or click "Not this unit" to unlink. Filter by *Assigned to me*, *Requested by me*, or *Unassigned*.

---

## One-time setup

You need: Node 22+, the Firebase CLI (`npm i -g firebase-tools`), and `gcloud`/`gsutil` (for the CORS step).

### 1. Firebase project

1. Create a project at console.firebase.google.com and upgrade it to the **Blaze** plan (required for Cloud Functions; usage at this scale is typically pennies).
2. **Authentication** → Get started → enable **Email/Password**.
   Then Authentication → Settings → User actions → turn off *Enable create (sign-up)* so only admins can create logins.
3. **Firestore Database** → Create → production mode → location **nam5 (United States)** or **us-central1**.
4. **Storage** → Get started → same region.
5. ✅ Web app config is already in `src/firebase-config.js` and the project (`kcb-used`) is set in `.firebaserc`.

### 2. Email (Resend)

Emails (new-submission alerts and welcome/set-password emails) are sent by the Cloud Functions through the Resend API.

1. In Resend → **Domains** → add `used.kcbobcat.com` and add the DNS records it shows (DKIM/SPF/MX on names under `used.kcbobcat.com` — they don't clash with the Firebase Hosting records). Wait for it to show **Verified**.
2. Resend → **API Keys** → create a key with **Sending access** and **Domain: used.kcbobcat.com**.
3. Store it as a Firebase secret (never in the repo):
   ```bash
   firebase functions:secrets:set RESEND_API_KEY
   ```
4. Set the sender in `functions/.env` — it must be on the verified domain:
   ```
   MAIL_FROM=Used Equipment <used-equipment@used.kcbobcat.com>
   ```

Each admin gets their own copy of the alert (one batch API call), and a retried trigger never double-sends. Every send attempt is logged in the Firestore `mailLog` collection with the Resend ID or the error, so "did the alert go out?" is answerable from the Firebase console; failures also appear in the Functions logs.

### 3. Deploy the backend + site

```bash
npm install
cd functions && npm install && cd ..
npm run build
firebase deploy
```

The first deploy asks to let Storage rules read Firestore (used to check that the user is active) — answer **yes**.

### 4. Photo downloads

Nothing to set up: downloads go through `/api/download` on the site itself (the `downloadPhotos` function streams the photo or a .zip), so the browser never fetches from the Storage bucket directly. The section below is only needed if you change that.

#### (Old) Allow browser downloads straight from Storage (CORS)

Automatic: the first time an **admin** downloads a photo and the browser blocks it, the `setupDownloads` function sets this for the bucket and retries — nothing to run. If that fails (the functions' service account lacks Storage admin rights), set it by hand, e.g. in Google Cloud Shell:

```bash
gsutil cors set cors.json gs://kcb-used.firebasestorage.app
```

(Use the `storageBucket` value from your config. If you later add another domain, add it to `cors.json` and run this again.)

### 5. Create the first admin

```bash
cd functions
gcloud auth application-default login
node scripts/create-admin.mjs --project kcb-used --email you@kcbobcat.com --name "Your Name"
```

It prints a link to set your password. After that, add everyone else from **Users** in the app — they get a welcome email with a link to set their own password.

*No gcloud?* Do it in the console instead: Authentication → Add user (any temporary password) → copy the UID → Firestore → start collection `users` → document ID = that UID → fields `email` (string), `displayName` (string), `role` = `admin`, `active` = `true` (boolean). Email settings default sensibly and can be changed under My account.

### 6. GitHub → auto-deploy

1. Create a GitHub repo and push this folder to `main`.
2. Either:
   - **Easiest:** run `firebase init hosting:github`, pick the repo, answer **yes** to running a build script with `npm ci && npm run build`, and let it overwrite the two files in `.github/workflows/`. It creates the service-account secret for you.
   - **Or keep the included workflows:** in the repo's Settings → Secrets and variables → Actions, add secret `FIREBASE_SERVICE_ACCOUNT` (a service-account JSON key with the *Firebase Hosting Admin* role) and variable `FIREBASE_PROJECT_ID` = `kcb-used`.

Every push to `main` builds and deploys the site; every pull request gets a temporary preview URL.
The workflows deploy **hosting only**. When you change `functions/`, `firestore.rules` or `storage.rules`, deploy those from your machine: `firebase deploy --only functions,firestore,storage`.

### 7. Custom domain: used.kcbobcat.com

1. Hosting → **Add custom domain** → `used.kcbobcat.com`.
2. Add the DNS records it shows at whoever hosts DNS for kcbobcat.com. SSL is issued automatically (can take up to a few hours).
3. Authentication → Settings → **Authorized domains** → make sure `used.kcbobcat.com` is listed (needed for password-reset links to return to the site).
4. Adobe Fonts: add `used.kcbobcat.com` to the web project for the `hvz7keh` kit, or the site falls back to system fonts.

---

## Local development

```bash
npm run dev            # runs against your real Firebase project
```

Or fully offline with the emulators (needs Java):

```bash
npm run emulators      # terminal 1 — Auth, Firestore, Storage, Functions + UI at localhost:4000
npm run dev:emulators  # terminal 2 — site at localhost:5173 pointed at the emulators
```

In the emulator UI, create an Auth user and a matching `users/{uid}` doc with `role: admin, active: true`. To send real email from the emulator, copy `functions/.secret.local.example` to `functions/.secret.local` and add a Resend key; otherwise sends fail harmlessly and show up as errors in the `mailLog` collection.

**Security rule tests:** `npm run test:rules` (starts the emulators, checks who can read/write what, shuts down).

---

Lists (Pending, Listed, Requests, Users) show **20 per page**; searching, filtering, sorting or switching tabs goes back to page 1.

## Data model

- `users/{uid}` — `email, displayName, role ('admin'|'employee'|'viewer'), active, notifyNewUnits ('all'|'locations'|'none'), notifyLocations[], notifyAssigned, notifyMessages, notifyPhotosReady` — role/active written only by Cloud Functions; the notify* fields can be changed by the user or an admin; readable by active staff (for the Assign-to list). New admins default to all new units, employees to none; everyone gets assignment emails by default.
- `equipment/{id}` — `make, model, year, hours, warehouse, ein, serial, serialKey, condition, price, attachments, status ('active' = Pending | 'hidden' | 'archived' = Listed | 'deleted'), deletedAt, deletedByEmail, deletedFromStatus, deletedReason, requestId (when created by uploading for a request), listedAt, listedByEmail, offReport {since, warned}, offReportKeep, photos{slotKey: {path, url, thumbPath, thumbUrl, …}}, createdBy, createdByEmail, createdByName, createdAt, updatedAt`.
- `requests/{id}` — `make, model, serial, serialKey, ein, warehouse, angles[], dueDate ('YYYY-MM-DD'|null), notes, status ('open'|'done'), equipmentId (only when confirmed), assignedTo, assignedToName, assignedBy, createdBy…, completedBy…`.
- `equipment/{id}/messages/{mid}` — `text, kind ('note'|'action'|'resolved'), authorId, authorName, authorEmail, createdAt`. The unit's `followUp {open, text, byName, at, resolvedByName…}` is maintained by the function.
- `equipment/{id}/private/notes` — `text, updatedAt, updatedByEmail`: private comments, in their own document so rules can hide them from viewers.
- `requestImports/{id}` — one record per bulk import (`count, assignedTo, createdBy…`); imported requests carry `importBatch`, plus `year`, `hours`, `warehouseCode`.
- `settings/app` — `warehouses[]`.
- `settings/reportImport` (admins only) — `url, enabled, contacts{warehouse: uid}, codes{code: warehouse}, lastRun`.
- `reportRuns/{id}` — history of each daily import (created/skipped units, errors). `reportImports/ein-{EIN}` — marks a unit as imported so it is never re-created. Units/requests from the report have `createdBy: 'daily-report'` and `importBatch`.
- `mailLog/{id}` — one record per email send attempt (recipients, subject, Resend ID or error). Functions-only.
- Storage: `equipment/{id}/{slot}-{timestamp}.jpg` (+ `-thumb.jpg`).

## Cloud Functions

| Function | When | Does |
|---|---|---|
| `onEquipmentCreated` | new unit | emails every active user whose settings cover it (all units, or that unit's location) — except the submitter — with thumbnails + link |
| `onEquipmentUpdated` | unit edited | deletes photos that were replaced |
| `onEquipmentDeleted` | unit deleted | deletes the unit's photo folder and its messages |
| `createUser` | admin adds a user | creates the login + profile with a temporary password (typed or generated), emails it, and flags the account to choose its own password at first sign-in |
| `onMessageCreated` | message posted on a unit | sets/clears the unit's follow-up flag; emails the submitter + others in the thread (except the author) |
| `onRequestImportCreated` | a batch of requests is imported | sends the assignee one summary email listing every unit |
| `onRequestWritten` | request created, reassigned or completed | emails the assignee (unless they turned assignment emails off) with the details and an Upload photos link; when photos are uploaded, emails the requester — or the admins, for report units — that the photos are ready |
| `dailyReportImport` | 8:30 AM Central daily | fetches the report link, creates photo requests for new Post to Web units, emails each branch contact one list; emails admins if it fails |
| `purgeDeletedUnits` | 2:15 AM Central daily | permanently removes units that have been in Deleted units for 30 days (photos, messages too) |
| `runReportImport` | admin clicks Test link / Run import now / uploads a report | same import on demand (preview or real) |
| `downloadPhotos` | Download / Download all photos (via the `/api/download` Hosting rewrite) | checks the sign-in, then streams the photo or a .zip of all of them |
| `setupDownloads` | first blocked admin download | sets the Storage bucket CORS so the site can download photos |
| `deleteUser` | admin deletes a user | removes the login + profile, unassigns their open photo requests; blocks deleting yourself or the last admin |
| `adminPassword` | admin resets a password | sets a typed or generated password (signs them out everywhere; optionally emails it as a temporary password) or returns a copyable reset link |
| `updateUser` | admin changes a user | role / active / alerts; deactivating disables the login and signs them out. Prevents removing the last admin or demoting yourself. |

## Customizing

`src/config.js` — photo slots and order, which photo is the table thumbnail, required photos, statuses, condition options, default warehouse.
Brand colors/fonts — top of `src/styles.css` (K.C. Bobcat: #f30, #666, #000). Logo and favicons — `public/`.
Email templates — `functions/emails.js`. Sending — `functions/mailer.js`.
