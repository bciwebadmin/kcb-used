# KCB Used Equipment Dashboard — Full Source Code

Snapshot of the working copy on 2026-11-04 (50 text files; images, lock files and node_modules omitted).
The Firebase web `apiKey` in `src/firebase-config.js` is replaced with a placeholder here (it is public, but copy the real value from the repo/console). No secrets are stored in the code; `RESEND_API_KEY` lives only in Firebase Secret Manager.

## Files

- `README.md`
- `.firebaserc`
- `.gitignore`
- `cors.json`
- `firebase.json`
- `firestore.indexes.json`
- `firestore.rules`
- `index.html`
- `package.json`
- `storage.rules`
- `vite.config.js`
- `src/config.js`
- `src/data.js`
- `src/firebase-config.js`
- `src/firebase.js`
- `src/import-parse.js`
- `src/main.js`
- `src/store.js`
- `src/styles.css`
- `src/ui.js`
- `src/pages/account.js`
- `src/pages/deleted.js`
- `src/pages/detail.js`
- `src/pages/first-password.js`
- `src/pages/import-requests.js`
- `src/pages/instructions.js`
- `src/pages/inventory.js`
- `src/pages/login.js`
- `src/pages/messages.js`
- `src/pages/notifications.js`
- `src/pages/report-import.js`
- `src/pages/requests.js`
- `src/pages/settings.js`
- `src/pages/submit.js`
- `src/pages/users.js`
- `functions/.env`
- `functions/.secret.local.example`
- `functions/downloads.js`
- `functions/emails.js`
- `functions/index.js`
- `functions/mailer.js`
- `functions/package.json`
- `functions/report-import.js`
- `functions/scripts/create-admin.mjs`
- `functions/shared/report-parse.js`
- `.github/workflows/firebase-hosting-merge.yml`
- `.github/workflows/firebase-hosting-pull-request.yml`
- `tests/import-parse.test.mjs`
- `tests/report-import.test.mjs`
- `tests/rules.test.js`

## `README.md`

````markdown
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
````

## `.firebaserc`

```
{
  "projects": {
    "default": "kcb-used"
  }
}
```

## `.gitignore`

```
node_modules/
dist/
.firebase/
*.log
.env.local
functions/node_modules/
functions/.runtimeconfig.json
functions/*.local
service-account*.json
.DS_Store
functions/.secret.local
tests/fixtures/
harness/
```

## `cors.json`

```json
[
  {
    "origin": [
      "https://used.kcbobcat.com",
      "http://localhost:5173"
    ],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type", "Content-Disposition"],
    "maxAgeSeconds": 3600
  }
]
```

## `firebase.json`

```json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "/api/download",
        "function": {
          "functionId": "downloadPhotos",
          "region": "us-central1"
        }
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "no-cache"
          },
          {
            "key": "X-Frame-Options",
            "value": "DENY"
          },
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "Referrer-Policy",
            "value": "strict-origin-when-cross-origin"
          }
        ]
      },
      {
        "source": "/assets/**",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      }
    ]
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  },
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "ignore": [
        "node_modules",
        ".git",
        "*.local",
        "scripts"
      ]
    }
  ],
  "emulators": {
    "auth": {
      "port": 9099
    },
    "firestore": {
      "port": 8080
    },
    "storage": {
      "port": 9199
    },
    "functions": {
      "port": 5001
    },
    "ui": {
      "enabled": true
    },
    "singleProjectMode": true
  }
}
```

## `firestore.indexes.json`

```json
{
  "indexes": [],
  "fieldOverrides": []
}
```

## `firestore.rules`

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // ---------- helpers ----------
    function signedIn() {
      return request.auth != null;
    }
    function profile() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    // A signed-in user only counts if an admin created their profile and it is active.
    function isActive() {
      return signedIn()
        && exists(/databases/$(database)/documents/users/$(request.auth.uid))
        && profile().active == true;
    }
    function isAdmin() {
      return isActive() && profile().role == 'admin';
    }
    // Admins and employees can submit/edit units and photos. Viewers (e.g. sales reps) can only look.
    function canEdit() {
      return isActive() && profile().get('role', 'employee') in ['admin', 'employee'];
    }
    function validStatus(s) {
      return s in ['active', 'hidden', 'archived', 'deleted'];
    }
    function nonEmptyString(v, max) {
      return v is string && v.size() > 0 && v.size() <= max;
    }
    // Any active user may fill EMPTY photo slots on any unit (e.g. answering a photo request),
    // but not change details or replace/remove existing photos.
    function storageUrl(u) {
      return u is string && u.matches('https://firebasestorage[.]googleapis[.]com/.*');
    }
    // A photo entry must point at this unit's own folder in our Storage bucket.
    function validPhoto(p, id) {
      return p is map
        && p.path is string && p.path.matches('equipment/' + id + '/[^/]+')
        && storageUrl(p.url)
        && (p.get('thumbUrl', null) == null || storageUrl(p.thumbUrl));
    }
    function addedOk(added, k, id) {
      return !(k in added) || validPhoto(request.resource.data.photos[k], id);
    }
    // allowReplace: units from the daily report have no "owner", so branch staff may also retake (replace) photos.
    function onlyAddsPhotos(id, allowReplace) {
      let photoDiff = request.resource.data.photos.diff(resource.data.photos);
      let added = photoDiff.addedKeys().union(photoDiff.changedKeys());
      return request.resource.data.diff(resource.data).affectedKeys().hasOnly(['photos', 'updatedAt', 'updatedByEmail'])
        && request.resource.data.updatedByEmail == request.auth.token.email
        && (allowReplace || photoDiff.changedKeys().size() == 0)
        && photoDiff.removedKeys().size() == 0
        && added.hasOnly(['rightSide', 'rightSideRear', 'rearEngine', 'leftRear', 'leftSide', 'leftFront', 'front', 'rightFront', 'interior', 'hourMeter', 'serialPlate'])
        && addedOk(added, 'rightSide', id)
        && addedOk(added, 'rightSideRear', id)
        && addedOk(added, 'rearEngine', id)
        && addedOk(added, 'leftRear', id)
        && addedOk(added, 'leftSide', id)
        && addedOk(added, 'leftFront', id)
        && addedOk(added, 'front', id)
        && addedOk(added, 'rightFront', id)
        && addedOk(added, 'interior', id)
        && addedOk(added, 'hourMeter', id)
        && addedOk(added, 'serialPlate', id);
    }
    function equipmentShapeOk(d) {
      return nonEmptyString(d.make, 80)
        && nonEmptyString(d.model, 80)
        && nonEmptyString(d.warehouse, 80)
        && d.ein is string && d.ein.size() <= 40
        && nonEmptyString(d.serial, 60)
        && validStatus(d.status)
        && d.photos is map
        && (d.get('comments', '') is string && d.get('comments', '').size() <= 5000);
    }

    // ---------- users ----------
    // Profiles are created/changed only by Cloud Functions (admin SDK).
    // Active staff can see the staff list (names/emails for "Assign to"); anyone can see their own profile.
    match /users/{uid} {
      allow read: if isActive() || (signedIn() && request.auth.uid == uid);
      // Only email-notification settings can be changed from the app (by the user themselves or an admin);
      // everything else (role, active, …) goes through Cloud Functions.
      allow update: if ((isActive() && request.auth.uid == uid) || isAdmin())
        && request.resource.data.diff(resource.data).affectedKeys()
             .hasOnly(['notifyNewUnits', 'notifyLocations', 'notifyAssigned', 'notifyMessages', 'notifyPhotosReady', 'notifyUpdatedAt'])
        && request.resource.data.notifyNewUnits in ['all', 'locations', 'none']
        && request.resource.data.notifyLocations is list
        && request.resource.data.notifyLocations.size() <= 50
        && request.resource.data.notifyAssigned is bool
        && request.resource.data.get('notifyMessages', true) is bool
        && request.resource.data.get('notifyPhotosReady', true) is bool
        && request.resource.data.notifyUpdatedAt == request.time;
      // After signing in with an emailed temporary password, a user clears their own "must change" flag.
      allow update: if signedIn() && request.auth.uid == uid
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['mustChangePassword'])
        && request.resource.data.mustChangePassword == false;
      allow create, delete: if false;
    }

    // ---------- app settings (warehouse list etc.) ----------
    match /settings/{docId} {
      // The report link points at a file with costs in it — admins only.
      allow read: if docId == 'reportImport' ? isAdmin() : isActive();
      allow write: if isAdmin();
    }

    // ---------- equipment ----------
    match /equipment/{id} {
      allow read: if isActive();

      allow create: if canEdit()
        && equipmentShapeOk(request.resource.data)
        && !request.resource.data.keys().hasAny(['followUp', 'importBatch', 'listedAt', 'listedByEmail', 'reportStatus', 'reportStatusCode', 'offReport', 'offReportKeep', 'offReportKeepBy', 'deletedAt', 'deletedByEmail', 'deletedFromStatus', 'deletedReason'])
        && request.resource.data.createdBy == request.auth.uid
        && request.resource.data.createdByEmail == request.auth.token.email
        && request.resource.data.createdAt == request.time
        && request.resource.data.status == 'active';

      // Admins can change anything (including status).
      // The original submitter can edit details/photos but not status or ownership.
      allow update: if canEdit()
        && equipmentShapeOk(request.resource.data)
        && request.resource.data.createdBy == resource.data.createdBy
        && request.resource.data.createdAt == resource.data.createdAt
        // followUp is maintained by the onMessageCreated function only
        && (isAdmin() || !request.resource.data.diff(resource.data).affectedKeys().hasAny(['followUp', 'listedAt', 'listedByEmail', 'importBatch', 'reportStatus', 'reportStatusCode', 'offReport', 'offReportKeep', 'offReportKeepBy', 'deletedAt', 'deletedByEmail', 'deletedFromStatus', 'deletedReason', 'requestId']))
        && (
          isAdmin()
          || (resource.data.createdBy == request.auth.uid
              && request.resource.data.status == resource.data.status)
          || onlyAddsPhotos(id, resource.data.createdBy == 'daily-report')
        );

      allow delete: if isAdmin();

      // Messages thread on a unit. Anyone active can write (incl. viewers, e.g. a sales rep asking
      // for a better photo). Only the submitter or an admin can mark a follow-up done.
      // Messages are never edited; admins can delete them. The unit's followUp flag is set by a Cloud Function.
      // Private (internal) comments — hidden from view-only accounts. Editable by the submitter or an admin.
      match /private/{docId} {
        allow read: if canEdit();
        allow write: if canEdit()
          && docId == 'notes'
          && exists(/databases/$(database)/documents/equipment/$(id))
          && (isAdmin() || get(/databases/$(database)/documents/equipment/$(id)).data.createdBy == request.auth.uid)
          && request.resource.data.keys().hasOnly(['text', 'updatedAt', 'updatedByEmail'])
          && request.resource.data.text is string && request.resource.data.text.size() <= 5000
          && request.resource.data.updatedAt == request.time
          && request.resource.data.updatedByEmail == request.auth.token.email;
      }

      match /messages/{mid} {
        allow read: if isActive();
        allow create: if isActive()
          && exists(/databases/$(database)/documents/equipment/$(id))
          && request.resource.data.keys().hasOnly(['text', 'kind', 'mentions', 'authorId', 'authorName', 'authorEmail', 'createdAt'])
          && (request.resource.data.get('mentions', []) is list && request.resource.data.get('mentions', []).size() <= 25)
          && request.resource.data.authorId == request.auth.uid
          && request.resource.data.authorEmail == request.auth.token.email
          && request.resource.data.authorName is string && request.resource.data.authorName.size() <= 120
          && request.resource.data.createdAt == request.time
          && request.resource.data.text is string && request.resource.data.text.size() <= 4000
          && (
            (request.resource.data.kind in ['note', 'action'] && request.resource.data.text.size() > 0)
            || (request.resource.data.kind == 'resolved' && canEdit()
                && (isAdmin() || get(/databases/$(database)/documents/equipment/$(id)).data.createdBy in [request.auth.uid, 'daily-report']))
          );
        allow delete: if isAdmin();
      }
    }

    // ---------- photo requests (to-do list) ----------
    function requestShapeOk(d) {
      return d.make is string && d.make.size() <= 80
        && d.model is string && d.model.size() <= 80
        && d.serial is string && d.serial.size() <= 60
        && d.ein is string && d.ein.size() <= 40
        && d.warehouse is string && d.warehouse.size() <= 80
        && d.notes is string && d.notes.size() <= 2000
        && d.angles is list && d.angles.size() <= 20
        && (d.dueDate == null || (d.dueDate is string && d.dueDate.size() == 10))
        && d.status in ['open', 'done']
        && (d.serial.size() > 0 || d.ein.size() > 0 || d.model.size() > 0)
        && (d.get('year', null) == null || d.year is int)
        && (d.get('hours', null) == null || d.hours is number)
        && (d.get('importBatch', null) == null || (d.importBatch is string && d.importBatch.size() <= 40));
    }
    function userExists(uid) {
      return exists(/databases/$(database)/documents/users/$(uid));
    }
    // An assignee must be a real user, and the assignment is recorded as made by whoever made it.
    function assignmentOk(isCreate) {
      let d = request.resource.data;
      let changed = isCreate || d.diff(resource.data).affectedKeys().hasAny(['assignedTo', 'assignedToName', 'assignedBy']);
      return !changed
        || (d.assignedTo == null && d.assignedBy == null)
        || (d.assignedTo is string && userExists(d.assignedTo) && d.assignedBy == request.auth.uid);
    }
    // Checking off records the real person and time; reopening clears them; a linked unit must exist.
    function completionOk() {
      let d = request.resource.data;
      let touched = d.diff(resource.data).affectedKeys();
      return (
          !touched.hasAny(['status', 'completedAt', 'completedBy', 'completedByName'])
          || (d.status == 'done' && d.completedBy == request.auth.uid && d.completedAt == request.time)
          || (d.status == 'open' && d.completedBy == null && d.completedAt == null && d.completedByName == null)
        )
        && (!touched.hasAny(['equipmentId']) || d.equipmentId == null
            || exists(/databases/$(database)/documents/equipment/$(d.equipmentId)));
    }
    match /requests/{id} {
      allow read: if isActive();
      allow create: if isActive()
        && requestShapeOk(request.resource.data)
        && request.resource.data.status == 'open'
        && request.resource.data.createdBy == request.auth.uid
        && request.resource.data.createdAt == request.time
        && assignmentOk(true)
        && (request.resource.data.equipmentId == null
            || exists(/databases/$(database)/documents/equipment/$(request.resource.data.equipmentId)));
      // Admins/employees can check a request off / reopen it; the requester (even a viewer) or an admin can also edit it.
      allow update: if isActive()
        && requestShapeOk(request.resource.data)
        && request.resource.data.createdBy == resource.data.createdBy
        && request.resource.data.createdAt == resource.data.createdAt
        && completionOk()
        && assignmentOk(false)
        && (
          isAdmin()
          || resource.data.createdBy == request.auth.uid
          || (canEdit() && request.resource.data.diff(resource.data).affectedKeys()
               .hasOnly(['status', 'completedAt', 'completedBy', 'completedByName', 'equipmentId', 'updatedAt']))
        );
      allow delete: if isAdmin() || (isActive() && resource.data.createdBy == request.auth.uid);
    }

    // ---------- request imports (one record per batch → one summary email) ----------
    // Daily report import: run history and "already imported" markers — written by Cloud Functions only.
    match /reportRuns/{id} {
      allow read: if isAdmin();
      allow write: if false;
    }
    match /reportImports/{id} {
      allow read: if isAdmin();
      allow write: if false;
    }

    match /requestImports/{id} {
      allow read: if isAdmin() || (isActive() && resource.data.createdBy == request.auth.uid);
      allow create: if isActive()
        && request.resource.data.keys().hasOnly(['count', 'assignedTo', 'createdBy', 'createdByName', 'createdAt'])
        && request.resource.data.createdBy == request.auth.uid
        && request.resource.data.createdAt == request.time
        && request.resource.data.count is int && request.resource.data.count > 0 && request.resource.data.count <= 1000
        && (request.resource.data.assignedTo == null || userExists(request.resource.data.assignedTo));
      allow update, delete: if false;
    }

    // ---------- email send log (written by Cloud Functions) ----------
    match /mailLog/{id} {
      allow read: if isAdmin();
      allow write: if false;
    }
  }
}
```

## `index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <meta name="theme-color" content="#000000" />
    <title>Used Equipment · K.C. Bobcat</title>
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="preload" href="/kc-bobcat-logo.png" as="image" />
    <link rel="preconnect" href="https://use.typekit.net" crossorigin />
    <link rel="stylesheet" href="https://use.typekit.net/hvz7keh.css" />
  </head>
  <body>
    <div id="app"><div class="center-screen"><div class="spinner"></div></div></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

## `package.json`

```json
{
  "name": "kcb-used-equipment",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "dev:emulators": "VITE_USE_EMULATORS=true vite",
    "build": "vite build",
    "preview": "vite preview",
    "emulators": "firebase emulators:start --project demo-used-equipment",
    "test:rules": "firebase emulators:exec --only firestore,storage --project demo-used-equipment \"node --test tests/rules.test.js\"",
    "deploy": "npm run build && firebase deploy",
    "test:import": "node --test tests/import-parse.test.mjs && cd functions && node --test ../tests/report-import.test.mjs"
  },
  "dependencies": {
    "firebase": "^13.1.0",
    "jszip": "^3.10.2",
    "pdfjs-dist": "^5.7.284"
  },
  "devDependencies": {
    "@firebase/rules-unit-testing": "^6.0.0",
    "vite": "^8.3.5"
  }
}
```

## `storage.rules`

```javascript
rules_version = '2';

// Uses cross-service rules (Storage reading Firestore). The first time you deploy,
// the Firebase CLI / console asks you to allow Storage to read Firestore — say yes.
service firebase.storage {
  match /b/{bucket}/o {

    function profilePath() {
      return /databases/(default)/documents/users/$(request.auth.uid);
    }
    function isActive() {
      return request.auth != null
        && firestore.exists(profilePath())
        && firestore.get(profilePath()).data.active == true;
    }
    function isAdmin() {
      return isActive() && firestore.get(profilePath()).data.role == 'admin';
    }

    // equipment/{equipmentId}/{fileName}  (photos + thumbnails)
    match /equipment/{equipmentId}/{fileName} {
      allow read: if isActive();
      // Create only: uploads always use new timestamped names, so nobody can overwrite an existing photo.
      // Viewers (view-only accounts) can't upload.
      allow create: if isActive()
        && firestore.get(profilePath()).data.get('role', 'employee') in ['admin', 'employee']
        && request.resource.size < 30 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
      allow delete: if isAdmin();
    }

    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

## `vite.config.js`

```js
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // The Firebase SDK alone is ~600 kB minified; that's expected for this app.
    chunkSizeWarningLimit: 900,
  },
});
```

## `src/config.js`

```js
// App-wide constants. Change these to adjust the form and table without touching page code.

// Photo slots, in the order shown on the form. `key` is stored in the database — don't rename once in use.
export const PHOTO_SLOTS = [
  { key: 'rightSide', label: 'Right Side' },
  { key: 'rightSideRear', label: 'Right Side Rear' },
  { key: 'rearEngine', label: 'Rear Engine' },
  { key: 'leftRear', label: 'Left Rear' },
  { key: 'leftSide', label: 'Left Side' },
  { key: 'leftFront', label: 'Left Front' },
  { key: 'front', label: 'Front' },
  { key: 'rightFront', label: 'Right Front' },
  { key: 'interior', label: 'Interior' },
  { key: 'hourMeter', label: 'Hour Meter' },
  { key: 'serialPlate', label: 'Serial Plate' },
];

// Example shots (public/examples/<key>.jpg, plus a -sm.jpg thumbnail) shown on Instructions and behind empty slots.
// Angles without an entry just show the label.
const EXAMPLE_KEYS = ['rightSide', 'rightSideRear', 'rearEngine', 'leftRear', 'leftSide', 'leftFront', 'front', 'rightFront', 'interior', 'hourMeter', 'serialPlate'];
export const EXAMPLE_PHOTOS = Object.fromEntries(EXAMPLE_KEYS.map((k) => [k, { full: `/examples/${k}.jpg`, small: `/examples/${k}-sm.jpg` }]));

// When true, every slot needs a photo before a unit can be submitted. Off: crews don’t always get every angle.
export const ALL_PHOTOS_REQUIRED = false;

// Photo used as the thumbnail in the table (falls back to the first available photo).
export const COVER_SLOT = 'rightFront';

// Keys are stored on each unit — don't rename. Pending tab = active + hidden; Listed tab = archived.
export const STATUSES = [
  { key: 'active', label: 'Pending' },
  { key: 'hidden', label: 'Hidden' },
  { key: 'archived', label: 'Listed' },
];

// Access levels. Keys are stored on each user — don't rename once in use.
export const ROLES = [
  { key: 'admin', label: 'Admin', desc: 'Everything, plus users, settings, status changes, archive and delete' },
  { key: 'employee', label: 'Employee', desc: 'Submits units, uploads photos, fills photo requests' },
  { key: 'viewer', label: 'Viewer', desc: 'View and download only (e.g. sales reps); can ask for photos' },
];
export const roleLabel = (key) => ROLES.find((r) => r.key === key)?.label || 'Employee';

export const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor'];

// Used if an admin hasn't set a warehouse list yet (Admin → Settings).
// Units that drop off the daily equipment report are deleted after this many days (must match functions/report-import.js).
export const OFF_REPORT_DAYS = 60;

export const DEFAULT_WAREHOUSES = ['Kansas City'];

// Thumbnail size (longest edge, px) generated in the browser for fast table/grid loading.
export const THUMB_MAX = 480;
```

## `src/data.js`

```js
import {
  collection, doc, onSnapshot, query, orderBy, where, getDocs, setDoc, updateDoc,
  deleteDoc, serverTimestamp, getDoc, limit, writeBatch, deleteField,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { db, storage, functions, auth } from './firebase.js';
import { PHOTO_SLOTS, COVER_SLOT, THUMB_MAX, DEFAULT_WAREHOUSES } from './config.js';
import { store } from './store.js';
import { h } from './ui.js';

const equipmentCol = collection(db, 'equipment');
const snapOpts = { serverTimestamps: 'estimate' };

// ---------- equipment ----------

export function newEquipmentId() {
  return doc(equipmentCol).id;
}

export function subscribeEquipment(onData, onError) {
  const q = query(equipmentCol, orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data(snapOpts) }))),
    onError,
  );
}

export function subscribeEquipmentDoc(id, onData, onError) {
  return onSnapshot(
    doc(db, 'equipment', id),
    (d) => onData(d.exists() ? { id: d.id, ...d.data(snapOpts) } : null),
    onError,
  );
}

export async function getEquipment(id) {
  const d = await getDoc(doc(db, 'equipment', id));
  return d.exists() ? { id: d.id, ...d.data(snapOpts) } : null;
}

export async function createEquipment(id, fields, photos) {
  const user = auth.currentUser;
  await setDoc(doc(db, 'equipment', id), {
    ...fields,
    photos,
    status: 'active',
    createdBy: user.uid,
    createdByEmail: user.email,
    createdByName: user.displayName || user.email,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateEquipment(id, fields) {
  const user = auth.currentUser;
  await updateDoc(doc(db, 'equipment', id), {
    ...fields,
    updatedAt: serverTimestamp(),
    updatedByEmail: user.email,
  });
}

/** Changing to Listed records when and by whom (e.g. for clean-up after it sells). */
export function setStatus(id, status) {
  if (status === 'hidden') return updateEquipment(id, { status });
  const listed = status === 'archived';
  return updateEquipment(id, {
    status,
    listedAt: listed ? serverTimestamp() : null,
    listedByEmail: listed ? auth.currentUser.email : null,
  });
}

/** Admin: keep a unit that dropped off the daily report (never auto-delete it), or allow auto-delete again. */
export function setOffReportKeep(id, keep) {
  return updateEquipment(id, keep ? { offReportKeep: true, offReportKeepBy: auth.currentUser.email, offReport: deleteField() } : { offReportKeep: false, offReportKeepBy: null });
}

export const TRASH_DAYS = 30;

/** Moves a unit to Deleted units (restorable for TRASH_DAYS; then removed with its photos by purgeDeletedUnits). */
export function deleteEquipment(id, fromStatus) {
  return updateEquipment(id, {
    status: 'deleted',
    deletedAt: serverTimestamp(),
    deletedByEmail: auth.currentUser.email,
    deletedFromStatus: fromStatus === 'deleted' ? 'active' : fromStatus || 'active',
    deletedReason: null,
  });
}

/** Back to the tab it was deleted from. A unit auto-deleted for being off the report is also marked Keep. */
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

/** Permanently deletes a unit; its photos, messages and requests are removed by the onEquipmentDeleted function. */
export function purgeEquipment(id) {
  return deleteDoc(doc(db, 'equipment', id));
}

/** Returns other units with the same serial number (case-insensitive match on the normalized field). */
export async function findBySerial(serial, excludeId) {
  const q = query(equipmentCol, where('serialKey', '==', normalizeKey(serial)), limit(5));
  const snap = await getDocs(q);
  return snap.docs.filter((d) => d.id !== excludeId && d.get('status') !== 'deleted').map((d) => ({ id: d.id, ...d.data() }));
}

export function normalizeKey(s) {
  return String(s || '').trim().toUpperCase().replace(/\s+/g, '');
}

export function coverThumb(eq) {
  const p = eq.photos || {};
  const pick = p[COVER_SLOT] || PHOTO_SLOTS.map((s) => p[s.key]).find(Boolean);
  return pick ? pick.thumbUrl || pick.url : null;
}

/** Adds photos to empty slots only (any active user — e.g. fulfilling a photo request). */
export async function addPhotos(id, photos) {
  const user = auth.currentUser;
  const patch = Object.fromEntries(Object.entries(photos).map(([k, v]) => [`photos.${k}`, v]));
  await updateDoc(doc(db, 'equipment', id), { ...patch, updatedAt: serverTimestamp(), updatedByEmail: user.email });
}

// ---------- private (internal) comments: equipment/{id}/private/notes ----------
// Kept in a separate document so the security rules can hide it from view-only accounts.

export async function getPrivateNotes(equipmentId) {
  const d = await getDoc(doc(db, 'equipment', equipmentId, 'private', 'notes'));
  return d.exists() ? d.data().text || '' : '';
}

export function subscribePrivateNotes(equipmentId, onData, onError) {
  return onSnapshot(doc(db, 'equipment', equipmentId, 'private', 'notes'), (d) => onData(d.exists() ? d.data(snapOpts) : null), onError);
}

export function savePrivateNotes(equipmentId, text) {
  return setDoc(doc(db, 'equipment', equipmentId, 'private', 'notes'), {
    text,
    updatedAt: serverTimestamp(),
    updatedByEmail: auth.currentUser.email,
  });
}

// ---------- messages on a unit (write back to the submitter) ----------

export function subscribeMessages(equipmentId, onData, onError) {
  return onSnapshot(
    query(collection(db, 'equipment', equipmentId, 'messages'), orderBy('createdAt', 'asc')),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data(snapOpts) }))),
    onError,
  );
}

/** kind: 'note' (plain message), 'action' (needs more photos / changes), 'resolved' (follow-up done). */
export function postMessage(equipmentId, { text, kind = 'note', mentions = [] }) {
  const user = auth.currentUser;
  const { profile } = store.get();
  return setDoc(doc(collection(db, 'equipment', equipmentId, 'messages')), {
    text: text || '',
    kind,
    mentions: [...new Set(mentions)].slice(0, 25), // uids of @-tagged people — they're emailed
    authorId: user.uid,
    authorName: profile?.displayName || user.email,
    authorEmail: user.email,
    createdAt: serverTimestamp(),
  });
}

// ---------- photo requests ----------

const requestsCol = collection(db, 'requests');

export function subscribeRequests(onData, onError) {
  return onSnapshot(
    query(requestsCol, orderBy('createdAt', 'desc')),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data(snapOpts) }))),
    onError,
  );
}

export async function getRequest(id) {
  const d = await getDoc(doc(db, 'requests', id));
  return d.exists() ? { id: d.id, ...d.data(snapOpts) } : null;
}

export async function createRequest(fields) {
  const user = auth.currentUser;
  const { profile } = store.get();
  await setDoc(doc(requestsCol), {
    ...fields,
    serialKey: normalizeKey(fields.serial),
    status: 'open',
    equipmentId: fields.equipmentId || null, // only set when the requester confirmed the match
    assignedTo: fields.assignedTo || null,
    assignedToName: fields.assignedTo ? fields.assignedToName || null : null,
    assignedBy: fields.assignedTo ? user.uid : null,
    completedAt: null,
    completedBy: null,
    completedByName: null,
    createdBy: user.uid,
    createdByEmail: user.email,
    createdByName: profile?.displayName || user.email,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Creates many photo requests at once (import). Each gets the same `importBatch` id so the
 * assignee receives ONE summary email instead of one per request. Returns the batch id.
 */
export async function createRequestsBatch(list, { assignee = null } = {}) {
  const user = auth.currentUser;
  const { profile } = store.get();
  const importRef = doc(collection(db, 'requestImports'));
  const base = {
    status: 'open',
    completedAt: null,
    completedBy: null,
    completedByName: null,
    assignedTo: assignee?.uid || null,
    assignedToName: assignee ? assignee.displayName || assignee.email : null,
    assignedBy: assignee ? user.uid : null,
    createdBy: user.uid,
    createdByEmail: user.email,
    createdByName: profile?.displayName || user.email,
    importBatch: importRef.id,
  };
  // Small batches: the security rules look up each linked unit, and Firestore allows 20 lookups per batch.
  const CHUNK = 10;
  for (let i = 0; i < list.length; i += CHUNK) {
    const batch = writeBatch(db);
    for (const fields of list.slice(i, i + CHUNK)) {
      batch.set(doc(requestsCol), {
        ...fields,
        ...base,
        serialKey: normalizeKey(fields.serial),
        equipmentId: fields.equipmentId || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  }
  // Written last: the Cloud Function sends the summary email when this appears.
  await setDoc(importRef, {
    count: list.length,
    assignedTo: base.assignedTo,
    createdBy: user.uid,
    createdByName: base.createdByName,
    createdAt: serverTimestamp(),
  });
  return importRef.id;
}

export async function completeRequest(id, equipmentId = null) {
  const user = auth.currentUser;
  const { profile } = store.get();
  const patch = {
    status: 'done',
    completedAt: serverTimestamp(),
    completedBy: user.uid,
    completedByName: profile?.displayName || user.email,
    updatedAt: serverTimestamp(),
  };
  if (equipmentId) patch.equipmentId = equipmentId;
  await updateDoc(doc(db, 'requests', id), patch);
}

export function reopenRequest(id) {
  return updateDoc(doc(db, 'requests', id), {
    status: 'open',
    completedAt: null,
    completedBy: null,
    completedByName: null,
    updatedAt: serverTimestamp(),
  });
}

export function deleteRequest(id) {
  return deleteDoc(doc(db, 'requests', id));
}

/**
 * Suggests a unit already in inventory that a request might be about. Only a suggestion —
 * the requester confirms it before the request is linked. Exact serial match first, then exact EIN.
 */
export function findCandidate({ serial, ein }, equipment) {
  if (!equipment) return null;
  const sk = normalizeKey(serial);
  const ek = normalizeKey(ein);
  const bySerial = sk && equipment.find((e) => e.serialKey === sk);
  if (bySerial) return { eq: bySerial, by: 'serial' };
  const byEin = ek && equipment.find((e) => normalizeKey(e.ein) === ek);
  return byEin ? { eq: byEin, by: 'EIN' } : null;
}

export function linkRequest(id, equipmentId) {
  return updateDoc(doc(db, 'requests', id), { equipmentId: equipmentId || null, updatedAt: serverTimestamp() });
}

export function assignRequest(id, assignee) {
  return updateDoc(doc(db, 'requests', id), {
    assignedTo: assignee?.uid || null,
    assignedToName: assignee ? assignee.displayName || assignee.email : null,
    assignedBy: assignee ? auth.currentUser.uid : null,
    updatedAt: serverTimestamp(),
  });
}

// ---------- photos ----------

function extFor(file) {
  const fromName = (file.name.split('.').pop() || '').toLowerCase();
  if (/^(jpe?g|png|webp|heic|heif|gif)$/.test(fromName)) return fromName;
  return (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
}

/** Builds a JPEG thumbnail in the browser. Resolves to null if the browser can't decode the image (e.g. HEIC on Chrome). */
export async function makeThumb(file, max = THUMB_MAX) {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const hgt = Math.round(bmp.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = hgt;
    canvas.getContext('2d').drawImage(bmp, 0, 0, w, hgt);
    bmp.close?.();
    return await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.8));
  } catch {
    return null;
  }
}

function uploadWithProgress(path, blob, contentType, onProgress) {
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(ref(storage, path), blob, {
      contentType,
      cacheControl: 'public, max-age=31536000',
    });
    task.on(
      'state_changed',
      (s) => onProgress?.(s.bytesTransferred, s.totalBytes),
      reject,
      async () => resolve(await getDownloadURL(task.snapshot.ref)),
    );
  });
}

/**
 * Uploads one slot's photo (+ thumbnail). Returns the object stored under equipment.photos[slotKey].
 * onProgress(fraction 0..1)
 */
export async function uploadPhoto(equipmentId, slotKey, file, onProgress) {
  const stamp = Date.now();
  const base = `equipment/${equipmentId}/${slotKey}-${stamp}`;
  const path = `${base}.${extFor(file)}`;
  const thumbBlob = await makeThumb(file);
  const total = file.size + (thumbBlob?.size || 0);
  let mainDone = 0;
  let thumbDone = 0;
  const report = () => onProgress?.(total ? (mainDone + thumbDone) / total : 1);

  const contentType = file.type || 'image/jpeg';
  const [url, thumb] = await Promise.all([
    uploadWithProgress(path, file, contentType, (b) => { mainDone = b; report(); }),
    thumbBlob
      ? uploadWithProgress(`${base}-thumb.jpg`, thumbBlob, 'image/jpeg', (b) => { thumbDone = b; report(); })
          .then((u) => ({ url: u, path: `${base}-thumb.jpg` }))
      : Promise.resolve(null),
  ]);

  return {
    path,
    url,
    thumbPath: thumb?.path || null,
    thumbUrl: thumb?.url || null,
    name: file.name,
    size: file.size,
    contentType,
    uploadedAt: new Date().toISOString(),
    uploadedBy: auth.currentUser?.email || null,
  };
}

// ---------- downloads ----------

function safe(s) {
  return String(s || '').trim().replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '') || 'unit';
}

export function unitFileBase(eq) {
  return safe([eq.ein || eq.serial, eq.make, eq.model].filter(Boolean).join('-'));
}

function photoFileName(eq, slot, photo) {
  const ext = (photo.path.split('.').pop() || 'jpg').toLowerCase();
  const idx = PHOTO_SLOTS.findIndex((s) => s.key === slot.key) + 1;
  return `${unitFileBase(eq)}_${String(idx).padStart(2, '0')}-${safe(slot.label)}.${ext}`;
}

// Downloads go through /api/download on our own domain (the downloadPhotos function streams the files),
// so they don't depend on the Storage bucket's CORS setting. A hidden form posts the sign-in token.
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
    frame.addEventListener('load', () => {
      clearTimeout(done);
      let text = '';
      try {
        text = frame.contentDocument?.body?.innerText?.trim() || '';
      } catch {
        /* cross-origin: shouldn't happen */
      }
      cleanup(() => (text ? reject(new Error(text)) : resolve()));
    });
    form.submit();
    function cleanup(next) {
      setTimeout(() => {
        frame.remove();
        form.remove();
      }, 60000); // keep the frame alive while a big zip streams
      next();
    }
  });
}

export async function downloadPhoto(eq, slotKey) {
  if (!eq.photos?.[slotKey]) return;
  await postDownload({ id: eq.id, slot: slotKey });
}

export async function downloadAllPhotos(eq, onProgress) {
  const n = PHOTO_SLOTS.filter((s) => eq.photos?.[s.key]).length;
  onProgress?.(0, n);
  await postDownload({ id: eq.id });
}

// ---------- settings ----------

const settingsRef = doc(db, 'settings', 'app');

export function subscribeSettings(onData) {
  return onSnapshot(
    settingsRef,
    (d) => {
      const s = d.exists() ? d.data() : {};
      onData({ warehouses: s.warehouses?.length ? s.warehouses : DEFAULT_WAREHOUSES });
    },
    () => onData({ warehouses: DEFAULT_WAREHOUSES }),
  );
}

export function saveSettings(data) {
  return setDoc(settingsRef, data, { merge: true });
}

// ---------- users (admin) ----------

export function subscribeUsers(onData, onError) {
  return onSnapshot(
    query(collection(db, 'users'), orderBy('email')),
    (snap) => onData(snap.docs.map((d) => ({ uid: d.id, ...d.data() }))),
    onError,
  );
}

export const callCreateUser = httpsCallable(functions, 'createUser');
export const callUpdateUser = httpsCallable(functions, 'updateUser');

/** Saves email-notification settings (a user for themselves, or an admin for anyone). */
export function saveNotifications(uid, { newUnits, locations, assigned, messages = true, photosReady = true }) {
  return updateDoc(doc(db, 'users', uid), {
    notifyNewUnits: newUnits,
    notifyLocations: locations,
    notifyAssigned: assigned,
    notifyMessages: messages,
    notifyPhotosReady: photosReady,
    notifyUpdatedAt: serverTimestamp(),
  });
}
export const callAdminPassword = httpsCallable(functions, 'adminPassword');
export const callDeleteUser = httpsCallable(functions, 'deleteUser');
export const callSendTestEmail = httpsCallable(functions, 'sendTestEmail');
export const callSetupDownloads = httpsCallable(functions, 'setupDownloads');

export function subscribeMailLog(onData, onError) {
  return onSnapshot(
    query(collection(db, 'mailLog'), orderBy('createdAt', 'desc'), limit(15)),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data(snapOpts) }))),
    onError,
  );
}

// ---------- daily report import (admin) ----------

const reportSettingsRef = doc(db, 'settings', 'reportImport');

export function subscribeReportSettings(onData, onError) {
  return onSnapshot(reportSettingsRef, (d) => onData(d.exists() ? d.data(snapOpts) : {}), onError);
}

/** Replaces the whole warehouse-code map (a merge would keep removed codes). */
export function saveReportCodes(codes) {
  return updateDoc(reportSettingsRef, { codes, updatedAt: serverTimestamp(), updatedByEmail: auth.currentUser.email }).catch((err) =>
    err.code === 'not-found' ? setDoc(reportSettingsRef, { codes }) : Promise.reject(err),
  );
}

export function saveReportSettings(data) {
  return setDoc(reportSettingsRef, { ...data, updatedAt: serverTimestamp(), updatedByEmail: auth.currentUser.email }, { merge: true });
}

export function subscribeReportRuns(onData, onError) {
  const q = query(collection(db, 'reportRuns'), orderBy('at', 'desc'), limit(10));
  return onSnapshot(q, (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data(snapOpts) }))), onError);
}

export const callRunReportImport = httpsCallable(functions, 'runReportImport', { timeout: 300_000 });

export async function fileToBase64(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
```

## `src/firebase-config.js`

```js
// Paste your web app config from:
// Firebase console → Project settings → General → Your apps → Web app → SDK setup and configuration.
// These values are not secrets; access is enforced by firestore.rules and storage.rules.
export const firebaseConfig = {
  apiKey: '<FIREBASE_WEB_API_KEY>',
  authDomain: 'kcb-used.firebaseapp.com',
  projectId: 'kcb-used',
  storageBucket: 'kcb-used.firebasestorage.app',
  messagingSenderId: '1002695942770',
  appId: '1:1002695942770:web:1c37ddb6f5b5b4e16298eb',
};

// Cloud Functions region (must match functions/index.js).
export const FUNCTIONS_REGION = 'us-central1';
```

## `src/firebase.js`

```js
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { firebaseConfig, FUNCTIONS_REGION } from './firebase-config.js';

const useEmulators = import.meta.env.VITE_USE_EMULATORS === 'true';

const config = useEmulators
  ? { ...firebaseConfig, apiKey: 'demo-key', projectId: 'demo-used-equipment', storageBucket: 'demo-used-equipment.appspot.com' }
  : firebaseConfig;

export const app = initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, FUNCTIONS_REGION);

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}
```

## `src/import-parse.js`

```js
// The parser is shared with the daily-import Cloud Function, so it lives in functions/shared.
export * from '../functions/shared/report-parse.js';
```

## `src/main.js`

```js
import './styles.css';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase.js';
import { store } from './store.js';
import { h, clear, icon, confirmDialog } from './ui.js';
import { subscribeEquipment, subscribeSettings, subscribeRequests, subscribeUsers } from './data.js';
import { renderLogin } from './pages/login.js';
import { renderInventory } from './pages/inventory.js';
import { renderSubmit } from './pages/submit.js';
import { renderDetail } from './pages/detail.js';
import { renderUsers } from './pages/users.js';
import { renderSettings } from './pages/settings.js';
import { renderAccount } from './pages/account.js';
import { renderRequests, renderNewRequest } from './pages/requests.js';
import { renderImportRequests } from './pages/import-requests.js';
import { renderInstructions } from './pages/instructions.js';
import { renderDeleted } from './pages/deleted.js';
import { roleLabel } from './config.js';
import { renderFirstPassword } from './pages/first-password.js';

const root = document.getElementById('app');
let unsubs = [];
let pageCleanup = null;

function stopListeners() {
  unsubs.forEach((u) => u());
  unsubs = [];
}

onAuthStateChanged(auth, (user) => {
  stopListeners();
  store.set({ user, profile: null, equipment: null, requests: null, users: [] });
  if (!user) {
    renderPage();
    return;
  }
  unsubs.push(
    onSnapshot(
      doc(db, 'users', user.uid),
      (d) => {
        const profile = d.exists() ? d.data() : { missing: true };
        const prev = store.get().profile;
        store.set({ profile });
        if (profile.active && !prev?.active) startDataListeners();
        // Only rebuild the page when access actually changes, so an in-progress form isn't wiped.
        if (!prev || prev.active !== profile.active || prev.role !== profile.role || prev.missing !== profile.missing || Boolean(prev.mustChangePassword) !== Boolean(profile.mustChangePassword)) {
          renderPage();
        }
      },
      () => {
        store.set({ profile: { missing: true } });
        renderPage();
      },
    ),
  );
});

function startDataListeners() {
  unsubs.push(
    subscribeEquipment(
      // Deleted units are kept 30 days (restorable) but left out of every list except Deleted units.
      (all) => store.set({ equipment: all.filter((e) => e.status !== 'deleted'), trash: all.filter((e) => e.status === 'deleted'), equipmentError: null }),
      (err) => store.set({ equipmentError: err.message }),
    ),
    subscribeSettings((settings) => store.set({ settings })),
    subscribeRequests(
      (requests) => store.set({ requests, requestsError: null }),
      (err) => store.set({ requestsError: err.message }),
    ),
    // Staff list for "Assign to" pickers.
    subscribeUsers(
      (users) => store.set({ users }),
      () => store.set({ users: [] }),
    ),
  );
}

// ---------- routing ----------

const routes = [
  { pattern: /^\/?$/, page: (p) => renderInventory(p, { archive: false }), nav: 'inventory', work: 'pending' },
  { pattern: /^\/(listed|archive)$/, page: (p) => renderInventory(p, { archive: true }), nav: 'archive' },
  { pattern: /^\/new(?:\?request=([\w-]+))?$/, page: (p, m) => renderSubmit(p, { requestId: m[1] }), nav: 'new', edit: true },
  { pattern: /^\/equipment\/([\w-]+)(?:\?messages)?$/, page: (p, m) => renderDetail(p, m[1]), nav: 'inventory' },
  { pattern: /^\/equipment\/([\w-]+)\/edit(?:\?request=([\w-]+))?$/, page: (p, m) => renderSubmit(p, { id: m[1], requestId: m[2] }), nav: 'inventory', edit: true },
  { pattern: /^\/requests$/, page: renderRequests, nav: 'inventory', work: 'requests' },
  { pattern: /^\/requests\/new$/, page: renderNewRequest, nav: 'inventory' },
  { pattern: /^\/requests\/import$/, page: renderImportRequests, nav: 'inventory' },
  { pattern: /^\/admin\/users$/, page: renderUsers, nav: 'users', admin: true },
  { pattern: /^\/admin\/settings(?:\/(locations|report|email))?$/, page: renderSettings, nav: 'settings', admin: true },
  { pattern: /^\/admin\/(report)$/, page: renderSettings, nav: 'settings', admin: true }, // old link (emails)
  { pattern: /^\/instructions$/, page: renderInstructions, nav: 'instructions' },
  { pattern: /^\/deleted$/, page: renderDeleted, nav: 'deleted', admin: true },
  { pattern: /^\/account$/, page: renderAccount, nav: 'account' },
];

export function navigate(path) {
  if (location.hash !== `#${path}`) location.hash = path;
  else renderPage();
}


// A page with unsaved work (the submit form) registers a guard; in-app navigation asks before discarding it.
let leaveGuard = null;
let lastHash = location.hash;
let reverting = false;
export function setLeaveGuard(fn) {
  leaveGuard = fn;
}

// Close the Add / user dropdowns when clicking anywhere else.
document.addEventListener('click', (e) => {
  document.querySelectorAll('details.add-menu[open], details.user-menu[open]').forEach((d) => {
    if (!d.contains(e.target)) d.open = false;
  });
});

window.addEventListener('hashchange', async () => {
  if (reverting) {
    reverting = false;
    return;
  }
  if (leaveGuard?.()) {
    const target = location.hash;
    reverting = true;
    location.hash = lastHash; // stay put while asking
    const ok = await confirmDialog({
      title: 'Discard this submission?',
      message: 'You have unsaved details or photos on this form. Leaving will lose them.',
      confirmLabel: 'Discard',
      danger: true,
    });
    if (!ok) return;
    leaveGuard = null;
    location.hash = target;
    return;
  }
  lastHash = location.hash;
  renderPage();
});

function currentPath() {
  return location.hash.replace(/^#/, '') || '/';
}

let shellUnsub = null;

function renderPage() {
  pageCleanup?.();
  pageCleanup = null;
  shellUnsub?.();
  shellUnsub = null;
  clear(root);

  const { user, profile } = store.get();
  if (!user) {
    root.append(renderLogin());
    return;
  }
  if (!profile) {
    root.append(h('div', { class: 'center-screen' }, h('div', { class: 'spinner' })));
    return;
  }
  if (profile.missing || !profile.active) {
    root.append(
      h(
        'div',
        { class: 'center-screen' },
        h(
          'div',
          { class: 'card narrow' },
          h('h2', {}, 'Account not active'),
          h(
            'p',
            { class: 'muted' },
            `You're signed in as ${user.email}, but this account hasn't been set up for the used equipment dashboard. Ask an admin to add or reactivate you.`,
          ),
          h('button', { class: 'btn btn-primary', onclick: () => signOut(auth) }, 'Sign out'),
        ),
      ),
    );
    return;
  }

  if (profile.mustChangePassword) {
    root.append(renderFirstPassword({ user, profile }));
    return;
  }

  const path = currentPath();
  let match = null;
  const route = routes.find((r) => (match = path.match(r.pattern)));
  const page = h('main', { class: 'page' });
  root.append(shell(route?.nav), page);

  if (!route) {
    page.append(h('div', { class: 'card narrow' }, h('h2', {}, 'Page not found'), h('a', { href: '#/' }, 'Back to Pending')));
    return;
  }
  if (route.admin && !store.isAdmin()) {
    page.append(h('div', { class: 'card narrow' }, h('h2', {}, 'Admins only'), h('p', { class: 'muted' }, 'You need admin access to view this page.')));
    return;
  }
  if (route.edit && !store.canEdit()) {
    page.append(h('div', { class: 'card narrow' }, h('h2', {}, 'View-only access'), h('p', { class: 'muted' }, 'Your account can view and download units but not submit or change them. Need photos of a unit? Use Requests to ask for them.'), h('a', { href: '#/requests', class: 'btn btn-primary' }, 'Go to Requests')));
    return;
  }
  if (route.work) page.append(workTabs(route.work));
  pageCleanup = route.page(page, match) || null;
  window.scrollTo(0, 0);
}

// "Inventory" nav link with a count of MY units someone flagged for more photos/changes.
function inventoryLink(isActive) {
  const badge = h('span', { class: 'nav-badge', hidden: true, title: 'Your units that need more photos or changes' });
  const update = (s) => {
    const me = s.user?.uid;
    // Mine = units I submitted, or units whose photo request is assigned to me (e.g. from the daily report).
    const assigned = new Set((s.requests || []).filter((r) => r.assignedTo === me && r.equipmentId).map((r) => r.equipmentId));
    // To-dos for me: open photo requests assigned to me + my units flagged for more photos.
    const mine = (s.requests || []).filter((r) => r.status !== 'done' && r.assignedTo === me).length;
    const n = mine + (s.equipment || []).filter((e) => e.followUp?.open && (e.createdBy === me || assigned.has(e.id)) && e.status !== 'archived').length;
    badge.textContent = String(n);
    badge.hidden = n === 0;
  };
  update(store.get());
  const prev = shellUnsub;
  const unsubMine = store.subscribe(update);
  shellUnsub = () => {
    prev?.();
    unsubMine();
  };
  badge.title = 'Photo requests assigned to you and your units that need follow-up';
  return h('a', { href: '#/', class: `nav-link${isActive ? ' active' : ''}` }, 'Pending', badge);
}

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


export function shell(active) {
  const { profile, user } = store.get();
  const isAdmin = store.isAdmin();
  const link = (href, label, key, extra = {}) =>
    h('a', { href, class: `nav-link${active === key ? ' active' : ''}`, ...extra }, label);

  // Phones: the tabs collapse into a hamburger menu.
  const menuBtn = h(
    'button',
    {
      type: 'button',
      class: 'menu-toggle',
      'aria-label': 'Menu',
      'aria-expanded': 'false',
      'aria-controls': 'main-nav',
      onclick: () => {
        const open = !header.classList.contains('nav-open');
        header.classList.toggle('nav-open', open);
        menuBtn.setAttribute('aria-expanded', String(open));
        menuBtn.replaceChildren(icon(open ? 'x' : 'menu'));
      },
    },
    icon('menu'),
  );

  const header = h(
    'header',
    { class: 'topbar' },
    h(
      'div',
      { class: 'topbar-inner' },
      menuBtn,
      h(
        'a',
        { href: '#/', class: 'brand' },
        h('img', { src: '/kc-bobcat-logo.png', alt: 'K.C. Bobcat', class: 'brand-logo', width: 500, height: 278 }),
        h('span', { class: 'brand-text' }, 'Used Equipment'),
      ),
      h(
        'nav',
        { class: 'nav', id: 'main-nav' },
        inventoryLink(active === 'inventory'),
        link('#/listed', 'Listed', 'archive'),
        link('#/instructions', 'Instructions', 'instructions'),
        isAdmin && link('#/admin/users', 'Users', 'users'),
        isAdmin && link('#/admin/settings', 'Settings', 'settings'),
      ),
      h(
        'div',
        { class: 'topbar-right' },
        // "Add" menu: a new equipment listing (not for viewers) or a photo request (everyone).
        h(
          'details',
          { class: 'add-menu' },
          h('summary', { class: 'btn btn-primary btn-sm', 'aria-label': 'Add' }, icon('plus'), h('span', { class: 'add-label' }, 'Add'), h('span', { class: 'caret', 'aria-hidden': 'true' }, '▾')),
          h(
            'div',
            { class: 'add-menu-pop', onclick: (e) => e.target.closest('a') && (e.currentTarget.parentElement.open = false) },
            store.canEdit()
              ? h('a', { href: '#/new', class: 'add-item' }, h('strong', {}, 'Equipment listing'), h('span', { class: 'muted small' }, 'Add a unit with details and photos'))
              : null,
            h('a', { href: '#/requests/new', class: 'add-item' }, h('strong', {}, 'Photo request'), h('span', { class: 'muted small' }, 'Ask someone to take photos of a unit')),
            h('a', { href: '#/requests/import', class: 'add-item' }, h('strong', {}, 'Import photo requests'), h('span', { class: 'muted small' }, 'Many at once from an equipment list (PDF or CSV)')),
          ),
        ),
        h(
          'details',
          { class: 'user-menu' },
          h('summary', { title: user.email }, (profile.displayName || user.email).slice(0, 1).toUpperCase()),
          h(
            'div',
            { class: 'user-menu-pop' },
            h('div', { class: 'user-menu-name' }, profile.displayName || user.email),
            h('div', { class: 'muted small' }, user.email),
            h('div', { class: 'pill' }, roleLabel(profile.role)),
            h('a', { href: '#/account', class: 'btn btn-ghost btn-block', onclick: (e) => e.currentTarget.closest('details').open = false }, icon('key'), h('span', {}, 'Change password')),
            h('button', { class: 'btn btn-ghost btn-block', onclick: () => signOut(auth) }, 'Sign out'),
          ),
        ),
      ),
    ),
  );
  return header;
}
```

## `src/store.js`

```js
// Minimal shared state with subscribe/notify. Holds the signed-in profile,
// the live equipment list and app settings so pages don't each open their own listeners.

const state = {
  user: null, // Firebase Auth user
  profile: null, // users/{uid} document
  equipment: null, // array, null until first load
  equipmentError: null,
  settings: { warehouses: [] },
};
const listeners = new Set();

export const store = {
  get: () => state,
  set(patch) {
    Object.assign(state, patch);
    listeners.forEach((fn) => fn(state));
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  isAdmin: () => state.profile?.role === 'admin',
  // Admins and employees can submit units and upload photos; viewers can only look (and request photos).
  canEdit: () => ['admin', 'employee'].includes(state.profile?.role || 'employee'),
};
```

## `src/styles.css`

```css
:root {
  /* K.C. Bobcat palette (kcbobcat.com): orange #f30, grey #666, black #000 */
  --brand: #ff3300;
  --brand-dark: #cc2900;
  --brand-tint: #fff0eb;
  --slate: #000000;
  --slate-2: #333333;
  --ink: #000000;
  --muted: #666666;
  --line: #dddddd;
  --line-2: #eeeeee;
  --bg: #f2f2f2;
  --card: #ffffff;
  --green: #1f8a4c;
  --green-bg: #e3f5ea;
  --grey: #666666;
  --grey-bg: #ebebeb;
  --amber: #8a5a00;
  --amber-bg: #fdf1d8;
  --danger: #c62828;
  --danger-bg: #fdecec;
  --radius: 10px;
  --radius-sm: 6px;
  --shadow: 0 1px 2px rgba(0, 0, 0, 0.06), 0 1px 1px rgba(0, 0, 0, 0.04);
  --font: 'din-2014', 'DIN 2014', 'Barlow', 'Segoe UI', system-ui, -apple-system, sans-serif;
  --mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  color-scheme: light;
}

* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font);
  font-size: 15px;
  line-height: 1.45;
}
img { max-width: 100%; display: block; }
a { color: var(--brand-dark); }
h1, h2, h3 { margin: 0; line-height: 1.2; }
h1 { font-size: 1.75rem; font-weight: 700; letter-spacing: -0.01em; }
p { margin: 0.25rem 0 0; }
button, input, select, textarea { font: inherit; color: inherit; }
[hidden] { display: none !important; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

.muted { color: var(--muted); }
.small { font-size: 0.85rem; }
.block { display: block; }
.mono { font-family: var(--mono); font-size: 0.9em; letter-spacing: 0.01em; }
.prewrap { white-space: pre-wrap; }
.icon { width: 18px; height: 18px; flex: none; }

/* ---------- layout ---------- */
.page { max-width: 1280px; margin: 0 auto; padding: 24px 20px 64px; }
.page-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
.head-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.center-screen { min-height: 100vh; display: grid; place-items: center; padding: 20px; }
.center-pad { padding: 64px 0; display: grid; place-items: center; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); box-shadow: var(--shadow); padding: 20px; margin-bottom: 16px; }
.card.narrow { max-width: 460px; margin: 40px auto; }
.card.narrow-left { max-width: 640px; }
.section-title { font-size: 1.05rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--slate); }
.section-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
.section-head.pad { padding: 18px 20px 0; }
.section-head-actions { display: flex; align-items: center; gap: 12px; }
.back-link { display: inline-flex; align-items: center; gap: 4px; color: var(--muted); text-decoration: none; font-size: 0.9rem; margin-bottom: 6px; }
.back-link:hover { color: var(--brand-dark); }

/* ---------- top bar ---------- */
.topbar { background: #fff; color: var(--ink); position: sticky; top: 0; z-index: 20; border-bottom: 4px solid var(--brand); box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06); }
.topbar-inner { max-width: 1280px; margin: 0 auto; padding: 8px 20px; display: flex; align-items: center; gap: 24px; }
.brand { display: flex; align-items: center; gap: 12px; color: var(--ink); text-decoration: none; }
.brand-logo { height: 54px; width: auto; }
.brand-text { font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); border-left: 2px solid var(--line); padding-left: 12px; line-height: 1.2; }
.nav { display: flex; gap: 4px; flex: 1; }
.nav-link { color: var(--ink); text-decoration: none; padding: 8px 12px; font-weight: 700; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 0.04em; border-bottom: 3px solid transparent; }
.nav-link:hover { color: var(--brand); }
.nav-link.active { color: var(--brand); border-bottom-color: var(--brand); }
.topbar-right { display: flex; align-items: center; gap: 12px; }
.user-menu { position: relative; }
.user-menu summary { list-style: none; cursor: pointer; width: 36px; height: 36px; border-radius: 50%; background: #000; color: #fff; display: grid; place-items: center; font-weight: 700; }
.user-menu summary:hover, .user-menu[open] summary { background: var(--brand); }
.user-menu summary::-webkit-details-marker { display: none; }
.user-menu-pop { position: absolute; right: 0; top: 46px; background: #fff; color: var(--ink); border: 1px solid var(--line); border-radius: var(--radius); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14); padding: 14px; min-width: 240px; display: grid; gap: 6px; }
.user-menu-name { font-weight: 700; }
.pill { display: inline-block; justify-self: start; background: var(--grey-bg); color: var(--slate); border-radius: 999px; padding: 2px 10px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; margin: 4px 0; }
.pill.sm { margin: 0 0 0 6px; padding: 1px 7px; font-size: 0.68rem; vertical-align: 1px; }

/* ---------- buttons ---------- */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: 1px solid transparent; border-radius: var(--radius-sm); padding: 9px 16px; font-weight: 600; cursor: pointer; text-decoration: none; line-height: 1.2; white-space: nowrap; transition: background 0.12s, border-color 0.12s; }
.btn:disabled { opacity: 0.55; cursor: not-allowed; }
.btn-primary { background: var(--brand); color: #fff; }
.btn-primary:hover:not(:disabled) { background: var(--brand-dark); }
.btn-ghost { background: #fff; border-color: var(--line); color: var(--slate); }
.btn-ghost:hover:not(:disabled) { border-color: #c9ccd3; background: #fafbfc; }
.btn-danger { background: var(--danger); color: #fff; }
.btn-danger:hover:not(:disabled) { background: #a61f1f; }
.btn-sm { padding: 7px 12px; font-size: 0.9rem; }
.btn-lg { padding: 12px 24px; font-size: 1.05rem; }
.btn-block { width: 100%; }
.icon-btn { display: inline-grid; place-items: center; width: 34px; height: 34px; border-radius: var(--radius-sm); border: 1px solid transparent; background: transparent; color: var(--muted); cursor: pointer; }
.icon-btn:hover { background: var(--line-2); color: var(--ink); }
.icon-btn.sm { width: 28px; height: 28px; }
.icon-btn.danger:hover { background: var(--danger-bg); color: var(--danger); }
.icon-btn.light { color: #fff; }
.icon-btn.light:hover { background: rgba(255, 255, 255, 0.15); color: #fff; }
.link-btn { background: none; border: 0; padding: 0; color: var(--brand-dark); cursor: pointer; font-weight: 600; text-decoration: underline; text-underline-offset: 2px; }

/* ---------- forms ---------- */
.field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.field label { font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--slate-2); }
.field.wide { grid-column: 1 / -1; }
.req { color: var(--brand); }
.hint { font-size: 0.8rem; color: var(--muted); }
input:not([type='checkbox']):not([type='file']):not([type='radio']), select, textarea {
  width: 100%; border: 1px solid #cfd2d9; border-radius: var(--radius-sm); padding: 9px 11px; background: #fff; min-height: 40px;
}
textarea { resize: vertical; }
input:focus-visible, select:focus-visible, textarea:focus-visible, button:focus-visible, a:focus-visible, .eq-row:focus-visible {
  outline: 2px solid var(--brand); outline-offset: 1px;
}
.invalid { border-color: var(--danger) !important; background: #fffafa !important; }
.input-prefix { display: flex; align-items: stretch; }
.input-prefix span { display: grid; place-items: center; padding: 0 10px; border: 1px solid #cfd2d9; border-right: 0; border-radius: var(--radius-sm) 0 0 var(--radius-sm); background: var(--line-2); color: var(--muted); }
.input-prefix input { border-radius: 0 var(--radius-sm) var(--radius-sm) 0 !important; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
.form-msg { color: var(--danger); font-weight: 600; min-height: 1.2em; margin: 8px 0; }
.form-msg:empty { display: none; }
.form-msg.ok { color: var(--green); }
.form-actions { position: sticky; bottom: 0; background: linear-gradient(to top, var(--bg) 70%, rgba(244, 245, 247, 0)); padding: 16px 0 8px; z-index: 5; }
.form-actions-row { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
.submit-form.is-busy .photo-drop { pointer-events: none; }

/* ---------- login ---------- */
.login-screen { min-height: 100vh; display: grid; place-content: center; gap: 14px; padding: 20px; background: #000; }
.login-card { background: #fff; border-radius: 12px; padding: 28px 28px 24px; width: min(400px, calc(100vw - 32px)); display: grid; gap: 8px; border-top: 5px solid var(--brand); box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5); }
.login-card label { font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--slate-2); margin-top: 8px; }
.login-card .btn-primary { margin-top: 12px; padding: 12px; }
.login-card .link-btn { justify-self: center; margin-top: 6px; font-weight: 500; }
.login-brand { display: grid; justify-items: center; gap: 8px; margin-bottom: 10px; }
.login-logo { width: 190px; height: auto; }
.login-sub { color: var(--muted); font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; }
.login-foot { color: #999; text-align: center; font-size: 0.85rem; }

/* ---------- filters ---------- */
.filters { padding: 16px 20px; }
.search-wrap { position: relative; margin-bottom: 14px; }
.search-wrap .icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--muted); }
.search-wrap input.search-main { padding-left: 38px; min-height: 44px; font-size: 1rem; }
.filter-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
.filter-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; font-size: 0.9rem; }

/* ---------- tables ---------- */
.table-card { padding: 0; overflow: hidden; }
.table-scroll { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); font-weight: 700; padding: 10px 14px; background: #fafbfc; border-bottom: 1px solid var(--line); white-space: nowrap; }
th.sortable button { background: none; border: 0; padding: 0; font: inherit; color: inherit; text-transform: inherit; letter-spacing: inherit; cursor: pointer; display: inline-flex; gap: 4px; }
th.sorted { color: var(--slate); }
.sort-arrow { font-size: 0.65rem; color: var(--brand); }
td { padding: 10px 14px; border-bottom: 1px solid var(--line-2); vertical-align: middle; }
tbody tr:last-child td { border-bottom: 0; }
.eq-row { cursor: pointer; }
.eq-row:hover td { background: #fbfbfc; }
.col-photo { width: 92px; }
.thumb { width: 76px; height: 56px; object-fit: cover; border-radius: 5px; background: var(--line-2); }
.thumb-empty { display: grid; place-items: center; color: #b3b7c0; }
.col-status { white-space: nowrap; }
.col-status .icon-btn { vertical-align: middle; margin-left: 6px; }
.empty { padding: 48px 20px; text-align: center; color: var(--muted); display: grid; justify-items: center; gap: 12px; }
.empty .btn { margin-top: 12px; }
.users-table tr.inactive td { opacity: 0.6; }
.users-table select { width: auto; min-height: 34px; padding: 5px 8px; }

/* ---------- status ---------- */
.status-select { width: auto !important; min-height: 32px !important; padding: 4px 28px 4px 12px !important; border-radius: 999px !important; font-weight: 700; font-size: 0.85rem; cursor: pointer; border-width: 1px; }
.status-active { background-color: var(--green-bg) !important; color: var(--green); border-color: #b5e2c6 !important; }
.status-hidden { background-color: var(--grey-bg) !important; color: var(--grey); border-color: #d6d9df !important; }
.status-archived { background-color: var(--amber-bg) !important; color: var(--amber); border-color: #f1d9a6 !important; }
.status-badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-weight: 700; font-size: 0.85rem; border: 1px solid; }

/* ---------- photo slots (form) ---------- */
.photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 14px; }
.photo-tile { display: flex; flex-direction: column; gap: 6px; border-radius: var(--radius); }
.photo-drop { position: relative; aspect-ratio: 4 / 3; border: 2px dashed #c9ccd3; border-radius: var(--radius); background: #fafbfc; cursor: pointer; padding: 0; overflow: hidden; display: grid; place-items: center; transition: border-color 0.12s, background 0.12s; }
.photo-drop:hover, .photo-tile.drag .photo-drop { border-color: var(--brand); background: var(--brand-tint); }
.photo-tile.has-photo .photo-drop { border-style: solid; border-color: var(--line); }
.photo-tile.is-new .photo-drop { border-color: var(--brand); }
.photo-tile.invalid .photo-drop { border-color: var(--danger); background: var(--danger-bg); }
.photo-tile.done .photo-drop::after { content: '✓'; position: absolute; top: 6px; right: 6px; width: 24px; height: 24px; border-radius: 50%; background: var(--green); color: #fff; display: grid; place-items: center; font-weight: 700; font-size: 0.85rem; }
.photo-drop img { width: 100%; height: 100%; object-fit: cover; }
.photo-empty, .photo-fallback { display: flex; flex-direction: column; align-items: center; gap: 6px; color: var(--muted); font-size: 0.85rem; font-weight: 600; padding: 8px; text-align: center; word-break: break-all; }
.photo-empty .icon, .photo-fallback .icon { width: 28px; height: 28px; color: #a6abb5; }
.photo-progress { position: absolute; left: 0; bottom: 0; height: 4px; background: var(--brand); transition: width 0.2s; }
.photo-label { display: flex; justify-content: space-between; align-items: center; gap: 6px; font-weight: 600; font-size: 0.9rem; min-height: 28px; }
.bulk-hint { margin: -8px 0 14px; }
.upload-progress { margin-bottom: 4px; }
.upload-progress .bar { height: 8px; background: var(--line); border-radius: 99px; overflow: hidden; }
.upload-progress .bar span { display: block; height: 100%; width: 0; background: var(--brand); transition: width 0.2s; }
.upload-progress .label { display: block; margin-top: 6px; font-size: 0.85rem; color: var(--muted); }

/* ---------- detail ---------- */
.detail-layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 16px; align-items: start; }
.gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 14px; }
.gallery-item { margin: 0; }
.gallery-img { display: grid; place-items: center; aspect-ratio: 4 / 3; width: 100%; padding: 0; border: 1px solid var(--line); border-radius: var(--radius-sm); overflow: hidden; background: var(--line-2); cursor: zoom-in; color: #b3b7c0; }
.gallery-img img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.2s; }
.gallery-img:hover img { transform: scale(1.03); }
.gallery-item.missing .gallery-img { cursor: default; border-style: dashed; }
.gallery-item figcaption { display: flex; justify-content: space-between; align-items: center; font-weight: 600; font-size: 0.9rem; margin-top: 6px; }
.specs-card { position: sticky; top: 80px; }
.specs { margin: 14px 0 0; display: grid; gap: 0; }
.spec { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--line-2); }
.spec dt { color: var(--muted); }
.spec dd { margin: 0; font-weight: 600; text-align: right; }
.spec-block { margin-top: 14px; }
.spec-block h3 { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); }
.meta { margin: 16px 0; font-size: 0.85rem; color: var(--muted); display: grid; gap: 4px; }

/* ---------- lightbox / dialog ---------- */
.lightbox { width: 100vw; height: 100vh; max-width: none; max-height: none; margin: 0; padding: 0; border: 0; background: rgba(15, 17, 21, 0.94); color: #fff; }
.lightbox::backdrop { background: rgba(0, 0, 0, 0.6); }
.lightbox-bar { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; font-weight: 600; }
.lightbox-stage { position: relative; height: calc(100vh - 56px); display: grid; place-items: center; padding: 0 56px 16px; }
.lightbox-stage img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 4px; }
.lb-nav { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(255, 255, 255, 0.12); border: 0; color: #fff; font-size: 2rem; width: 44px; height: 64px; border-radius: 6px; cursor: pointer; }
.lb-nav:hover { background: rgba(255, 255, 255, 0.24); }
.lb-nav.prev { left: 8px; }
.lb-nav.next { right: 8px; }
.dialog { border: 0; border-radius: 12px; padding: 24px; width: min(440px, calc(100vw - 32px)); box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25); }
.dialog::backdrop { background: rgba(0, 0, 0, 0.5); }
.dialog p { color: var(--muted); margin: 10px 0 20px; }
.dialog-actions { display: flex; justify-content: flex-end; gap: 10px; }

/* ---------- users / settings ---------- */
.add-user-grid { grid-template-columns: 1.1fr 1.3fr 0.8fr 1.3fr auto; align-items: end; margin-top: 14px; }
.switch { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.9rem; }
.switch input { width: 34px; height: 20px; appearance: none; background: #cfd2d9; border-radius: 99px; position: relative; cursor: pointer; transition: background 0.15s; margin: 0; }
.switch input::after { content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; background: #fff; border-radius: 50%; transition: transform 0.15s; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2); }
.switch input:checked { background: var(--green); }
.switch input:checked::after { transform: translateX(14px); }
.switch input:disabled { opacity: 0.5; cursor: not-allowed; }
.chip-list { list-style: none; padding: 0; margin: 14px 0; display: flex; flex-wrap: wrap; gap: 8px; }
.chip { display: inline-flex; align-items: center; gap: 4px; padding: 4px 4px 4px 12px; background: var(--line-2); border-radius: 999px; font-weight: 600; }
.inline-add { display: flex; gap: 8px; max-width: 420px; }

/* ---------- toast / spinner ---------- */
.toast { position: fixed; left: 50%; bottom: 24px; transform: translate(-50%, 20px); background: var(--slate); color: #fff; padding: 12px 18px; border-radius: 8px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2); opacity: 0; pointer-events: none; transition: opacity 0.2s, transform 0.2s; z-index: 100; max-width: calc(100vw - 32px); font-weight: 500; }
.toast.show { opacity: 1; transform: translate(-50%, 0); }
.toast.error { background: var(--danger); }
.spinner { width: 32px; height: 32px; border: 3px solid var(--line); border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ---------- responsive ---------- */
@media (max-width: 960px) {
  .detail-layout { grid-template-columns: 1fr; }
  .specs-card { position: static; }
  .add-user-grid { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 760px) {
  .page { padding: 16px 12px 48px; }
  .brand-logo { height: 42px; }
  h1 { font-size: 1.4rem; }
  .topbar-inner { flex-wrap: wrap; gap: 8px 12px; padding: 8px 12px; }
  .brand-text { display: none; }
  .nav { order: 3; flex-basis: 100%; overflow-x: auto; }
  .nav-link { padding: 6px 10px; font-size: 0.9rem; }
  .topbar-right { margin-left: auto; }
  .topbar-right > .btn span { display: none; }
  .card { padding: 16px; }
  .photo-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .gallery { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .form-actions-row .btn { flex: 1; }

  /* Tables become stacked cards on phones */
  .eq-table thead, .users-table thead { display: none; }
  .eq-table, .eq-table tbody, .users-table, .users-table tbody { display: block; }
  .eq-table tr { display: grid; grid-template-columns: 88px 1fr; grid-template-areas: 'photo make' 'photo model' 'rest rest'; column-gap: 12px; padding: 12px; border-bottom: 1px solid var(--line); }
  .eq-table td { border: 0; padding: 0; }
  .eq-table td.col-photo { grid-area: photo; width: auto; }
  .eq-table td.col-make { grid-area: make; }
  .eq-table td.col-model { grid-area: model; }
  .eq-table td:not(.col-photo):not(.col-make):not(.col-model) { grid-column: 1 / -1; display: flex; justify-content: space-between; padding: 4px 0; font-size: 0.9rem; }
  .eq-table td[data-label]:not(.col-make):not(.col-model)::before { content: attr(data-label); color: var(--muted); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; }
  .eq-table td.col-status { margin-top: 4px; align-items: center; }
  .users-table tr { display: grid; gap: 6px; padding: 12px 16px; border-bottom: 1px solid var(--line); }
  .users-table td { border: 0; padding: 0; display: flex; justify-content: space-between; align-items: center; }
  .users-table td[data-label]::before { content: attr(data-label); color: var(--muted); font-size: 0.8rem; text-transform: uppercase; }
  .add-user-grid { grid-template-columns: 1fr; }
}

.cell-val { display: inline-flex; align-items: center; gap: 6px; }
td[data-label='Submitted'] .cell-val { display: block; }
@media (max-width: 760px) {
  td[data-label='Submitted'] .cell-val { text-align: right; }
}

/* ---------- passwords ---------- */
.pw-wrap { position: relative; }
.pw-wrap input { padding-right: 44px !important; }
.pw-toggle { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); width: 36px; height: 34px; display: grid; place-items: center; border: 0; border-radius: var(--radius-sm); background: transparent; color: var(--muted); cursor: pointer; }
.pw-toggle:hover { color: var(--ink); background: var(--line-2); }
.pw-toggle[aria-pressed='true'] { color: var(--brand); }
.optional { text-transform: none; letter-spacing: 0; font-weight: 400; color: var(--muted); }
.stack { display: grid; gap: 14px; margin-top: 14px; }
.col-actions { text-align: right; white-space: nowrap; }
.dialog-wide { width: min(520px, calc(100vw - 32px)); }
.dialog-wide p { margin: 0; }
.dialog-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.dialog .dialog-head + p { margin: 2px 0 8px; }
.dlg-section { border-top: 1px solid var(--line); padding-top: 14px; margin-top: 14px; }
.dlg-section h4 { margin: 0; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.04em; }
.dlg-section > p { margin: 2px 0 10px; }
.dlg-section .stack { margin-top: 6px; }
.dlg-section .form-msg { margin: 0; }
.dlg-section .dialog-actions { margin-top: 0; }
.btn-row { display: flex; gap: 8px; flex-wrap: wrap; }
.link-out { margin-top: 10px; }
.link-row { display: flex; gap: 8px; }
.link-row input { font-family: var(--mono); font-size: 0.8rem; }
.btn-ghost .icon, .btn-primary .icon { width: 16px; height: 16px; }
.specs.flush { margin-top: 0; }

/* ---------- photo requests ---------- */
.nav-link { display: inline-flex; align-items: center; gap: 6px; }
.nav-badge { min-width: 20px; height: 20px; padding: 0 6px; border-radius: 99px; background: var(--brand); color: #fff; font-size: 0.72rem; font-weight: 700; display: inline-grid; place-items: center; letter-spacing: 0; }
.request-form .form-grid { margin-bottom: 16px; }
.request-form .field.wide { margin-bottom: 16px; }
.label-like { font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--slate-2); }
.angles-head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.angles-head .link-btn { margin-left: auto; font-size: 0.85rem; }
.chip-checks { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
.chip-check { position: relative; cursor: pointer; }
.chip-check input { position: absolute; opacity: 0; pointer-events: none; }
.chip-check span { display: inline-block; text-transform: none; letter-spacing: 0; color: var(--ink); padding: 7px 12px; border: 1px solid #cfcfcf; border-radius: 999px; font-weight: 600; font-size: 0.88rem; background: #fff; user-select: none; }
.chip-check input:checked + span { background: var(--brand); border-color: var(--brand); color: #fff; }
.chip-check input:focus-visible + span { outline: 2px solid var(--brand); outline-offset: 2px; }

.todo-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.todo-filters { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.search-wrap.compact { margin: 0; width: 280px; max-width: 100%; }
.search-wrap.compact input { padding-left: 36px; min-height: 40px; }
.check-inline { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; font-size: 0.9rem; cursor: pointer; }
.check-inline input { width: 18px; height: 18px; accent-color: var(--brand); }
.seg { display: inline-flex; background: #e6e6e6; border-radius: 8px; padding: 3px; }
.seg-btn { border: 0; background: transparent; padding: 7px 14px; border-radius: 6px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; color: var(--muted); }
.seg-btn.active { background: #fff; color: var(--ink); box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12); }
.seg-count { font-size: 0.75rem; background: rgba(0, 0, 0, 0.08); border-radius: 99px; padding: 1px 7px; }
.seg-btn.active .seg-count { background: var(--brand); color: #fff; }

.todo-list { display: grid; gap: 10px; }
.todo { display: grid; grid-template-columns: auto 1fr auto; gap: 14px; align-items: start; background: #fff; border: 1px solid var(--line); border-left: 4px solid var(--brand); border-radius: var(--radius); padding: 14px 16px; box-shadow: var(--shadow); }
.todo.is-overdue { border-left-color: var(--danger); }
.todo.is-done { border-left-color: var(--green); opacity: 0.85; }
.todo.is-done .todo-title strong { text-decoration: line-through; text-decoration-color: rgba(0, 0, 0, 0.35); }
.todo-check { appearance: none; width: 26px; height: 26px; border: 2px solid #bbb; border-radius: 50%; margin: 2px 0 0; cursor: pointer; display: grid; place-items: center; background: #fff; transition: border-color 0.12s, background 0.12s; }
.todo-check:hover { border-color: var(--green); }
.todo-check:checked { background: var(--green); border-color: var(--green); }
.todo-check:checked::after { content: ''; width: 7px; height: 12px; border: solid #fff; border-width: 0 3px 3px 0; transform: translateY(-1px) rotate(45deg); }
.todo-body { min-width: 0; display: grid; gap: 4px; }
.todo-title { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 1.05rem; }
.todo-ids { color: var(--slate-2); font-size: 0.85rem; }
.todo-angles { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 2px; }
.angle { font-size: 0.75rem; font-weight: 700; padding: 2px 9px; border-radius: 99px; background: var(--brand-tint); color: var(--brand-dark); }
.angle.have { background: var(--green-bg); color: var(--green); text-decoration: line-through; }
.angle.all { background: var(--grey-bg); color: var(--slate-2); }
.todo-notes { margin: 2px 0 0; font-size: 0.92rem; }
.todo-meta { margin-top: 2px; }
.todo-actions { display: flex; align-items: center; gap: 8px; }
.todo-actions .thumb { width: 64px; height: 48px; }
.due { font-size: 0.75rem; font-weight: 700; padding: 2px 9px; border-radius: 99px; background: var(--grey-bg); color: var(--slate-2); }
.due.today { background: var(--amber-bg); color: var(--amber); }
.due.overdue { background: var(--danger-bg); color: var(--danger); }

.request-banner { display: flex; align-items: center; gap: 12px; background: var(--brand-tint); border: 1px solid #ffc9b8; border-left: 4px solid var(--brand); border-radius: var(--radius); padding: 12px 16px; margin-bottom: 16px; }
.request-banner > .icon { color: var(--brand); width: 24px; height: 24px; }
.request-banner.done { background: var(--green-bg); border-color: #b5e2c6; border-left-color: var(--green); }
.request-banner .grow { flex: 1; }
.photo-tile.requested .photo-drop { border-color: var(--brand); background: var(--brand-tint); }
.requested-tag { font-size: 0.72rem; font-weight: 700; color: var(--brand-dark); text-transform: uppercase; letter-spacing: 0.04em; }
.photo-drop:disabled { cursor: default; opacity: 0.85; }

@media (max-width: 760px) {
  .todo { grid-template-columns: auto 1fr; }
  .todo-actions { grid-column: 1 / -1; justify-content: flex-end; }
  .todo-actions .thumb { margin-right: auto; }
  .todo-filters, .search-wrap.compact { width: 100%; }
  .request-banner { flex-wrap: wrap; }
}

/* requests: linking + assignment */
.match-box { display: flex; gap: 12px; align-items: flex-start; background: #fffaf0; border: 1px solid #f1d9a6; border-radius: var(--radius-sm); padding: 12px 14px; margin: 0 0 16px; }
.match-box .thumb { width: 72px; height: 54px; flex: none; }
.match-box .grow { flex: 1; display: grid; gap: 4px; }
.match-box .check-inline { margin-top: 4px; }
.warn { color: var(--danger); font-weight: 600; }
.todo-assign { margin-top: 2px; }
.assign-inline { display: inline-flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--muted); font-weight: 600; }
.assign-inline select { width: auto; min-height: 30px; padding: 3px 28px 3px 10px; font-size: 0.85rem; font-weight: 600; color: var(--ink); }
.assignee { display: inline-block; font-size: 0.8rem; font-weight: 700; padding: 2px 10px; border-radius: 99px; background: var(--grey-bg); color: var(--slate-2); }
.assignee.me { background: #000; color: #fff; }
.todo.is-mine { box-shadow: 0 0 0 2px rgba(255, 51, 0, 0.25), var(--shadow); }
.link-btn.unlink { margin-left: 8px; font-size: 0.8rem; font-weight: 500; }
.who-select { width: auto !important; min-height: 40px; }

/* notification settings */
.notify-form .notify-group { display: grid; gap: 8px; margin-top: 16px; }
.radio-row { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border: 1px solid var(--line); border-radius: var(--radius-sm); cursor: pointer; background: #fff; }
.radio-row:has(input:checked) { border-color: var(--brand); background: var(--brand-tint); }
.radio-row input { width: 18px; height: 18px; margin-top: 2px; accent-color: var(--brand); flex: none; }
.loc-picker { padding: 4px 0 4px 30px; }
.alerts-btn { display: inline-flex; align-items: center; gap: 8px; border: 0; background: none; padding: 0; text-align: left; cursor: pointer; max-width: 320px; }
.alerts-btn .small { color: var(--slate-2); }
.alerts-btn:hover .link-btn { color: var(--brand); }
.dialog .notify-form .notify-group:first-of-type { margin-top: 8px; }

/* settings: email check */
.sub-title { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.04em; margin: 20px 0 8px; }
.test-result { margin-top: 10px; padding: 10px 12px; border-radius: var(--radius-sm); font-weight: 600; background: var(--grey-bg); }
.test-result.ok { background: var(--green-bg); color: var(--green); }
.test-result.bad { background: var(--danger-bg); color: var(--danger); }
.mail-log { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; }
.mail-log li { display: grid; grid-template-columns: 70px 1fr auto; gap: 10px; align-items: start; padding: 8px 10px; border: 1px solid var(--line); border-radius: var(--radius-sm); font-size: 0.88rem; }
.mail-status { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; padding: 2px 6px; border-radius: 99px; text-align: center; }
.mail-log li.ok .mail-status { background: var(--green-bg); color: var(--green); }
.mail-log li.skip .mail-status { background: var(--grey-bg); color: var(--slate-2); }
.mail-log li.bad .mail-status { background: var(--danger-bg); color: var(--danger); }
.mail-body { min-width: 0; word-break: break-word; }
@media (max-width: 760px) { .mail-log li { grid-template-columns: 64px 1fr; } .mail-log li > :last-child { grid-column: 2; } }

/* settings: branch notifications */
.branch-list { display: grid; gap: 0; margin-top: 12px; border: 1px solid var(--line); border-radius: var(--radius-sm); overflow: hidden; }
.branch-row { display: grid; grid-template-columns: 200px 1fr; gap: 12px; align-items: center; padding: 10px 14px; border-top: 1px solid var(--line-2); }
.branch-row:first-child { border-top: 0; }
.branch-row.everywhere { background: #fafafa; }
.branch-row.nobody .branch-name { color: var(--danger); }
.branch-name { font-weight: 700; }
.branch-people { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.branch-people .block { flex-basis: 100%; }
.branch-people select { width: auto; min-height: 32px; padding: 4px 28px 4px 10px; font-size: 0.85rem; }
.person-chip { display: inline-flex; align-items: center; gap: 2px; padding: 3px 4px 3px 10px; border-radius: 99px; background: var(--brand-tint); color: var(--brand-dark); font-weight: 600; font-size: 0.85rem; }
.branch-row.everywhere .person-chip { background: #000; color: #fff; padding-right: 10px; }
.person-chip .icon-btn { color: inherit; width: 22px; height: 22px; }
.role-legend { margin: 6px 0 0; padding-left: 18px; font-size: 0.85rem; color: var(--slate-2); }
.comments-block { margin-top: 18px; border-top: 1px solid var(--line); padding-top: 12px; }
.comments-block h3 { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.04em; margin: 0 0 6px; }
.submit-form textarea#comments { width: 100%; }
@media (max-width: 760px) { .branch-row { grid-template-columns: 1fr; gap: 6px; } }

/* search boxes: keep text clear of the magnifying-glass icon (beats the generic input padding) */
.search-wrap input[type='search'] { padding-left: 40px !important; }
.search-wrap .icon { pointer-events: none; z-index: 1; }

/* unit messages + follow-up */
.detail-main { display: grid; gap: 16px; align-content: start; min-width: 0; }
.detail-main > .card { margin-bottom: 0; }
.followup-banner { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; background: var(--danger-bg); border: 1px solid #f5c2c2; border-left: 4px solid var(--danger); border-radius: var(--radius); padding: 12px 16px; margin-bottom: 16px; }
.followup-banner strong { color: var(--danger); }
.followup-banner p { margin: 4px 0 0; }
.followup-banner .grow { flex: 1; min-width: 220px; }
.followup-tag { display: inline-block; width: fit-content; margin-top: 4px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: var(--danger); background: var(--danger-bg); padding: 1px 7px; border-radius: 99px; }
.messages-card > p.muted { margin-bottom: 12px; }
.msg-list { display: grid; gap: 10px; margin-bottom: 14px; max-height: 480px; overflow-y: auto; }
.msg { background: #f6f6f6; border-radius: 10px; padding: 10px 12px; max-width: 85%; }
.msg.mine { background: #fff0eb; justify-self: end; }
.msg.kind-action { border-left: 4px solid var(--danger); }
.msg.kind-resolved { border-left: 4px solid var(--green); }
.msg-head { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; font-size: 0.85rem; }
.msg p { margin: 4px 0 0; }
.msg-role { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); }
.msg-kind { font-size: 0.7rem; font-weight: 700; padding: 1px 7px; border-radius: 99px; }
.msg-kind.action { background: var(--danger-bg); color: var(--danger); }
.msg-kind.resolved { background: var(--green-bg); color: var(--green); }
.msg-compose textarea { width: 100%; }
.msg-compose-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 8px; flex-wrap: wrap; }
.msg-compose .check-inline { font-weight: 500; font-size: 0.85rem; }
@media (max-width: 760px) { .msg { max-width: 100%; } }

.followup-tag.block { display: block; }

.temp-pw { display: inline-flex; align-items: center; gap: 8px; margin-left: 4px; }
.temp-pw code { font-family: var(--mono); font-size: 1rem; font-weight: 700; background: #fff; border: 1px solid var(--line); border-radius: 4px; padding: 2px 8px; color: var(--ink); }

/* public / private comments */
.comment-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 10px; }
.comment-fields textarea { width: 100%; }
.vis-tag { display: inline-block; margin-left: 8px; padding: 1px 7px; border-radius: 99px; font-size: 0.68rem; font-weight: 700; text-transform: none; letter-spacing: 0; vertical-align: 1px; }
.vis-tag.public { background: var(--green-bg); color: var(--green); }
.vis-tag.private { background: #000; color: #fff; }
.comments-block.private { background: #fafafa; border: 1px dashed #cfcfcf; border-radius: var(--radius-sm); padding: 12px; margin-top: 12px; }
@media (max-width: 760px) { .comment-fields { grid-template-columns: 1fr; } }
.request-form > .section-title { margin-bottom: 14px; }

/* ---------- mobile header: hamburger menu ---------- */
html, body { max-width: 100%; overflow-x: clip; }
.menu-toggle { display: none; }
@media (max-width: 760px) {
  .topbar { position: sticky; }
  .topbar-inner { flex-wrap: nowrap; gap: 10px; padding: 8px 12px; position: relative; }
  .menu-toggle { display: inline-grid; place-items: center; width: 40px; height: 40px; flex: none; border: 1px solid var(--line); border-radius: var(--radius-sm); background: #fff; color: var(--ink); cursor: pointer; }
  .menu-toggle .icon { width: 22px; height: 22px; }
  .brand { min-width: 0; }
  .brand-logo { height: 38px; }
  .nav { display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; flex-direction: column; gap: 0; background: #fff; border-bottom: 4px solid var(--brand); box-shadow: 0 10px 20px rgba(0, 0, 0, 0.12); padding: 6px 0; overflow: visible; z-index: 30; }
  .topbar.nav-open .nav { display: flex; }
  .nav .nav-link { padding: 14px 20px; font-size: 1rem; border-bottom: 0; border-left: 4px solid transparent; justify-content: space-between; }
  .nav .nav-link.active { border-left-color: var(--brand); background: var(--brand-tint); }
  .topbar-right { margin-left: auto; flex: none; }
  .user-menu-pop { right: -4px; max-width: calc(100vw - 24px); }
  /* long words / tables never push the page sideways */
  .page, .card { min-width: 0; max-width: 100%; }
  .page-head > * { min-width: 0; }
  h1 { overflow-wrap: anywhere; }
}

/* ---------- users table → tidy cards on phones ---------- */
@media (max-width: 760px) {
  .users-table tr {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-areas:
      'name   name'
      'email  email'
      'role   access'
      'alerts alerts'
      'actions added';
    gap: 8px 12px;
    padding: 14px 16px;
  }
  .users-table td { display: block; padding: 0; border: 0; min-width: 0; }
  .users-table td[data-label]::before { content: none; }
  .users-table .u-name { grid-area: name; display: flex; align-items: center; flex-wrap: wrap; gap: 6px; font-size: 1.02rem; }
  .users-table .u-name .pill { margin: 0; }
  .users-table .u-email { grid-area: email; color: var(--muted); font-size: 0.88rem; overflow-wrap: anywhere; margin-top: -4px; }
  .users-table .u-role { grid-area: role; }
  .users-table .u-role select { width: 100%; max-width: 180px; }
  .users-table .u-access { grid-area: access; align-self: center; justify-self: end; }
  .users-table .u-alerts { grid-area: alerts; }
  .users-table .u-alerts .alerts-btn { max-width: none; width: 100%; justify-content: space-between; padding: 8px 10px; background: #f6f6f6; border-radius: var(--radius-sm); }
  .users-table .u-actions { grid-area: actions; text-align: left; }
  .users-table .u-added { grid-area: added; align-self: center; justify-self: end; color: var(--muted); font-size: 0.8rem; }
  .users-table .u-added::before { content: 'Added ' !important; }
}
@media (max-width: 760px) {
  .users-table td { justify-content: flex-start; }
  .users-table td.u-added[data-label]::before { content: "Added " !important; text-transform: none; letter-spacing: 0; font-size: inherit; color: inherit; }
}

/* header "Add" dropdown */
.add-menu { position: relative; }
.add-menu summary { list-style: none; cursor: pointer; }
.add-menu summary::-webkit-details-marker { display: none; }
.add-menu .caret { font-size: 0.7rem; margin-left: 2px; }
.add-menu-pop { position: absolute; right: 0; top: calc(100% + 8px); background: #fff; border: 1px solid var(--line); border-radius: var(--radius); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14); padding: 6px; min-width: 260px; display: grid; z-index: 40; }
.add-item { display: grid; gap: 2px; padding: 10px 12px; border-radius: var(--radius-sm); color: var(--ink); text-decoration: none; }
.add-item:hover, .add-item:focus-visible { background: var(--brand-tint); }
.add-item strong { font-size: 0.95rem; }
@media (max-width: 760px) {
  .add-menu .add-label, .add-menu .caret { display: none; }
  .add-menu-pop { right: -48px; max-width: calc(100vw - 24px); }
}

/* request import */
.import-drop { width: 100%; display: grid; justify-items: center; gap: 6px; padding: 28px 16px; margin-top: 10px; border: 2px dashed #c9c9c9; border-radius: var(--radius); background: #fafafa; cursor: pointer; text-align: center; }
.import-drop:hover, .import-drop.drag { border-color: var(--brand); background: var(--brand-tint); }
.import-drop .icon { width: 28px; height: 28px; color: var(--brand); transform: rotate(180deg); }
.paste-row { display: flex; gap: 10px; align-items: flex-end; margin-top: 12px; }
.paste-row textarea { flex: 1; min-height: 64px; }
.wh-map { display: grid; gap: 8px; margin-top: 8px; }
.wh-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.wh-code { display: inline-block; min-width: 44px; text-align: center; font-weight: 700; background: var(--grey-bg); border-radius: 6px; padding: 4px 8px; }
.wh-row select { width: auto; min-width: 200px; }
.pad-x { padding: 0 20px; margin: 6px 0 10px; }
.import-table td { font-size: 0.9rem; }
.import-table tr.excluded td { opacity: 0.45; }
.import-table .c-inc { width: 36px; }
.import-table .c-inc input { width: 18px; height: 18px; accent-color: var(--brand); }
.import-table .c-unit { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; min-width: 220px; }
.import-table .make-input { width: 110px !important; min-height: 30px !important; padding: 3px 8px !important; font-size: 0.85rem; }
.import-table .c-flags { display: flex; gap: 6px; flex-wrap: wrap; }
.flag { display: inline-flex; align-items: center; gap: 4px; font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 99px; white-space: nowrap; }
.flag.warn { background: var(--amber-bg); color: var(--amber); }
.flag.info { background: #e8f0fe; color: #1a4fb5; cursor: pointer; }
.flag.info input { width: 14px; height: 14px; margin: 0; }
@media (max-width: 760px) {
  .paste-row { flex-direction: column; align-items: stretch; }
  .import-table thead { display: none; }
  .import-table, .import-table tbody { display: block; }
  .import-table tr { display: grid; grid-template-columns: 32px 1fr 1fr; gap: 4px 10px; padding: 12px 14px; border-bottom: 1px solid var(--line); }
  .import-table td { border: 0; padding: 0; }
  .import-table .c-inc { grid-row: span 4; }
  .import-table .c-unit, .import-table .c-flags { grid-column: 2 / -1; }
  .import-table td[data-label]:not(.c-unit)::before { content: attr(data-label) ': '; color: var(--muted); font-size: 0.75rem; }
}

/* pagination */
.pager { display: flex; justify-content: space-between; align-items: center; gap: 10px 16px; flex-wrap: wrap; padding: 12px 16px; border-top: 1px solid var(--line-2); }
.todo-list + .pager { border-top: 0; padding: 14px 0 0; }
.pager-btns { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.pager-num, .pager-step { min-width: 36px; height: 36px; padding: 0 10px; border: 1px solid var(--line); border-radius: var(--radius-sm); background: #fff; color: var(--ink); font-weight: 600; cursor: pointer; }
.pager-num:hover, .pager-step:hover:not(:disabled) { border-color: var(--brand); color: var(--brand); }
.pager-num.active { background: var(--brand); border-color: var(--brand); color: #fff; }
.pager-step:disabled { opacity: 0.4; cursor: default; }
.pager-gap { padding: 0 4px; color: var(--muted); }
@media (max-width: 760px) { .pager { justify-content: center; } .pager-info { width: 100%; text-align: center; } }
.row-actions { display: inline-flex; align-items: center; gap: 6px; }

/* Photo count on Pending rows */
.photo-tag { display: block; width: fit-content; margin-top: 4px; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.02em; color: #8a5a00; background: #fff4dc; padding: 1px 7px; border-radius: 99px; }
.photo-tag.none { color: var(--muted, #666); background: #eee; }
.photo-tag.full { color: #17663a; background: #e3f5ea; }

/* ---------- Instructions ---------- */
.steps { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-bottom: 20px; }
.step-card { background: #f5f5f3; border: 1px solid #e3e3e0; border-radius: 16px; padding: 28px 22px 26px; text-align: center; }
.step-icon { width: 128px; height: 128px; margin: 0 auto 22px; border-radius: 50%; background: #fff; border: 1px solid #e3e3e0; display: grid; place-items: center; }
.step-icon svg { width: 84px; height: 84px; }
.step-num { color: var(--brand); font-weight: 700; font-size: 0.8rem; letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 4px; }
.step-card h2 { font-size: 1.3rem; margin: 0 0 10px; }
.step-card p { color: var(--slate-2); margin: 0 auto; max-width: 26ch; line-height: 1.5; }
.shots { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 14px; margin-top: 14px; }
.shot { margin: 0; }
.shot-img { display: grid; place-items: center; width: 100%; aspect-ratio: 4 / 3; padding: 0; border: 1px solid var(--line); border-radius: var(--radius-sm); overflow: hidden; background: var(--grey-bg); color: var(--muted); cursor: zoom-in; }
.shot.no-example .shot-img { cursor: default; border-style: dashed; }
.shot-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.shot figcaption { display: flex; gap: 8px; align-items: flex-start; margin-top: 8px; }
.shot-n { flex: none; width: 22px; height: 22px; border-radius: 50%; background: var(--brand); color: #fff; font-size: 0.75rem; font-weight: 700; display: grid; place-items: center; }
.example-box { display: grid; place-items: center; }
.example-box[open] { display: grid; }
.example-box figure { margin: 0; max-width: min(1000px, 94vw); }
.example-box img { max-width: 100%; max-height: 82vh; display: block; border-radius: 6px; }
.example-box figcaption { display: flex; justify-content: space-between; align-items: center; padding: 8px 2px; font-weight: 600; }
.example-box .icon-btn { color: #fff; }
.instr-link { display: inline-flex; align-items: center; gap: 4px; font-weight: 600; margin-top: 4px; }
.instr-link .icon { width: 16px; height: 16px; }
@media (max-width: 760px) {
  .steps { grid-template-columns: 1fr; }
  .step-card { padding: 20px 18px; display: grid; grid-template-columns: 76px 1fr; column-gap: 16px; text-align: left; align-items: center; }
  .step-icon { width: 76px; height: 76px; margin: 0; grid-row: span 3; }
  .step-icon svg { width: 52px; height: 52px; }
  .step-card h2 { font-size: 1.1rem; margin-bottom: 4px; }
  .step-card p { max-width: none; }
  .shots { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
}

/* Example picture behind an empty photo slot */
.photo-empty.has-example { position: relative; width: 100%; height: 100%; justify-content: center; background-size: cover; background-position: center; isolation: isolate; }
.photo-empty.has-example::before { content: ''; position: absolute; inset: 0; background: rgba(255, 255, 255, 0.72); z-index: -1; }

/* ---------- Daily report import ---------- */
.settings-link { display: flex; align-items: center; gap: 14px; text-decoration: none; color: inherit; margin-bottom: 16px; }
.settings-link:hover { border-color: var(--brand); }
.settings-link .icon { color: var(--brand); }
.report-list { list-style: none; padding: 0; margin: 0 0 12px; }
.report-list li { padding: 8px 0; border-bottom: 1px solid var(--line-2); }
.report-list .flag { margin-left: 8px; }
.row-center { display: flex; gap: 10px; align-items: center; }
.spinner.sm { width: 18px; height: 18px; border-width: 2px; }

.offreport-tag { display: block; width: fit-content; margin-top: 4px; font-size: 0.7rem; font-weight: 700; color: var(--amber); background: var(--amber-bg); padding: 1px 7px; border-radius: 99px; }
.offreport-banner { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; padding: 12px 16px; margin-bottom: 16px; border-radius: var(--radius); background: var(--amber-bg); color: #5c3c00; border: 1px solid #f0d9a8; }
.offreport-banner .grow { flex: 1 1 260px; }

/* ---------- Settings (tabbed) ---------- */
.settings-tabs { display: flex; gap: 4px; margin: -4px 0 18px; border-bottom: 1px solid var(--line); overflow-x: auto; }
.settings-tabs a { padding: 10px 16px; font-weight: 700; color: var(--muted); text-decoration: none; border-bottom: 3px solid transparent; margin-bottom: -1px; white-space: nowrap; }
.settings-tabs a:hover { color: var(--ink); }
.settings-tabs a.active { color: var(--ink); border-bottom-color: var(--brand); }
.settings-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; align-items: stretch; margin-bottom: 16px; }
.settings-grid > .card { margin: 0; }
.scroll-card { display: flex; flex-direction: column; min-height: 0; }
.scroll-body { flex: 1 1 auto; max-height: 440px; overflow-y: auto; margin-right: -6px; padding-right: 6px; }
.how-it-works { margin-top: 14px; font-size: 0.9rem; }
.how-it-works summary { cursor: pointer; font-weight: 700; color: var(--slate-2); }
.how-it-works ul { margin: 8px 0 0; padding-left: 18px; color: var(--slate-2); display: grid; gap: 4px; }
.upload-row { display: flex; gap: 6px; align-items: baseline; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--line-2); }

.loc-table { border: 1px solid var(--line); border-radius: var(--radius-sm); overflow: hidden; margin-top: 12px; }
.loc-row { display: grid; grid-template-columns: minmax(150px, 1.1fr) minmax(110px, 0.8fr) minmax(170px, 1fr) minmax(220px, 2fr) 44px; gap: 12px; align-items: center; padding: 10px 14px; border-top: 1px solid var(--line-2); }
.loc-row:first-child { border-top: 0; }
.loc-head { background: #fafafa; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); padding-top: 8px; padding-bottom: 8px; }
.loc-all { background: #fafafa; }
.loc-all .loc-all-people { grid-column: 2 / -1; }
.loc-name { font-weight: 700; }
.loc-cell { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; min-width: 0; }
.loc-cell select.compact { width: 100%; min-height: 34px; padding: 4px 28px 4px 10px; font-size: 0.85rem; }
.loc-cell select.compact.unset { color: var(--danger); border-color: #f2b8b8; }
.loc-cell select.add-person { width: auto; color: var(--muted); }
.loc-remove { justify-content: flex-end; }
.code-chip { display: inline-flex; align-items: center; gap: 2px; font-family: var(--mono); font-size: 0.8rem; font-weight: 700; padding: 2px 8px; border-radius: 6px; background: var(--grey-bg); }
.code-chip.extra { padding-right: 2px; background: var(--brand-tint); color: var(--brand-dark); }
.code-chip .icon-btn { width: 20px; height: 20px; color: inherit; }
.code-input { width: 70px !important; min-height: 28px; padding: 2px 6px; font-size: 0.8rem; }
.person-chip.dark { background: #000; color: #fff; padding-right: 10px; }
.section-head .inline-add { margin-left: auto; }

@media (max-width: 900px) {
  .settings-grid { grid-template-columns: 1fr; }
  .scroll-body { max-height: 360px; }
  .loc-head { display: none; }
  .loc-row { grid-template-columns: 1fr auto; gap: 8px 12px; padding: 12px 14px; }
  .loc-row .loc-name { grid-column: 1; }
  .loc-row .loc-remove { grid-column: 2; grid-row: 1; }
  .loc-row .loc-cell:not(.loc-remove) { grid-column: 1 / -1; }
  .loc-row .loc-cell[data-label] { flex-wrap: nowrap; }
  .loc-row .loc-people[data-label] { flex-wrap: wrap; padding-left: 112px; position: relative; min-height: 34px; }
  .loc-row .loc-people[data-label]::before { position: absolute; left: 0; top: 9px; }
  .loc-row .loc-cell[data-label]::before { content: attr(data-label); flex: 0 0 106px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
  .loc-all .loc-all-people { grid-column: 1 / -1; }
  .section-head .inline-add { margin-left: 0; width: 100%; max-width: none; }
}

/* ---------- Deleted units ---------- */
.deleted-link { display: flex; justify-content: flex-end; margin: 10px 2px 0; font-size: 0.85rem; }
.deleted-link a { display: inline-flex; align-items: center; gap: 6px; color: var(--muted); text-decoration: none; }
.deleted-link a:hover { color: var(--danger); text-decoration: underline; }
.deleted-link .icon { width: 15px; height: 15px; }
.trash-row { display: grid; grid-template-columns: 72px minmax(0, 1.4fr) minmax(0, 1.2fr) auto; gap: 14px; align-items: center; padding: 12px 16px; border-top: 1px solid var(--line-2); }
.trash-row:first-child { border-top: 0; }
.trash-row .thumb { width: 72px; height: 54px; border-radius: 6px; overflow: hidden; background: var(--grey-bg); display: grid; place-items: center; color: var(--muted); }
.trash-row .thumb img { width: 100%; height: 100%; object-fit: cover; filter: grayscale(0.6); }
.trash-meta > div { line-height: 1.4; }
.deleted-banner { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; padding: 12px 16px; margin-bottom: 16px; border-radius: var(--radius); background: var(--danger-bg); color: #7a1a1a; border: 1px solid #f2c4c4; }
.deleted-banner .grow { flex: 1 1 260px; }
.status-badge.status-deleted { background: var(--danger-bg); color: var(--danger); }
@media (max-width: 760px) {
  .trash-row { grid-template-columns: 64px 1fr; }
  .trash-row .thumb { width: 64px; height: 48px; }
  .trash-meta, .trash-actions { grid-column: 1 / -1; }
}

/* Pending / Requests switcher (one menu item) */
.work-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 260px)); gap: 10px; margin-bottom: 14px; }
.work-tabs a { display: grid; grid-template-columns: 1fr auto; align-items: center; column-gap: 8px; padding: 10px 14px; border: 1px solid var(--line); border-radius: var(--radius); background: var(--card); color: var(--ink); text-decoration: none; font-weight: 700; font-size: 1.05rem; }
.work-tabs a:hover { border-color: #bbb; }
.work-tabs a.active { border-color: var(--brand); box-shadow: inset 0 -3px 0 var(--brand); }
.work-count { min-width: 28px; padding: 1px 8px; border-radius: 99px; background: var(--grey-bg); font-size: 0.85rem; text-align: center; }
.work-tabs a.active .work-count { background: var(--brand); color: #fff; }
.work-hint { grid-column: 1 / -1; font-size: 0.78rem; font-weight: 500; color: var(--muted); }
@media (max-width: 600px) { .work-tabs { grid-template-columns: 1fr 1fr; } .work-hint { display: none; } }
.reimport-btn { margin-left: 8px; padding: 2px 10px; min-height: 28px; font-size: 0.8rem; }

/* @-mentions in unit messages */
.mention-wrap { position: relative; }
.mention-pop { position: absolute; left: 0; right: 0; top: 100%; z-index: 30; margin: 4px 0 0; padding: 4px; list-style: none; background: var(--card); border: 1px solid var(--line); border-radius: var(--radius-sm); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12); max-height: 260px; overflow-y: auto; }
.mention-pop li { padding: 7px 10px; border-radius: 4px; cursor: pointer; }
.mention-pop li.active, .mention-pop li:hover { background: var(--brand-tint); }
.mention { color: var(--brand-dark); font-weight: 700; background: var(--brand-tint); border-radius: 4px; padding: 0 3px; }
```

## `src/ui.js`

```js
// Tiny DOM helpers — no framework.

/**
 * h('div', { class: 'x', onclick: fn }, 'text', childNode, [moreChildren])
 * Attributes starting with "on" become event listeners. `null`/`false` children are skipped.
 */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'value') el.value = v;
    else if (k === 'checked' || k === 'disabled' || k === 'selected' || k === 'required' || k === 'multiple')
      el[k] = !!v;
    else if (k === 'html') el.innerHTML = v; // only ever used with static strings
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

/** Like el.append(), but skips null/false/undefined (native append would print "null"). */
export function mount(el, ...children) {
  append(el, children);
  return el;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

let toastTimer;
export function toast(message, kind = 'info') {
  let box = document.getElementById('toast');
  if (!box) {
    box = h('div', { id: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.append(box);
  }
  box.textContent = message;
  box.className = `toast show ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (box.className = 'toast'), kind === 'error' ? 6000 : 3000);
}

export function fmtDate(ts) {
  if (!ts) return '—';
  const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function fmtMoney(n) {
  if (n === null || n === undefined || n === '') return '—';
  return Number(n).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function fmtNumber(n) {
  if (n === null || n === undefined || n === '') return '—';
  return Number(n).toLocaleString();
}

export function icon(name) {
  const paths = {
    search: 'M11 4a7 7 0 1 0 4.4 12.4l4.1 4.1 1.4-1.4-4.1-4.1A7 7 0 0 0 11 4Zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z',
    download: 'M11 3h2v9.6l3.3-3.3 1.4 1.4L12 16.4l-5.7-5.7 1.4-1.4 3.3 3.3V3ZM4 18h16v2H4v-2Z',
    plus: 'M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7V4Z',
    camera: 'M9 4h6l1.5 2H20a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3.5L9 4Zm3 4a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z',
    back: 'M10.8 5.3 4.1 12l6.7 6.7 1.4-1.4L7.9 13H20v-2H7.9l4.3-4.3-1.4-1.4Z',
    edit: 'M15.2 3.8a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L9.4 19.6 4 20l.4-5.4L15.2 3.8Zm1.4 1.4-1.6 1.6 2.2 2.2 1.6-1.6-2.2-2.2Zm-3 3L6.3 15.5l-.2 2.4 2.4-.2 7.3-7.3-2.2-2.2Z',
    trash: 'M9 3h6l1 2h4v2H4V5h4l1-2Zm-3 6h12l-1 12H7L6 9Zm4 2v8h2v-8h-2Zm4 0v8h2v-8h-2Z',
    x: 'm6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z',
    eye: 'M12 5c5 0 9 4.3 10 7-1 2.7-5 7-10 7S3 14.7 2 12c1-2.7 5-7 10-7Zm0 2c-3.6 0-6.8 2.9-7.9 5 1.1 2.1 4.3 5 7.9 5s6.8-2.9 7.9-5c-1.1-2.1-4.3-5-7.9-5Zm0 1.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm0 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z',
    eyeOff: 'm3.7 2.3 18 18-1.4 1.4-3.2-3.2A10.7 10.7 0 0 1 12 19c-5 0-9-4.3-10-7 .6-1.6 2.2-3.8 4.5-5.3L2.3 3.7l1.4-1.4ZM8 8.2C6.1 9.3 4.7 10.9 4.1 12c1.1 2.1 4.3 5 7.9 5 1.3 0 2.5-.3 3.5-.9l-1.7-1.7A3.5 3.5 0 0 1 9.1 9.6L8 8.2Zm4-3.2c5 0 9 4.3 10 7-.4 1.2-1.4 2.7-2.8 4l-1.4-1.4c.9-.9 1.6-1.8 2.1-2.6-1.1-2.1-4.3-5-7.9-5-.6 0-1.2.1-1.8.2L8.6 5.6C9.7 5.2 10.8 5 12 5Z',
    check: 'M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6L20.1 8.4 18.7 7 9.5 16.2Z',
    info: 'M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm0 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm-1 7h2v6h-2v-6Zm0-4h2v2h-2V7Z',
    upload: 'M11 16V6.4L7.7 9.7 6.3 8.3 12 2.6l5.7 5.7-1.4 1.4L13 6.4V16h-2ZM4 18h16v2H4v-2Z',
    menu: 'M3 6h18v2H3V6Zm0 5h18v2H3v-2Zm0 5h18v2H3v-2Z',
    key: 'M8 10a5 5 0 1 1 4.6 5H11v2H9v2H5v-3.4l3.3-3.3A5 5 0 0 1 8 10Zm5-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm.5 1.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z',
    copy: 'M8 3h11a2 2 0 0 1 2 2v11h-2V5H8V3ZM5 7h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Zm0 2v10h10V9H5Z',
    image: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1 2v8.6l4-4 3 3 2-2 4 4V7H5Zm10 1.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z',
  };
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'icon');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', paths[name] || '');
  p.setAttribute('fill', 'currentColor');
  svg.append(p);
  return svg;
}

/** Simple promise-based confirm dialog using <dialog>. */
export function confirmDialog({ title, message, confirmLabel = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    const dlg = h(
      'dialog',
      { class: 'dialog' },
      h('h3', {}, title),
      h('p', {}, message),
      h(
        'div',
        { class: 'dialog-actions' },
        h('button', { class: 'btn btn-ghost', value: 'cancel', onclick: () => dlg.close('cancel') }, 'Cancel'),
        h(
          'button',
          { class: `btn ${danger ? 'btn-danger' : 'btn-primary'}`, onclick: () => dlg.close('ok') },
          confirmLabel,
        ),
      ),
    );
    dlg.addEventListener('close', () => {
      resolve(dlg.returnValue === 'ok');
      dlg.remove();
    });
    document.body.append(dlg);
    dlg.showModal();
  });
}

export const MIN_PASSWORD = 8;

/**
 * Password input with a show/hide (eye) button.
 * Returns { wrap, input } — put `wrap` in the form, read `input.value`.
 */
export function passwordInput({ id, autocomplete = 'current-password', placeholder = '', required = true } = {}) {
  const input = h('input', { type: 'password', id, autocomplete, placeholder, required, spellcheck: 'false', autocapitalize: 'off' });
  const btn = h(
    'button',
    {
      type: 'button',
      class: 'pw-toggle',
      'aria-label': 'Show password',
      'aria-pressed': 'false',
      title: 'Show password',
      onclick: () => {
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.replaceChildren(icon(show ? 'eyeOff' : 'eye'));
        btn.setAttribute('aria-pressed', String(show));
        btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
        btn.title = show ? 'Hide password' : 'Show password';
        input.focus();
      },
    },
    icon('eye'),
  );
  return { wrap: h('div', { class: 'pw-wrap' }, input, btn), input };
}

/** Returns an error message, or null if the new password is acceptable. */
export function checkNewPassword(pw, confirm) {
  if (pw.length < MIN_PASSWORD) return `Password must be at least ${MIN_PASSWORD} characters.`;
  if (confirm !== undefined && pw !== confirm) return 'The two passwords don’t match.';
  return null;
}

export const PAGE_SIZE = 20;

/**
 * Pagination bar. state = { page } (1-based, mutated); onChange() redraws.
 * Returns { el, slice(items) } — call slice() with the full filtered list each draw.
 */
export function pager(state, onChange, { size = PAGE_SIZE, noun = 'items', scrollTo } = {}) {
  const el = h('nav', { class: 'pager', 'aria-label': 'Pages', hidden: true });
  const go = (p) => {
    state.page = p;
    onChange();
    (scrollTo || el.parentElement)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  function slice(items) {
    const total = items.length;
    const pages = Math.max(1, Math.ceil(total / size));
    if (!state.page || state.page > pages) state.page = state.page > pages ? pages : 1;
    const start = (state.page - 1) * size;
    draw(total, pages, start);
    return items.slice(start, start + size);
  }
  function draw(total, pages, start) {
    el.hidden = total <= size;
    if (el.hidden) return;
    const cur = state.page;
    // Page numbers: first, last, and a window around the current page.
    const nums = [...new Set([1, pages, cur - 1, cur, cur + 1].filter((n) => n >= 1 && n <= pages))].sort((a, b) => a - b);
    const btns = [];
    nums.forEach((n, i) => {
      if (i && n - nums[i - 1] > 1) btns.push(h('span', { class: 'pager-gap' }, '…'));
      btns.push(h('button', { type: 'button', class: `pager-num${n === cur ? ' active' : ''}`, 'aria-current': n === cur ? 'page' : null, onclick: () => go(n) }, String(n)));
    });
    clear(el);
    append(el, [
      h('span', { class: 'pager-info muted small' }, `Showing ${start + 1}–${Math.min(start + size, total)} of ${total} ${noun}`),
      h(
        'div',
        { class: 'pager-btns' },
        h('button', { type: 'button', class: 'pager-step', disabled: cur <= 1, onclick: () => go(cur - 1), 'aria-label': 'Previous page' }, '‹ Prev'),
        btns,
        h('button', { type: 'button', class: 'pager-step', disabled: cur >= pages, onclick: () => go(cur + 1), 'aria-label': 'Next page' }, 'Next ›'),
      ),
    ]);
  }
  return { el, slice };
}
```

## `src/pages/account.js`

```js
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { auth } from '../firebase.js';
import { h, toast, passwordInput, checkNewPassword, MIN_PASSWORD, mount } from '../ui.js';
import { store } from '../store.js';
import { notificationsForm } from './notifications.js';
import { roleLabel } from '../config.js';

const messages = {
  'auth/invalid-credential': 'Your current password is incorrect.',
  'auth/wrong-password': 'Your current password is incorrect.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/weak-password': `Choose a stronger password (at least ${MIN_PASSWORD} characters).`,
  'auth/network-request-failed': 'Network error — check your connection and try again.',
};

export function renderAccount(page) {
  const { user, profile } = store.get();

  const current = passwordInput({ id: 'pw-current', autocomplete: 'current-password' });
  const next = passwordInput({ id: 'pw-new', autocomplete: 'new-password', placeholder: `At least ${MIN_PASSWORD} characters` });
  const confirm = passwordInput({ id: 'pw-confirm', autocomplete: 'new-password' });
  const msg = h('p', { class: 'form-msg', role: 'alert' });
  const btn = h('button', { type: 'submit', class: 'btn btn-primary' }, 'Change password');

  const form = h(
    'form',
    {
      class: 'card narrow-left',
      onsubmit: async (e) => {
        e.preventDefault();
        msg.className = 'form-msg';
        msg.textContent = '';
        if (!current.input.value) {
          msg.textContent = 'Enter your current password.';
          current.input.focus();
          return;
        }
        const problem = checkNewPassword(next.input.value, confirm.input.value);
        if (problem) {
          msg.textContent = problem;
          next.input.focus();
          return;
        }
        if (next.input.value === current.input.value) {
          msg.textContent = 'The new password is the same as your current one.';
          return;
        }
        btn.disabled = true;
        btn.textContent = 'Saving…';
        try {
          // Firebase requires a recent sign-in before changing a password, so confirm the current one first.
          await reauthenticateWithCredential(auth.currentUser, EmailAuthProvider.credential(user.email, current.input.value));
          await updatePassword(auth.currentUser, next.input.value);
          form.reset();
          msg.className = 'form-msg ok';
          msg.textContent = 'Password changed. Use the new password next time you sign in.';
          toast('Password changed');
        } catch (err) {
          msg.textContent = messages[err.code] || err.message;
        } finally {
          btn.disabled = false;
          btn.textContent = 'Change password';
        }
      },
    },
    h('h2', { class: 'section-title' }, 'Change password'),
    h(
      'div',
      { class: 'stack' },
      h('div', { class: 'field' }, h('label', { for: 'pw-current' }, 'Current password'), current.wrap),
      h('div', { class: 'field' }, h('label', { for: 'pw-new' }, 'New password'), next.wrap),
      h('div', { class: 'field' }, h('label', { for: 'pw-confirm' }, 'Confirm new password'), confirm.wrap),
    ),
    msg,
    h('div', { class: 'form-actions-row' }, btn),
  );

  mount(page, 
    h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'My account'))),
    h(
      'section',
      { class: 'card narrow-left' },
      h(
        'dl',
        { class: 'specs flush' },
        h('div', { class: 'spec' }, h('dt', {}, 'Name'), h('dd', {}, profile.displayName || '—')),
        h('div', { class: 'spec' }, h('dt', {}, 'Email'), h('dd', {}, user.email)),
        h('div', { class: 'spec' }, h('dt', {}, 'Role'), h('dd', {}, roleLabel(profile.role))),
      ),
    ),
    notificationsForm({ ...profile, uid: user.uid, email: user.email }),
    form,
  );
}
```

## `src/pages/deleted.js`

```js
// Admin: Deleted units. Deleting a unit moves it here for TRASH_DAYS (restorable, photos kept);
// after that the purgeDeletedUnits function removes it and its photos for good.
import { h, clear, icon, toast, mount, fmtDate, pager } from '../ui.js';
import { store } from '../store.js';
import { coverThumb, restoreEquipment, TRASH_DAYS } from '../data.js';
import { purgeNow } from './detail.js';

const DAY = 86400000;
const daysLeft = (eq) => {
  const t = eq.deletedAt?.toDate?.();
  return t ? Math.max(0, Math.ceil((+t + TRASH_DAYS * DAY - Date.now()) / DAY)) : TRASH_DAYS;
};

/** Small "Deleted units (n)" link for the bottom of Pending, Listed and Requests (admins only). */
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

export function renderDeleted(page) {
  const state = { page: 1 };
  const list = h('div', { class: 'card table-card' });
  const pg = pager(state, draw, { noun: 'units' });

  function row(eq) {
    const thumb = coverThumb(eq);
    const left = daysLeft(eq);
    return h(
      'div',
      { class: 'trash-row' },
      h('a', { href: `#/equipment/${eq.id}`, class: 'thumb' }, thumb ? h('img', { src: thumb, alt: '', loading: 'lazy' }) : icon('image')),
      h(
        'div',
        { class: 'trash-main' },
        h('a', { href: `#/equipment/${eq.id}` }, h('strong', {}, [eq.year, eq.make, eq.model].filter(Boolean).join(' '))),
        h('div', { class: 'muted small' }, [`Serial ${eq.serial}`, eq.ein && `EIN ${eq.ein}`, eq.warehouse].filter(Boolean).join(' · ')),
      ),
      h(
        'div',
        { class: 'trash-meta small' },
        h('div', {}, `Was ${eq.deletedFromStatus === 'archived' ? 'Listed' : 'Pending'} · deleted ${fmtDate(eq.deletedAt)}`),
        h('div', { class: 'muted' }, eq.deletedByEmail ? `by ${eq.deletedByEmail}` : eq.deletedReason || ''),
        h('div', { class: left <= 3 ? 'warn' : 'muted' }, left ? `Removed for good in ${left} day${left === 1 ? '' : 's'}` : 'Removed for good tonight'),
      ),
      h(
        'div',
        { class: 'btn-row trash-actions' },
        h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => purgeNow(eq, () => {}) }, 'Delete forever'),
        h(
          'button',
          {
            type: 'button',
            class: 'btn btn-primary btn-sm',
            onclick: async (e) => {
              e.currentTarget.disabled = true;
              try {
                await restoreEquipment(eq);
                toast(`${eq.make} ${eq.model} restored to ${eq.deletedFromStatus === 'archived' ? 'Listed' : 'Pending'}`);
              } catch (err) {
                toast(err.message, 'error');
                e.currentTarget.disabled = false;
              }
            },
          },
          'Restore',
        ),
      ),
    );
  }

  function draw() {
    const items = [...(store.get().trash || [])].sort((a, b) => (b.deletedAt?.toMillis?.() || 0) - (a.deletedAt?.toMillis?.() || 0));
    if (!store.get().equipment) {
      mount(clear(list), h('p', { class: 'muted pad' }, 'Loading…'));
      return;
    }
    if (!items.length) {
      mount(clear(list), h('p', { class: 'muted pad' }, 'Nothing has been deleted in the last 30 days.'));
      pg.slice([]);
      return;
    }
    mount(clear(list), ...pg.slice(items).map(row));
  }

  mount(
    page,
    h(
      'div',
      { class: 'page-head' },
      h(
        'div',
        {},
        h('a', { href: '#/', class: 'back-link', onclick: (e) => { if (history.length > 1) { e.preventDefault(); history.back(); } } }, icon('back'), 'Back'),
        h('h1', {}, 'Deleted units'),
        h('p', { class: 'muted' }, `Units deleted by an admin or removed after 60 days off the equipment report. Restore one to put it back where it was; after ${TRASH_DAYS} days they’re removed for good with their photos.`),
      ),
    ),
    list,
    pg.el,
  );
  draw();
  return store.subscribe(draw);
}
```

## `src/pages/detail.js`

```js
import { h, clear, icon, toast, fmtDate, fmtMoney, fmtNumber, confirmDialog, mount } from '../ui.js';
import { store } from '../store.js';
import { PHOTO_SLOTS, STATUSES, OFF_REPORT_DAYS } from '../config.js';
import { callSetupDownloads, restoreEquipment, purgeEquipment, TRASH_DAYS, subscribeEquipmentDoc, setOffReportKeep, setStatus, downloadAllPhotos, downloadPhoto, deleteEquipment, normalizeKey } from '../data.js';
import { navigate } from '../main.js';
import { messagesPanel, canResolve, markDone } from './messages.js';
import { subscribePrivateNotes } from '../data.js';

// Browser downloads need the Storage bucket to allow this site (CORS). The first time an admin hits that,
// the setupDownloads function switches it on and the download is retried.
async function withDownloadFix(fn) {
  try {
    return await fn();
  } catch (err) {
    if (!/failed to fetch|networkerror|load failed/i.test(err.message)) throw err;
    if (!store.isAdmin()) throw new Error('Photo downloads aren’t switched on yet. Ask an admin to download a photo once — that turns them on for everyone.');
    toast('Turning on photo downloads for this site…');
    try {
      await callSetupDownloads();
    } catch (e) {
      throw new Error(`Couldn’t turn on downloads automatically: ${e.message}. See “Allow photo downloads” in the README.`);
    }
    await new Promise((r) => setTimeout(r, 2500));
    try {
      return await fn();
    } catch {
      throw new Error('Downloads were just switched on — reload the page and try again in a minute.');
    }
  }
}

export function renderDetail(page, id) {
  mount(page, h('div', { class: 'center-pad' }, h('div', { class: 'spinner' })));
  let lightbox = null;
  let current = null;
  let panel = null; // messages thread — built once so a half-typed message survives redraws
  let focusedMessages = false;
  // Private comments: only loaded for admins/employees (the rules refuse viewers).
  let privateNotes = null;
  const privateEl = h('div', { class: 'comments-block private' });
  const unsubPrivate = store.canEdit()
    ? subscribePrivateNotes(id, (d) => {
        privateNotes = d;
        drawPrivate();
      }, () => {})
    : () => {};
  function drawPrivate() {
    if (!current) return;
    const canEditUnit = store.isAdmin() || current.createdBy === store.get().user.uid;
    mount(clear(privateEl), 
      h('h3', {}, 'Private comments', h('span', { class: 'vis-tag private' }, 'Hidden from viewers')),
      privateNotes?.text
        ? h('p', { class: 'prewrap' }, privateNotes.text)
        : h('p', { class: 'muted small' }, canEditUnit ? 'None — add some with Edit.' : 'None.'),
      privateNotes?.updatedByEmail ? h('p', { class: 'muted small' }, `Updated ${fmtDate(privateNotes.updatedAt)} by ${privateNotes.updatedByEmail}`) : null,
    );
  }
  let reqSig = '';
  const openReqSig = (st) => (st.requests || []).filter((r) => r.status !== 'done').map((r) => r.id + r.equipmentId + (r.assignedTo || '')).join('|');

  const unsub = subscribeEquipmentDoc(
    id,
    (eq) => {
      clear(page);
      if (!eq) {
        current = null;
        panel?.destroy();
        panel = null;
        mount(page, h('div', { class: 'card narrow' }, h('h2', {}, 'Unit not found'), h('p', { class: 'muted' }, 'It may have been deleted.'), h('a', { href: '#/' }, 'Back to inventory')));
        return;
      }
      current = eq;
      reqSig = openReqSig(store.get());
      if (!panel) panel = messagesPanel(eq);
      else panel.update(eq);
      draw(eq);
      if (!focusedMessages && location.hash.endsWith('?messages')) {
        focusedMessages = true; // only on arrival, not on every later update
        panel.focus();
      }
    },
    (err) => {
      clear(page);
      mount(page, h('div', { class: 'card narrow' }, h('h2', {}, 'Couldn’t load unit'), h('p', {}, err.message)));
    },
  );

  // Redraw when open requests for this unit change (they load separately from the unit).
  const unsubStore = store.subscribe((st) => {
    if (!current) return;
    const sig = openReqSig(st);
    if (sig === reqSig) return;
    reqSig = sig;
    clear(page);
    draw(current);
  });

  function draw(eq) {
    const isAdmin = store.isAdmin();
    const gone = eq.status === 'deleted'; // in Deleted units: read-only until restored
    const mayEdit = store.canEdit() && !gone; // viewers can't change anything
    const canEdit = mayEdit && (isAdmin || eq.createdBy === store.get().user.uid);
    const st = STATUSES.find((s) => s.key === eq.status) || STATUSES[0];
    const photoCount = PHOTO_SLOTS.filter((s) => eq.photos?.[s.key]).length;

    const dlBtn = h(
      'button',
      {
        class: 'btn btn-primary',
        disabled: photoCount === 0,
        onclick: async () => {
          dlBtn.disabled = true;
          const label = dlBtn.querySelector('span');
          try {
            await withDownloadFix(() => downloadAllPhotos(eq, () => (label.textContent = "Preparing zip…")));
          } catch (err) {
            toast(`Download failed: ${err.message}`, 'error');
          } finally {
            label.textContent = 'Download all photos';
            dlBtn.disabled = false;
          }
        },
      },
      icon('download'),
      h('span', {}, 'Download all photos'),
    );

    const statusEl = gone
      ? h('span', { class: 'status-badge status-deleted' }, 'Deleted')
      : isAdmin
      ? h(
          'select',
          {
            class: `status-select status-${eq.status}`,
            'aria-label': 'Status',
            onchange: async (e) => {
              try {
                await setStatus(eq.id, e.target.value);
                toast(e.target.value === 'archived' ? 'Marked as Listed' : 'Status updated');
              } catch (err) {
                toast(`Couldn't change status: ${err.message}`, 'error');
              }
            },
          },
          STATUSES.map((s) => h('option', { value: s.key, selected: s.key === eq.status }, s.label)),
        )
      : h('span', { class: `status-badge status-${st.key}` }, st.label);

    // One-click workflow button: photos posted → Listed; or undo.
    const listBtn = isAdmin && !gone
      ? h(
          'button',
          {
            class: eq.status === 'archived' ? 'btn btn-ghost' : 'btn btn-primary',
            onclick: async (e) => {
              const btn = e.currentTarget;
              const toListed = eq.status !== 'archived';
              if (toListed && photoCount < PHOTO_SLOTS.length) {
                const ok = await confirmDialog({ title: 'Mark as Listed?', message: `This unit has ${photoCount} of ${PHOTO_SLOTS.length} photos. It will leave Pending and move to Listed.`, confirmLabel: 'Mark as Listed' });
                if (!ok) return;
              }
              btn.disabled = true;
              try {
                await setStatus(eq.id, toListed ? 'archived' : 'active');
                toast(toListed ? 'Marked as Listed — removed from Pending' : 'Moved back to Pending');
              } catch (err) {
                toast(`Couldn't change status: ${err.message}`, 'error');
                btn.disabled = false;
              }
            },
          },
          icon(eq.status === 'archived' ? 'back' : 'check'),
          h('span', {}, eq.status === 'archived' ? 'Move back to Pending' : 'Mark as Listed'),
        )
      : null;

    const openReqs = (store.get().requests || []).filter(
      (r) => r.status !== 'done' && r.equipmentId === eq.id,
    );
    const reqBanner = openReqs.length
      ? h(
          'div',
          { class: 'request-banner' },
          icon('camera'),
          h(
            'div',
            { class: 'grow' },
            h('strong', {}, `Photos requested by ${openReqs[0].createdByName || openReqs[0].createdByEmail}`, openReqs[0].assignedToName ? ` · assigned to ${openReqs[0].assignedTo === store.get().user.uid ? 'you' : openReqs[0].assignedToName}` : ''),
            h('div', { class: 'small' }, openReqs[0].angles?.length ? openReqs[0].angles.map((k) => PHOTO_SLOTS.find((x) => x.key === k)?.label || k).join(', ') : 'All angles', openReqs[0].dueDate ? ` · needed by ${openReqs[0].dueDate}` : ''),
          ),
          store.canEdit() ? h('a', { href: `#/equipment/${eq.id}/edit?request=${openReqs[0].id}`, class: 'btn btn-primary btn-sm' }, 'Upload photos') : null,
        )
      : null;

    // Dropped off the daily equipment report → auto-deleted after OFF_REPORT_DAYS unless kept.
    const keepBtn = (keep, label, cls) =>
      h(
        'button',
        {
          class: `btn ${cls} btn-sm`,
          onclick: async (e) => {
            e.currentTarget.disabled = true;
            try {
              await setOffReportKeep(eq.id, keep);
              toast(keep ? 'Kept — this unit won’t be deleted automatically' : 'It will be flagged again if it’s not on the report');
            } catch (err) {
              toast(err.message, 'error');
              e.currentTarget.disabled = false;
            }
          },
        },
        label,
      );
    let offBanner = null;
    if (eq.offReport) {
      const since = eq.offReport.since?.toDate?.();
      const delDate = since ? new Date(+since + OFF_REPORT_DAYS * 86400000) : null;
      offBanner = h(
        'div',
        { class: 'offreport-banner' },
        h(
          'div',
          { class: 'grow' },
          h('strong', {}, `Not on the equipment report${since ? ` since ${fmtDate(eq.offReport.since)}` : ''}`),
          h('div', { class: 'small' }, delDate ? `It will be deleted with its photos on ${delDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} unless it shows up on the report again${isAdmin ? ' or you keep it' : ''}.` : 'It will be deleted automatically unless it shows up on the report again.'),
        ),
        isAdmin ? keepBtn(true, 'Keep — don’t delete', 'btn-ghost') : null,
      );
    } else if (eq.offReportKeep && isAdmin) {
      offBanner = h('div', { class: 'offreport-banner' }, h('div', { class: 'grow small' }, `Kept${eq.offReportKeepBy ? ` by ${eq.offReportKeepBy}` : ''} — won’t be deleted even if it’s not on the equipment report.`), keepBtn(false, 'Allow auto-delete', 'btn-ghost'));
    }

    // Follow-up flag set from the Messages thread ("needs more photos or changes").
    const fu = eq.followUp?.open ? eq.followUp : null;
    const followBanner = fu
      ? h(
          'div',
          { class: 'followup-banner' },
          h(
            'div',
            { class: 'grow' },
            h('strong', {}, `Needs more photos or changes — ${fu.byName || 'someone'} asked ${fmtDate(fu.at)}`),
            fu.text ? h('p', { class: 'prewrap small' }, fu.text) : null,
          ),
          h(
            'div',
            { class: 'btn-row' },
            h('button', { class: 'btn btn-ghost btn-sm', onclick: () => panel?.focus() }, 'Reply'),
            mayEdit ? h('a', { href: `#/equipment/${eq.id}/edit`, class: 'btn btn-ghost btn-sm' }, icon(canEdit ? 'edit' : 'camera'), h('span', {}, canEdit ? 'Edit' : 'Add photos')) : null,
            canResolve(eq)
              ? h(
                  'button',
                  {
                    class: 'btn btn-primary btn-sm',
                    onclick: async (e) => {
                      const btn = e.currentTarget;
                      btn.disabled = true;
                      try {
                        await markDone(eq);
                        toast(`Marked done — ${fu.byName || 'they'} will be notified`);
                      } catch (err) {
                        toast(err.message, 'error');
                        btn.disabled = false;
                      }
                    },
                  },
                  'Mark done',
                )
              : null,
          ),
        )
      : null;

    const spec = (label, value, cls = '') => h('div', { class: 'spec' }, h('dt', {}, label), h('dd', { class: cls }, value ?? '—'));

    mount(page, 
      h(
        'div',
        { class: 'page-head' },
        h(
          'div',
          {},
          gone
            ? h('a', { href: '#/deleted', class: 'back-link' }, icon('back'), 'Back to Deleted units')
            : h('a', { href: eq.status === 'archived' ? '#/listed' : '#/', class: 'back-link' }, icon('back'), eq.status === 'archived' ? 'Back to Listed' : 'Back to Pending'),
          h('h1', {}, `${eq.year ? `${eq.year} ` : ''}${eq.make} ${eq.model}`),
          h('p', { class: 'muted' }, [`Serial ${eq.serial}`, eq.ein && `EIN ${eq.ein}`, eq.warehouse].filter(Boolean).join(' · ')),
        ),
        h(
          'div',
          { class: 'head-actions' },
          statusEl,
          listBtn,
          canEdit && h('a', { href: `#/equipment/${eq.id}/edit`, class: 'btn btn-ghost' }, icon('edit'), h('span', {}, 'Edit')),
          mayEdit && !canEdit && (photoCount < PHOTO_SLOTS.length || eq.createdBy === 'daily-report') && h('a', { href: `#/equipment/${eq.id}/edit${openReqs[0] ? `?request=${openReqs[0].id}` : ''}`, class: 'btn btn-ghost' }, icon('camera'), h('span', {}, 'Add photos')),
          dlBtn,
        ),
      ),
      gone ? deletedBanner(eq, isAdmin) : offBanner,
      followBanner,
      reqBanner,
      h(
        'div',
        { class: 'detail-layout' },
        h(
          'div',
          { class: 'detail-main' },
          h(
          'section',
          { class: 'card' },
          h('div', { class: 'section-head' }, h('h2', { class: 'section-title' }, 'Photos'), h('span', { class: 'muted small' }, `${photoCount} of ${PHOTO_SLOTS.length}`)),
          h(
            'div',
            { class: 'gallery' },
            PHOTO_SLOTS.map((slot, i) => {
              const p = eq.photos?.[slot.key];
              if (!p) return h('figure', { class: 'gallery-item missing' }, h('div', { class: 'gallery-img' }, icon('image')), h('figcaption', {}, slot.label, h('span', { class: 'muted small' }, 'No photo')));
              return h(
                'figure',
                { class: 'gallery-item' },
                h('button', { class: 'gallery-img', onclick: () => openLightbox(eq, i), 'aria-label': `View ${slot.label} photo` }, h('img', { src: p.thumbUrl || p.url, alt: slot.label, loading: 'lazy' })),
                h(
                  'figcaption',
                  {},
                  slot.label,
                  h(
                    'button',
                    {
                      class: 'icon-btn sm',
                      title: `Download ${slot.label}`,
                      'aria-label': `Download ${slot.label}`,
                      onclick: () => withDownloadFix(() => downloadPhoto(eq, slot.key)).catch((err) => toast(`Download failed: ${err.message}`, 'error')),
                    },
                    icon('download'),
                  ),
                ),
              );
            }),
          ),
          h(
            'div',
            { class: 'comments-block' },
            h('h3', {}, 'Public comments'),
            eq.comments ? h('p', { class: 'prewrap' }, eq.comments) : h('p', { class: 'muted small' }, canEdit ? 'No comments yet — add some with Edit.' : 'No comments.'),
          ),
          store.canEdit() ? (drawPrivate(), privateEl) : null,
          ),
          panel?.el,
        ),
        h(
          'aside',
          { class: 'card specs-card' },
          h('h2', { class: 'section-title' }, 'Details'),
          h(
            'dl',
            { class: 'specs' },
            spec('Make', eq.make),
            spec('Model', eq.model),
            spec('Year', eq.year),
            spec('Hours', eq.hours != null ? fmtNumber(eq.hours) : null),
            spec('Warehouse', eq.warehouse),
            spec('EIN', eq.ein, 'mono'),
            spec('Serial #', eq.serial, 'mono'),
            spec('Condition', eq.condition),
            spec('Price', eq.price != null ? fmtMoney(eq.price) : null),
          ),
          eq.attachments ? h('div', { class: 'spec-block' }, h('h3', {}, 'Attachments / options'), h('p', { class: 'prewrap' }, eq.attachments)) : null,
          h(
            'div',
            { class: 'meta' },
            h('div', {}, 'Submitted ', h('strong', {}, fmtDate(eq.createdAt)), ' by ', eq.createdByName || eq.createdByEmail || 'unknown'),
            eq.updatedByEmail ? h('div', {}, 'Last updated ', fmtDate(eq.updatedAt), ' by ', eq.updatedByEmail) : null,
            eq.status === 'archived' && eq.listedAt ? h('div', {}, 'Listed ', h('strong', {}, fmtDate(eq.listedAt)), eq.listedByEmail ? ` by ${eq.listedByEmail}` : '') : null,
            eq.importBatch ? h('div', {}, 'Added from the daily equipment report', eq.reportStatus ? ` (${eq.reportStatus})` : '') : null,
          ),
          isAdmin && eq.status !== 'deleted'
            ? h(
                'button',
                {
                  class: 'btn btn-danger btn-block',
                  onclick: async () => {
                    const ok = await confirmDialog({ title: 'Delete this unit?', message: 'It moves to Deleted units. You can restore it for 30 days; after that it and its photos are removed for good.', confirmLabel: 'Delete', danger: true });
                    if (!ok) return;
                    try {
                      await deleteEquipment(eq.id, eq.status);
                      toast('Moved to Deleted units');
                      navigate(eq.status === 'archived' ? '/listed' : '/');
                    } catch (err) {
                      toast(`Delete failed: ${err.message}`, 'error');
                    }
                  },
                },
                icon('trash'),
                h('span', {}, 'Delete'),
              )
            : null,
        ),
      ),
    );
  }

  function openLightbox(eq, startIndex) {
    const slots = PHOTO_SLOTS.filter((s) => eq.photos?.[s.key]);
    let idx = slots.findIndex((s) => s.key === PHOTO_SLOTS[startIndex].key);
    const img = h('img', { alt: '' });
    const caption = h('span', {});
    const show = () => {
      const s = slots[idx];
      img.src = eq.photos[s.key].url;
      img.alt = s.label;
      caption.textContent = `${s.label} · ${idx + 1} of ${slots.length}`;
    };
    const step = (d) => {
      idx = (idx + d + slots.length) % slots.length;
      show();
    };
    const onKey = (e) => {
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    lightbox = h(
      'dialog',
      { class: 'lightbox', onclick: (e) => e.target === lightbox && lightbox.close() },
      h(
        'div',
        { class: 'lightbox-bar' },
        caption,
        h(
          'div',
          {},
          h('button', { class: 'icon-btn light', title: 'Download', 'aria-label': 'Download this photo', onclick: () => withDownloadFix(() => downloadPhoto(eq, slots[idx].key)).catch((err) => toast(`Download failed: ${err.message}`, 'error')) }, icon('download')),
          h('button', { class: 'icon-btn light', title: 'Close', 'aria-label': 'Close', onclick: () => lightbox.close() }, icon('x')),
        ),
      ),
      h('div', { class: 'lightbox-stage' }, h('button', { class: 'lb-nav prev', 'aria-label': 'Previous photo', onclick: () => step(-1) }, '‹'), img, h('button', { class: 'lb-nav next', 'aria-label': 'Next photo', onclick: () => step(1) }, '›')),
    );
    lightbox.addEventListener('close', () => {
      document.removeEventListener('keydown', onKey);
      lightbox.remove();
      lightbox = null;
    });
    document.addEventListener('keydown', onKey);
    document.body.append(lightbox);
    show();
    lightbox.showModal();
  }

  return () => {
    unsub();
    unsubStore();
    panel?.destroy();
    unsubPrivate();
    lightbox?.close();
  };
}

function deletedBanner(eq, isAdmin) {
  const since = eq.deletedAt?.toDate?.();
  const purge = since ? new Date(+since + TRASH_DAYS * 86400000) : null;
  return h(
    'div',
    { class: 'deleted-banner' },
    h(
      'div',
      { class: 'grow' },
      h('strong', {}, `Deleted${since ? ` ${fmtDate(eq.deletedAt)}` : ''}${eq.deletedByEmail ? ` by ${eq.deletedByEmail}` : eq.deletedReason ? ` — ${eq.deletedReason}` : ''}`),
      h('div', { class: 'small' }, purge ? `It and its photos will be removed for good on ${purge.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}.` : 'It will be removed for good after 30 days.'),
    ),
    isAdmin
      ? h(
          'div',
          { class: 'btn-row' },
          h('button', { class: 'btn btn-ghost btn-sm', onclick: () => purgeNow(eq) }, 'Delete forever'),
          h(
            'button',
            {
              class: 'btn btn-primary btn-sm',
              onclick: async (e) => {
                e.currentTarget.disabled = true;
                try {
                  await restoreEquipment(eq);
                  toast(`Restored to ${eq.deletedFromStatus === 'archived' ? 'Listed' : 'Pending'}`);
                } catch (err) {
                  toast(err.message, 'error');
                  e.currentTarget.disabled = false;
                }
              },
            },
            'Restore',
          ),
        )
      : null,
  );
}

export async function purgeNow(eq, after) {
  const ok = await confirmDialog({ title: 'Delete forever?', message: `${eq.make} ${eq.model} (Serial ${eq.serial}) and all of its photos and messages will be removed now. This can’t be undone.`, confirmLabel: 'Delete forever', danger: true });
  if (!ok) return;
  try {
    await purgeEquipment(eq.id);
    toast('Deleted forever');
    if (after) after();
    else navigate('/deleted');
  } catch (err) {
    toast(err.message, 'error');
  }
}
```

## `src/pages/first-password.js`

```js
// Shown after signing in with a temporary (emailed) password: the user must pick their own before continuing.
import { updatePassword, signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase.js';
import { h, passwordInput, checkNewPassword, MIN_PASSWORD } from '../ui.js';

export function renderFirstPassword({ user, profile }) {
  const next = passwordInput({ id: 'fp-new', autocomplete: 'new-password', placeholder: `At least ${MIN_PASSWORD} characters` });
  const confirm = passwordInput({ id: 'fp-confirm', autocomplete: 'new-password' });
  const msg = h('p', { class: 'form-msg', role: 'alert' });
  const btn = h('button', { type: 'submit', class: 'btn btn-primary btn-block' }, 'Save and continue');

  const form = h(
    'form',
    {
      class: 'login-card',
      onsubmit: async (e) => {
        e.preventDefault();
        msg.textContent = '';
        const problem = checkNewPassword(next.input.value, confirm.input.value);
        if (problem) {
          msg.textContent = problem;
          next.input.focus();
          return;
        }
        btn.disabled = true;
        btn.textContent = 'Saving…';
        try {
          await updatePassword(auth.currentUser, next.input.value);
          // Clearing the flag re-renders the app (main.js listens to the profile).
          await updateDoc(doc(db, 'users', user.uid), { mustChangePassword: false });
        } catch (err) {
          if (err.code === 'auth/requires-recent-login') {
            msg.textContent = 'For security, sign in again with your temporary password, then choose your new one.';
            setTimeout(() => signOut(auth), 2500);
          } else {
            msg.textContent = err.code === 'auth/weak-password' ? `Choose a stronger password (at least ${MIN_PASSWORD} characters).` : err.message;
          }
          btn.disabled = false;
          btn.textContent = 'Save and continue';
        }
      },
    },
    h('div', { class: 'login-brand' }, h('img', { src: '/kc-bobcat-logo.png', alt: 'K.C. Bobcat', class: 'login-logo', width: 500, height: 278 }), h('span', { class: 'login-sub' }, 'Choose your password')),
    h('p', { class: 'muted small' }, `Welcome${profile.displayName ? `, ${profile.displayName}` : ''}! You signed in with a temporary password. Choose your own to continue.`),
    h('label', { for: 'fp-new' }, 'New password'),
    next.wrap,
    h('label', { for: 'fp-confirm' }, 'Confirm new password'),
    confirm.wrap,
    msg,
    btn,
    h('button', { type: 'button', class: 'link-btn', onclick: () => signOut(auth) }, 'Sign out'),
  );
  return h('div', { class: 'login-screen' }, form);
}
```

## `src/pages/import-requests.js`

```js
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
```

## `src/pages/instructions.js`

```js
// Instructions: how branch staff should photograph a unit (three rules + an example of every angle).
import { h, icon, mount } from '../ui.js';
import { store } from '../store.js';
import { PHOTO_SLOTS, EXAMPLE_PHOTOS } from '../config.js';

// Line icons in the style of the reference cards: black machine, orange accents.
// Skid steer traced from the icon supplied by KC Bobcat (512×512 artwork, filled outline).
const SKID_PATH = 'M65 442C34 436 12 413 6 382C4 375 4 364 4 289L4 203L8 200L11 196L41 196L71 196L86 135C100 78 101 75 104 72L107 68L175 68C248 68 250 68 261 73C269 77 282 90 288 99C298 114 307 137 311 157C315 176 315 183 316 216L316 248L345 255C364 259 374 261 375 263C378 266 505 424 507 427C509 431 508 437 504 440L501 444L446 444L390 444L385 441C382 440 377 437 374 435C369 432 362 423 361 420C360 419 358 420 355 423C348 430 338 436 327 440C318 443 317 443 304 443C295 443 290 443 285 442C271 438 255 428 247 417L242 412L192 412L142 412L137 417C129 427 113 438 100 441C91 444 73 444 65 442ZM92 418C111 414 126 399 130 380C139 343 105 309 68 318C49 322 34 337 30 356C21 393 55 427 92 418ZM316 418C335 414 350 399 354 380C363 343 329 309 292 318C273 322 258 337 254 356C245 393 279 427 316 418ZM443 386C428 367 415 351 415 351C412 351 401 358 395 363C384 375 378 394 381 406C382 411 389 418 393 419C395 419 413 420 434 420L471 420L443 386ZM231 386C230 386 229 382 229 378C226 361 231 341 241 326C243 323 244 321 243 321C242 320 122 294 121 294C121 295 122 297 123 300C124 304 126 307 132 313C146 327 154 343 156 362C156 370 155 382 153 386C153 388 156 388 192 388C228 388 231 388 231 386ZM76 379C71 377 68 373 68 368C68 364 69 363 72 360C75 357 76 356 80 356C84 356 85 357 88 360C91 363 92 364 92 368C92 372 91 373 88 376C85 379 79 381 76 379ZM300 379C295 377 292 373 292 368C292 364 293 363 296 360C299 357 300 356 304 356C308 356 309 357 312 360C315 363 316 364 316 368C316 372 315 373 312 376C309 379 303 381 300 379ZM394 335C396 333 399 331 399 331C399 330 366 288 362 284C361 283 99 224 98 224C98 225 111 265 112 266C112 267 147 275 190 284L268 301L274 299C284 294 291 293 304 293C313 293 319 293 323 294C347 301 366 319 375 343L377 348L383 343C386 340 391 337 394 335ZM31 310C33 308 45 300 52 298C62 294 68 292 82 293C89 293 95 293 95 293C95 293 90 276 83 256L71 220L50 220L28 220L28 266C28 292 28 312 29 312C29 312 30 311 31 310ZM292 220C292 193 291 180 287 162C281 130 267 105 251 95L246 92L217 92L188 92L188 156L188 220L196 222C271 238 291 243 291 243C292 243 292 233 292 220ZM164 153L164 92L143 92L121 92L108 145C101 174 95 199 96 199C96 200 158 214 162 214L164 214L164 153Z';
const skid = (x, y, size) => `<path transform="translate(${x} ${y}) scale(${size / 512})" fill="#111" fill-rule="evenodd" d="${SKID_PATH}"/>`;
const ICONS = {
  alone: `${skid(13, 13, 54)}
    <g fill="none" stroke="#f30" stroke-width="2.6" stroke-linecap="round"><path d="M8 16V8h8M64 8h8v8M72 64v8h-8M16 72H8v-8"/></g>`,
  clean: `${skid(15, 23, 50)}
    <g fill="none" stroke="#f30" stroke-width="2.2" stroke-linejoin="round">
      <path d="M18 6c1 5 2 6 7 7-5 1-6 2-7 7-1-5-2-6-7-7 5-1 6-2 7-7z"/>
      <path d="M40 4c4 6 6 9 6 12a6 6 0 0 1-12 0c0-3 2-6 6-12z"/>
      <path d="M60 8c.8 3.5 1.5 4.2 5 5-3.5.8-4.2 1.5-5 5-.8-3.5-1.5-4.2-5-5 3.5-.8 4.2-1.5 5-5z"/></g>`,
  store: `<g fill="none" stroke="#111" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">
      <path d="M8 66V28L40 12l32 16v38M4 66h72"/>
      <path d="M54 40h12v26H54zM54 48h12M54 56h12"/></g>
    ${skid(14, 40, 31)}
    <rect x="28" y="24" width="24" height="8" rx="2" fill="none" stroke="#f30" stroke-width="2.4"/>
    <path d="M32 28h16" stroke="#f30" stroke-width="2"/>`,
};

const STEPS = [
  { icon: 'alone', title: 'Let It Stand Alone', text: 'Pull the unit out and shoot it by itself. No other units in the frame — it’s the star.' },
  { icon: 'clean', title: 'Clean It First', text: 'Wash it before you shoot it. Every photo is a reflection of KC Bobcat.' },
  { icon: 'store', title: 'Stage It at Our Store', text: 'Park it in front of the building or sign so KC Bobcat shows in the background.' },
];

// Angles without their own example point at the matching shot from the other side.
const HINTS = {
  rightFront: 'Front corner, with the whole machine in frame.',
  hourMeter: 'Hours clearly readable.',
  serialPlate: 'Close enough that every number is readable.',
  interior: 'Open the door; show the seat and controls.',
};

function openExample(slot) {
  const ex = EXAMPLE_PHOTOS[slot.key];
  const dlg = h(
    'dialog',
    { class: 'lightbox example-box', onclick: (e) => e.target === dlg && dlg.close() },
    h('figure', {}, h('img', { src: ex.full, alt: `${slot.label} example` }), h('figcaption', {}, slot.label, h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Close', onclick: () => dlg.close() }, icon('x')))),
  );
  dlg.addEventListener('close', () => dlg.remove());
  document.body.append(dlg);
  dlg.showModal();
}

export function renderInstructions(page) {
  const step = (s, i) =>
    h(
      'article',
      { class: 'step-card' },
      h('div', { class: 'step-icon', html: `<svg viewBox="0 0 80 80" aria-hidden="true">${ICONS[s.icon]}</svg>` }),
      h('div', { class: 'step-num' }, `Step ${i + 1}`),
      h('h2', {}, s.title),
      h('p', {}, s.text),
    );

  const shot = (slot, i) => {
    const ex = EXAMPLE_PHOTOS[slot.key];
    return h(
      'figure',
      { class: `shot${ex ? '' : ' no-example'}` },
      ex
        ? h('button', { type: 'button', class: 'shot-img', onclick: () => openExample(slot), 'aria-label': `Enlarge ${slot.label} example` }, h('img', { src: ex.small, alt: `${slot.label} example`, loading: 'lazy' }))
        : h('div', { class: 'shot-img' }, icon('camera')),
      h('figcaption', {}, h('span', { class: 'shot-n' }, String(i + 1)), h('span', {}, h('strong', {}, slot.label), HINTS[slot.key] ? h('span', { class: 'muted small block' }, HINTS[slot.key]) : null)),
    );
  };

  mount(
    page,
    h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'How to photograph a unit'), h('p', { class: 'muted' }, 'These photos go on our website and Machinery Trader. Three rules, then the shots we need.'))),
    h('section', { class: 'steps' }, STEPS.map(step)),
    h(
      'section',
      { class: 'card' },
      h('div', { class: 'section-head' }, h('h2', { class: 'section-title' }, `The ${PHOTO_SLOTS.length} shots`), h('span', { class: 'muted small' }, 'Tap an example to enlarge')),
      h('p', { class: 'muted small' }, 'Hold your phone sideways (landscape) and fit the whole machine in the frame. Walk around the unit in this order.'),
      h('div', { class: 'shots' }, PHOTO_SLOTS.map(shot)),
    ),
    store.canEdit() ? h('div', { class: 'form-actions-row' }, h('a', { href: '#/requests', class: 'btn btn-ghost' }, 'My photo requests'), h('a', { href: '#/new', class: 'btn btn-primary' }, icon('camera'), h('span', {}, 'Add equipment'))) : null,
  );
}
```

## `src/pages/inventory.js`

```js
import { h, clear, icon, toast, fmtDate, confirmDialog, mount, pager } from '../ui.js';
import { store } from '../store.js';
import { STATUSES, PHOTO_SLOTS, OFF_REPORT_DAYS } from '../config.js';
import { coverThumb, setStatus, deleteEquipment } from '../data.js';
import { navigate } from '../main.js';
import { deletedLink } from './deleted.js';

// Filters survive navigating to a unit and back (per tab, per browser session).
const saved = {
  main: { q: '', make: '', model: '', warehouse: '', ein: '', serial: '', status: '', sort: 'createdAt', dir: 'desc' },
  archive: { q: '', make: '', model: '', warehouse: '', ein: '', serial: '', status: '', sort: 'createdAt', dir: 'desc' },
};

const COLUMNS = [
  { key: 'photo', label: 'Photo', sortable: false },
  { key: 'make', label: 'Make' },
  { key: 'model', label: 'Model' },
  { key: 'warehouse', label: 'Warehouse' },
  { key: 'ein', label: 'EIN' },
  { key: 'serial', label: 'Serial #' },
  { key: 'createdAt', label: 'Submitted' },
  { key: 'status', label: 'Status' },
];

const norm = (s) => String(s ?? '').toLowerCase().trim();

// Dropped off the daily equipment report (usually sold); deleted automatically after OFF_REPORT_DAYS.
export function offReportTag(eq) {
  if (!eq.offReport) return null;
  const since = eq.offReport.since?.toDate?.();
  const left = since ? Math.max(0, OFF_REPORT_DAYS - Math.floor((Date.now() - since) / 86400000)) : null;
  return h('span', { class: 'offreport-tag block', title: left != null ? `Deleted automatically in ${left} day${left === 1 ? '' : 's'} unless it comes back on the report or an admin keeps it` : '' }, `Not on report${since ? ` since ${since.toLocaleDateString([], { month: 'short', day: 'numeric' })}` : ''}`);
}

// "3/11 photos" so admins can see at a glance what's ready to post.
function photoTag(eq) {
  const n = PHOTO_SLOTS.filter((s) => eq.photos?.[s.key]).length;
  return h('span', { class: `photo-tag block${n === 0 ? ' none' : n === PHOTO_SLOTS.length ? ' full' : ''}` }, n ? `${n}/${PHOTO_SLOTS.length} photos` : 'No photos yet');
}

export function renderInventory(page, { archive }) {
  const f = saved[archive ? 'archive' : 'main'];
  const isAdmin = store.isAdmin();

  // ----- filter controls -----
  const makeSel = h('select', { id: 'f-make', onchange: (e) => update({ make: e.target.value }) });
  const whSel = h('select', { id: 'f-wh', onchange: (e) => update({ warehouse: e.target.value }) });
  const textInput = (id, key, placeholder) =>
    h('input', { id, type: 'search', value: f[key], placeholder, autocomplete: 'off', oninput: (e) => update({ [key]: e.target.value }) });

  const statusSel = archive
    ? h(
        'select',
        { id: 'f-status', onchange: (e) => update({ status: e.target.value }) },
        h('option', { value: '' }, 'All listed'),
        h('option', { value: 'offreport', selected: f.status === 'offreport' }, 'Not on report'),
      )
    : h(
        'select',
        { id: 'f-status', onchange: (e) => update({ status: e.target.value }) },
        h('option', { value: '' }, 'All pending'),
        h('option', { value: 'active', selected: f.status === 'active' }, 'Pending (not hidden)'),
        h('option', { value: 'hidden', selected: f.status === 'hidden' }, 'Hidden'),
        h('option', { value: 'followup', selected: f.status === 'followup' }, 'Needs follow-up'),
        h('option', { value: 'offreport', selected: f.status === 'offreport' }, 'Not on report'),
      );

  const qInput = h('input', {
    type: 'search',
    class: 'search-main',
    value: f.q,
    placeholder: 'Search make, model, EIN, serial, warehouse…',
    'aria-label': 'Search all fields',
    oninput: (e) => update({ q: e.target.value }),
  });

  const count = h('span', { class: 'muted' });
  const tbody = h('tbody');
  const thead = h('thead');
  const empty = h('div', { class: 'empty', hidden: true });
  const pg = pager(f, draw, { noun: 'units' });
  const tableCard = h('section', { class: 'card table-card' }, h('div', { class: 'table-scroll' }, h('table', { class: 'eq-table' }, thead, tbody)), empty, pg.el);

  const field = (label, id, control) => h('div', { class: 'field' }, h('label', { for: id }, label), control);

  mount(page, 
    h(
      'div',
      { class: 'page-head' },
      h('div', {}, archive ? h('h1', {}, 'Listed') : null, h('p', { class: 'muted' }, archive ? 'Units whose photos have been posted. Photos stay here for sales reps. Change the status to move one back to Pending.' : 'Units waiting on photos or to be posted. Open one to see its photos, download them, or mark it Listed.')),
      !archive && store.canEdit() && h('a', { href: '#/new', class: 'btn btn-primary' }, icon('plus'), h('span', {}, 'Add Equipment')),
    ),
    h(
      'section',
      { class: 'card filters' },
      h('div', { class: 'search-wrap' }, icon('search'), qInput),
      h(
        'div',
        { class: 'filter-grid' },
        field('Make', 'f-make', makeSel),
        field('Model', 'f-model', textInput('f-model', 'model', 'Any model')),
        field('Warehouse', 'f-wh', whSel),
        field('EIN', 'f-ein', textInput('f-ein', 'ein', 'Any EIN')),
        field('Serial #', 'f-serial', textInput('f-serial', 'serial', 'Any serial')),
        statusSel && field('Status', 'f-status', statusSel),
      ),
      h('div', { class: 'filter-foot' }, count, h('button', { class: 'link-btn', onclick: resetFilters }, 'Clear filters')),
    ),
    tableCard,
    deletedLink(),
  );

  function resetFilters() {
    Object.assign(f, { q: '', make: '', model: '', warehouse: '', ein: '', serial: '', status: '', page: 1 });
    page.querySelectorAll('.filters input').forEach((i) => (i.value = ''));
    page.querySelectorAll('.filters select').forEach((s) => (s.value = ''));
    draw();
  }

  function update(patch) {
    Object.assign(f, patch, { page: 1 }); // new search/filter → back to page 1
    draw();
  }

  function fillSelect(sel, values, current, anyLabel) {
    const want = [anyLabel, ...values].join('|');
    if (sel.dataset.sig === want) return;
    sel.dataset.sig = want;
    mount(clear(sel), h('option', { value: '' }, anyLabel), ...values.map((v) => h('option', { value: v, selected: v === current }, v)));
    if (current && !values.includes(current)) sel.value = '';
  }

  function drawHead() {
    mount(clear(thead), 
      h(
        'tr',
        {},
        COLUMNS.map((c) =>
          c.sortable === false
            ? h('th', { class: `col-${c.key}` }, c.label)
            : h(
                'th',
                { class: `col-${c.key} sortable${f.sort === c.key ? ' sorted' : ''}`, 'aria-sort': f.sort === c.key ? (f.dir === 'asc' ? 'ascending' : 'descending') : 'none' },
                h(
                  'button',
                  {
                    onclick: () => {
                      if (f.sort === c.key) f.dir = f.dir === 'asc' ? 'desc' : 'asc';
                      else Object.assign(f, { sort: c.key, dir: c.key === 'createdAt' ? 'desc' : 'asc' });
                      f.page = 1;
                      draw();
                    },
                  },
                  c.label,
                  h('span', { class: 'sort-arrow' }, f.sort === c.key ? (f.dir === 'asc' ? '▲' : '▼') : ''),
                ),
              ),
        ),
      ),
    );
  }

  function statusControl(eq) {
    const st = STATUSES.find((s) => s.key === eq.status) || STATUSES[0];
    if (!isAdmin) return h('span', { class: `status-badge status-${st.key}` }, st.label);
    const sel = h(
      'select',
      {
        class: `status-select status-${eq.status}`,
        'aria-label': `Status for ${eq.make} ${eq.model}`,
        onclick: (e) => e.stopPropagation(),
        onchange: async (e) => {
          const next = e.target.value;
          const prev = eq.status;
          sel.className = `status-select status-${next}`;
          try {
            await setStatus(eq.id, next);
            if (next === 'archived') toast(`${eq.make} ${eq.model} moved to Listed`);
            else if (prev === 'archived') toast(`${eq.make} ${eq.model} moved back to Pending`);
          } catch (err) {
            sel.value = prev;
            sel.className = `status-select status-${prev}`;
            toast(`Couldn't change status: ${err.message}`, 'error');
          }
        },
      },
      STATUSES.map((s) => h('option', { value: s.key, selected: s.key === eq.status }, s.label)),
    );
    return sel;
  }

  function row(eq) {
    const thumb = coverThumb(eq);
    const open = () => {
      // Opening a unit clears the search/filters, so coming back shows the full list (sort order is kept).
      Object.assign(f, { q: '', make: '', model: '', warehouse: '', ein: '', serial: '', status: '', page: 1 });
      navigate(`/equipment/${eq.id}`);
    };
    return h(
      'tr',
      {
        class: 'eq-row',
        tabindex: '0',
        onclick: open,
        onkeydown: (e) => {
          if (e.key === 'Enter' && e.target === e.currentTarget) open();
        },
      },
      h('td', { class: 'col-photo' }, thumb ? h('img', { src: thumb, alt: '', loading: 'lazy', class: 'thumb' }) : h('div', { class: 'thumb thumb-empty' }, icon('image'))),
      h(
        'td',
        { 'data-label': 'Make', class: 'col-make' },
        h('strong', {}, eq.make || '—'),
        eq.followUp?.open ? h('span', { class: 'followup-tag block', title: eq.followUp.text || '' }, 'Needs follow-up') : null,
        !archive ? photoTag(eq) : null,
        offReportTag(eq),
      ),
      h('td', { 'data-label': 'Model', class: 'col-model' }, eq.model || '—', eq.year ? h('span', { class: 'muted small block' }, eq.year) : null),
      h('td', { 'data-label': 'Warehouse' }, eq.warehouse || '—'),
      h('td', { 'data-label': 'EIN', class: 'mono' }, eq.ein || '—'),
      h('td', { 'data-label': 'Serial #', class: 'mono' }, eq.serial || '—'),
      h('td', { 'data-label': 'Submitted' }, h('span', { class: 'cell-val' }, fmtDate(eq.createdAt), h('span', { class: 'muted small block' }, eq.createdByName || ''))),
      h(
        'td',
        { 'data-label': 'Status', class: 'col-status' },
        h('span', { class: 'cell-val' },
        statusControl(eq),
        isAdmin
          ? h(
              'button',
              {
                class: 'icon-btn danger',
                title: 'Delete',
                'aria-label': `Delete ${eq.make} ${eq.model}`,
                onclick: async (e) => {
                  e.stopPropagation();
                  const ok = await confirmDialog({
                    title: 'Delete this unit?',
                    message: `${eq.make} ${eq.model} (Serial ${eq.serial}) moves to Deleted units. You can restore it for 30 days; after that it and its photos are removed for good.`,
                    confirmLabel: 'Delete',
                    danger: true,
                  });
                  if (!ok) return;
                  try {
                    await deleteEquipment(eq.id, eq.status);
                    toast(`${eq.make} ${eq.model} moved to Deleted units`);
                  } catch (err) {
                    toast(`Delete failed: ${err.message}`, 'error');
                  }
                },
              },
              icon('trash'),
            )
          : null,
        ),
      ),
    );
  }

  function draw() {
    const { equipment, equipmentError, settings } = store.get();
    drawHead();

    if (equipmentError) {
      clear(tbody);
      empty.hidden = false;
      mount(clear(empty), h('p', {}, `Couldn't load equipment: ${equipmentError}`));
      return;
    }
    if (!equipment) {
      clear(tbody);
      empty.hidden = false;
      mount(clear(empty), h('div', { class: 'spinner' }));
      return;
    }

    const inTab = equipment.filter((e) => (archive ? e.status === 'archived' : e.status !== 'archived'));

    const makes = [...new Set(inTab.map((e) => e.make).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const warehouses = [...new Set([...(settings.warehouses || []), ...inTab.map((e) => e.warehouse).filter(Boolean)])].sort((a, b) => a.localeCompare(b));
    fillSelect(makeSel, makes, f.make, 'All makes');
    fillSelect(whSel, warehouses, f.warehouse, 'All warehouses');

    const q = norm(f.q);
    const rows = inTab.filter((e) => {
      if (f.make && e.make !== f.make) return false;
      if (f.warehouse && e.warehouse !== f.warehouse) return false;
      if (f.status === 'followup') {
        if (!e.followUp?.open) return false;
      } else if (f.status === 'offreport') {
        if (!e.offReport) return false;
      } else if (f.status && e.status !== f.status) return false;
      if (f.model && !norm(e.model).includes(norm(f.model))) return false;
      if (f.ein && !norm(e.ein).includes(norm(f.ein))) return false;
      if (f.serial && !norm(e.serial).includes(norm(f.serial))) return false;
      if (q) {
        const hay = norm([e.make, e.model, e.year, e.warehouse, e.ein, e.serial, e.attachments, e.comments, e.condition, e.createdByName].join(' '));
        if (!q.split(/\s+/).every((t) => hay.includes(t))) return false;
      }
      return true;
    });

    const dir = f.dir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      if (f.sort === 'createdAt') {
        const ta = a.createdAt?.toMillis?.() ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? 0;
        return (ta - tb) * dir;
      }
      return String(a[f.sort] ?? '').localeCompare(String(b[f.sort] ?? ''), undefined, { numeric: true, sensitivity: 'base' }) * dir;
    });

    count.textContent = `${rows.length} of ${inTab.length} unit${inTab.length === 1 ? '' : 's'}`;
    mount(clear(tbody), ...pg.slice(rows).map(row));

    empty.hidden = rows.length > 0;
    if (!rows.length) {
      mount(clear(empty), 
        inTab.length
          ? h('p', {}, 'No units match these filters.')
          : archive
            ? h('p', {}, 'Nothing listed yet. Units move here when they’re marked Listed.')
            : h('div', {}, h('p', {}, 'No equipment submitted yet.'), store.canEdit() ? h('a', { href: '#/new', class: 'btn btn-primary' }, 'Add the first piece of equipment') : null),
      );
    }
  }

  draw();
  return store.subscribe(draw);
}
```

## `src/pages/login.js`

```js
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase.js';
import { h, passwordInput } from '../ui.js';

const messages = {
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/invalid-email': 'That email address doesn’t look right.',
  'auth/user-disabled': 'This account has been disabled. Ask an admin to reactivate it.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes or reset your password.',
  'auth/network-request-failed': 'Network error — check your connection and try again.',
};

export function renderLogin() {
  const email = h('input', { type: 'email', id: 'email', autocomplete: 'username', required: true });
  const password = passwordInput({ id: 'password', autocomplete: 'current-password' });
  const msg = h('p', { class: 'form-msg', role: 'alert' });
  const submit = h('button', { type: 'submit', class: 'btn btn-primary btn-block' }, 'Sign in');

  const form = h(
    'form',
    {
      class: 'login-card',
      onsubmit: async (e) => {
        e.preventDefault();
        msg.className = 'form-msg';
        msg.textContent = '';
        submit.disabled = true;
        submit.textContent = 'Signing in…';
        try {
          await signInWithEmailAndPassword(auth, email.value.trim(), password.input.value);
        } catch (err) {
          msg.textContent = messages[err.code] || err.message;
          submit.disabled = false;
          submit.textContent = 'Sign in';
        }
      },
    },
    h(
      'div',
      { class: 'login-brand' },
      h('img', { src: '/kc-bobcat-logo.png', alt: 'K.C. Bobcat', class: 'login-logo', width: 500, height: 278 }),
      h('span', { class: 'login-sub' }, 'Used Equipment Dashboard'),
    ),
    h('label', { for: 'email' }, 'Email'),
    email,
    h('label', { for: 'password' }, 'Password'),
    password.wrap,
    msg,
    submit,
    h(
      'button',
      {
        type: 'button',
        class: 'link-btn',
        onclick: async () => {
          msg.className = 'form-msg';
          msg.textContent = '';
          const addr = email.value.trim();
          if (!addr) {
            msg.textContent = 'Enter your email above, then click “Forgot password?” again.';
            email.focus();
            return;
          }
          try {
            await sendPasswordResetEmail(auth, addr, { url: location.origin });
          } catch (err) {
            // Only hide "no such account" (so the form doesn't reveal who has one); show real problems.
            if (err.code !== 'auth/user-not-found') {
              msg.textContent =
                err.code === 'auth/unauthorized-continue-uri'
                  ? `Password reset isn’t set up for ${location.hostname} yet — ask an admin to add it to Firebase Auth’s authorized domains.`
                  : messages[err.code] || err.message;
              return;
            }
          }
          msg.className = 'form-msg ok';
          msg.textContent = `If ${addr} has an account, a password reset link is on its way.`;
        },
      },
      'Forgot password?',
    ),
  );

  return h('div', { class: 'login-screen' }, form, h('p', { class: 'login-foot' }, 'Accounts are created by an admin. Need access? Contact your manager.'));
}
```

## `src/pages/messages.js`

```js
// "Messages" thread on a unit — lets anyone write back to the person who submitted it
// (e.g. "need a better hour-meter photo"), optionally flagging the unit for follow-up.
import { h, clear, toast, mount } from '../ui.js';
import { store } from '../store.js';
import { subscribeMessages, postMessage } from '../data.js';

const pname = (u) => u.displayName || u.email;

/**
 * @-mentions for a textarea: typing "@" shows active users; picking one inserts "@Name ".
 * mentioned() returns the uids whose "@Name" is still in the text.
 */
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

/** Message text with @mentions highlighted. */
function withMentions(text, mentions = []) {
  const users = store.get().users || [];
  const tags = mentions.map((uid) => users.find((u) => u.uid === uid)).filter(Boolean).map((u) => `@${pname(u)}`).sort((a, b) => b.length - a.length);
  if (!tags.length) return text;
  const re = new RegExp(`(${tags.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
  return text.split(re).map((part) => (tags.includes(part) ? h('span', { class: 'mention' }, part) : part));
}

const KIND_LABEL = { action: 'Needs photos / changes', resolved: 'Marked done' };

function when(ts) {
  const d = ts?.toDate ? ts.toDate() : null;
  if (!d) return '';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** Who can clear a follow-up flag: the submitter or an admin (viewers never). Units from the daily report have
 * no submitter, so any employee (e.g. the branch photo contact) can. */
export function canResolve(eq) {
  const me = store.get().user?.uid;
  return store.canEdit() && (store.isAdmin() || eq.createdBy === me || eq.createdBy === 'daily-report');
}

export function markDone(eq, text = '') {
  return postMessage(eq.id, { text, kind: 'resolved' });
}

/**
 * Builds the panel once per unit page so typed text survives redraws.
 * Call update(eq) whenever the unit changes; destroy() on leave.
 */
export function messagesPanel(initialEq) {
  let eq = initialEq;
  const me = store.get().user.uid;
  const list = h('div', { class: 'msg-list' }, h('p', { class: 'muted small' }, 'Loading…'));
  const intro = h('p', { class: 'muted small' });
  const text = h('textarea', { rows: 3, maxlength: 4000, placeholder: 'Write a message… type @ to tag someone', 'aria-label': 'Message' });
  const mentions = mentionBox(text);
  const flag = h('input', { type: 'checkbox' });
  const flagLabel = h('label', { class: 'check-inline' }, flag, h('span', {}, 'Needs more photos or changes — flag this unit until it’s marked done'));
  const sendBtn = h('button', { type: 'submit', class: 'btn btn-primary btn-sm' }, 'Send');
  const msg = h('p', { class: 'form-msg', role: 'alert' });

  const form = h(
    'form',
    {
      class: 'msg-compose',
      onsubmit: async (e) => {
        e.preventDefault();
        msg.textContent = '';
        const body = text.value.trim();
        if (!body) {
          msg.textContent = flag.checked ? 'Say what needs to be done.' : 'Type a message first.';
          text.focus();
          return;
        }
        sendBtn.disabled = true;
        try {
          const tagged = mentions.mentioned();
          await postMessage(eq.id, { text: body, kind: flag.checked ? 'action' : 'note', mentions: tagged });
          text.value = '';
          flag.checked = false;
          mentions.reset();
          const names = tagged.map((uid) => (store.get().users || []).find((u) => u.uid === uid)).filter(Boolean).map(pname);
          toast(
            names.length
              ? `Sent — ${names.join(', ')} ${names.length === 1 ? 'was' : 'were'} notified`
              : eq.createdBy === me ? 'Message posted' : eq.createdBy === 'daily-report' ? 'Sent — the photo contact will get an email' : `Sent — ${eq.createdByName || 'the submitter'} will get an email`,
          );
        } catch (err) {
          msg.textContent = err.message;
        } finally {
          sendBtn.disabled = false;
        }
      },
    },
    h('div', { class: 'mention-wrap' }, text, mentions.pop),
    h('div', { class: 'msg-compose-row' }, flagLabel, h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn btn-ghost btn-sm', title: 'Tag someone — they’ll get an email', onclick: () => mentions.insertAt() }, '@ Tag'), sendBtn)),
    msg,
  );

  const el = h('section', { class: 'card messages-card', id: 'messages' }, h('h2', { class: 'section-title' }, 'Messages'), intro, list, form);

  function renderIntro() {
    const mine = eq.createdBy === me;
    intro.textContent = mine
      ? 'Questions or change requests about this unit show up here. Replies notify whoever wrote to you.'
      : eq.createdBy === 'daily-report'
        ? 'Write to whoever is taking this unit’s photos (the branch photo contact) — they’ll get an email. Use the flag if more photos or changes are needed.'
        : `Write to ${eq.createdByName || eq.createdByEmail || 'the submitter'} — they’ll get an email. Use the flag if more photos or changes are needed.`;
    // The submitter doesn't flag their own unit; they reply or mark it done.
    flagLabel.hidden = mine;
  }

  function renderList(rows) {
    clear(list);
    if (!rows.length) {
      mount(list, h('p', { class: 'muted small' }, 'No messages yet.'));
      return;
    }
    mount(list, 
      ...rows.map((m) =>
        h(
          'article',
          { class: `msg${m.authorId === me ? ' mine' : ''}${m.kind !== 'note' ? ` kind-${m.kind}` : ''}` },
          h(
            'div',
            { class: 'msg-head' },
            h('strong', {}, m.authorId === me ? 'You' : m.authorName || m.authorEmail),
            m.authorId === eq.createdBy ? h('span', { class: 'msg-role' }, 'submitter') : null,
            KIND_LABEL[m.kind] ? h('span', { class: `msg-kind ${m.kind}` }, KIND_LABEL[m.kind]) : null,
            h('span', { class: 'muted small' }, when(m.createdAt)),
          ),
          m.text ? h('p', { class: 'prewrap' }, withMentions(m.text, m.mentions)) : null,
        ),
      ),
    );
  }

  renderIntro();
  const unsub = subscribeMessages(eq.id, renderList, (err) => {
    mount(clear(list), h('p', { class: 'muted small' }, `Couldn’t load messages: ${err.message}`));
  });

  return {
    el,
    update(next) {
      eq = next;
      renderIntro();
    },
    focus() {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      text.focus({ preventScroll: true });
    },
    destroy: unsub,
  };
}
```

## `src/pages/notifications.js`

```js
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
```

## `src/pages/report-import.js`

```js
// Admin → Settings → Daily report tab: the automatic import of the e-Emphasys equipment report.
// (Photo contacts and report codes per location are on the Locations tab.)
// Rows with ERP status "K – Post to Web" / "*K – Post to Web" become Pending units with a photo request
// assigned to the branch's photo contact. The work happens in the runReportImport / dailyReportImport functions.
import { h, clear, icon, toast, mount, fmtDate, confirmDialog } from '../ui.js';
import { subscribeReportSettings, saveReportSettings, subscribeReportRuns, callRunReportImport, fileToBase64 } from '../data.js';

const when = (t) => (t?.toDate ? t.toDate().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '');
const SOURCES = { schedule: 'Automatic', manual: 'Run now', upload: 'Uploaded file' };

// "No longer on the report" part of a run (flag → warn → delete after 60 days).
function offReportSummary(r) {
  const o = r.offReport;
  if (!o) return null;
  if (o.skippedReason) return h('p', { class: 'muted small' }, o.skippedReason);
  const link = (c) => h('li', {}, h('a', { href: `#/equipment/${c.id}` }, h('strong', {}, c.unit)), h('span', { class: 'muted' }, ` · ${c.warehouse} · Serial ${c.serial}`));
  const part = (title, list, linked = true) => (list?.length ? [h('h3', { class: 'sub-title' }, title), h('ul', { class: 'report-list' }, list.map((c) => (linked ? link(c) : h('li', {}, h('strong', {}, c.unit), h('span', { class: 'muted' }, ` · ${c.warehouse} · Serial ${c.serial}`)))))] : []);
  const nothing = !o.flagged?.length && !o.cleared?.length && !o.warn?.length && !o.deleted?.length && !o.requestsRemoved?.length;
  return [
    ...part(`${r.dryRun ? 'Would flag' : 'Flagged'} ${o.flagged?.length} as no longer on the report`, o.flagged),
    ...part(`Back on the report (${o.cleared?.length})`, o.cleared),
    ...part(`${r.dryRun ? 'Would warn' : 'Warned'} — deleting within a week (${o.warn?.length})`, o.warn),
    ...part(`${r.dryRun ? 'Would move' : 'Moved'} to Deleted units after 60 days off the report (${o.deleted?.length})`, o.deleted),
    ...(o.requestsRemoved?.length ? [h('h3', { class: 'sub-title' }, `${r.dryRun ? 'Would remove' : 'Removed'} ${o.requestsRemoved.length} photo request${o.requestsRemoved.length === 1 ? '' : 's'} — no longer on the report`), h('ul', { class: 'report-list' }, o.requestsRemoved.map((c) => h('li', {}, h('strong', {}, c.unit), h('span', { class: 'muted' }, ` · ${c.warehouse} · Serial ${c.serial}`))))] : []),
    nothing ? h('p', { class: 'muted small' }, 'Every unit in the app is still on the report.') : null,
  ];
}

export function renderReportTab(page) {
  let cfg = null;
  let dirty = false;

  // ---------- 1. automatic import ----------
  const enabled = h('input', { type: 'checkbox', id: 'rp-on', onchange: () => (dirty = true) });
  const url = h('input', { type: 'url', id: 'rp-url', placeholder: 'https://…/equipment-list.pdf', autocomplete: 'off', spellcheck: 'false', oninput: () => (dirty = true) });
  const saveBtn = h('button', { type: 'submit', class: 'btn btn-primary' }, 'Save');
  const cleanUrl = (v) => v.replace(/[\s\u200B-\u200D\uFEFF"'<>]/g, '');
  const testBtn = h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => run({ dryRun: true, url: cleanUrl(url.value) }) }, 'Test link');
  // Uses the link in the box (saving it first if it was changed), so you don't have to press Save before running.
  const runBtn = h(
    'button',
    {
      type: 'button',
      class: 'btn btn-ghost',
      onclick: async () => {
        const v = cleanUrl(url.value);
        url.value = v;
        if (!v) {
          toast('Paste the report link first', 'error');
          return;
        }
        if (v !== (cfg?.url || '')) {
          try {
            await saveReportSettings({ url: v });
          } catch (err) {
            toast(err.message, 'error');
            return;
          }
        }
        run({ url: v });
      },
    },
    icon('download'),
    h('span', {}, 'Run import now'),
  );
  const lastEl = h('div', { class: 'report-last' });
  const autoForm = h(
    'form',
    {
      class: 'card',
      onsubmit: async (e) => {
        e.preventDefault();
        const v = cleanUrl(url.value);
        url.value = v;
        if (enabled.checked && !v) {
          toast('Add the report link first', 'error');
          return;
        }
        saveBtn.disabled = true;
        try {
          await saveReportSettings({ url: v, enabled: enabled.checked });
          dirty = false;
          toast(enabled.checked ? 'Saved — the report will be imported every morning' : 'Saved — automatic import is off');
        } catch (err) {
          toast(err.message, 'error');
        } finally {
          saveBtn.disabled = false;
        }
      },
    },
    h('h2', { class: 'section-title' }, 'Automatic import'),
    lastEl,
    h('div', { class: 'field' }, h('label', { for: 'rp-url' }, 'Report link'), url, h('span', { class: 'muted small' }, 'The web address Zapier saves the report to. It should always be the same link, overwritten each day. Use https://user:password@… if the folder is password-protected.')),
    h('label', { class: 'check-inline', style: 'margin-top:12px' }, enabled, h('span', {}, 'Import automatically every morning')),
    h('div', { class: 'form-actions-row' }, testBtn, runBtn, saveBtn),
    h(
      'details',
      { class: 'how-it-works' },
      h('summary', {}, 'How it works'),
      h(
        'ul',
        { class: 'small' },
        h('li', {}, 'Every morning at 8:30 (Central) the report at this link is read.'),
        h('li', {}, 'Units with ERP status “K – Post to Web” or “*K – Post to Web” become photo requests on the Requests tab, assigned to that location’s photo contact (set on the Locations tab).'),
        h('li', {}, 'When the photos are uploaded, the unit is added to Pending and admins get a “Photos ready” email.'),
        h('li', {}, 'Units already in the app, with an open photo request, or imported before are skipped. Requests for units that drop off the report before photos are taken are removed.'),
        h('li', {}, 'Units no longer on the report get a “Not on report” tag and move to Deleted units after 60 days (restorable for 30 more). Admins are emailed a week before; open a unit and click Keep to stop it.'),
      ),
    ),
    h('div', { class: 'upload-row' }, h('span', { class: 'muted small' }, 'Missed a day?'), h('button', { type: 'button', class: 'link-btn small', onclick: () => fileInput.click() }, 'Upload a report file instead')),
  );

  // ---------- 2. manual upload ----------
  const fileInput = h('input', { type: 'file', accept: '.pdf,.csv,.txt,application/pdf,text/csv', hidden: true, onchange: (e) => e.target.files[0] && pickFile(e.target.files[0]) });
  let pendingFile = null;
  async function pickFile(file) {
    fileInput.value = '';
    if (file.size > 12 * 1024 * 1024) {
      toast('That file is too large', 'error');
      return;
    }
    pendingFile = { fileBase64: await fileToBase64(file), fileName: file.name };
    run({ dryRun: true, ...pendingFile });
  }

  // ---------- result / preview ----------
  const resultEl = h('section', { class: 'card', hidden: true, 'aria-live': 'polite' });

  async function run(args) {
    const busy = [testBtn, runBtn, saveBtn];
    busy.forEach((b) => (b.disabled = true));
    resultEl.hidden = false;
    mount(clear(resultEl), h('div', { class: 'row-center' }, h('div', { class: 'spinner sm' }), h('span', { class: 'muted' }, args.dryRun ? 'Reading the report…' : 'Importing…')));
    resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    try {
      const { data } = await callRunReportImport(args);
      drawResult(data, args);
      if (!args.dryRun) {
        toast(data.created.length ? `${data.created.length} photo request${data.created.length === 1 ? '' : 's'} created` : 'Nothing new to add');
        pendingFile = null;
      }
    } catch (err) {
      mount(clear(resultEl), h('h2', { class: 'section-title' }, 'Couldn’t import the report'), h('p', { class: 'form-msg' }, err.message));
    } finally {
      busy.forEach((b) => (b.disabled = false));
    }
  }

  function drawResult(r, args) {
    const listItem = (c) =>
      h(
        'li',
        {},
        h('span', { class: 'mono' }, c.warehouseCode || '—'),
        ' ',
        c.equipmentId && (c.reason || !r.dryRun) ? h('a', { href: `#/equipment/${c.equipmentId}` }, h('strong', {}, c.unit)) : h('strong', {}, c.unit),
        h('span', { class: 'muted' }, ` · Serial ${c.serial} · EIN ${c.ein}`),
        c.reason ? h('span', { class: 'flag warn' }, c.reason) : h('span', { class: 'muted small block' }, `→ ${c.warehouse} · ${c.assignedTo ? `photo request to ${c.assignedToName}` : 'unassigned (no branch contact)'}`),
        // Imported before (e.g. deleted by mistake) → an admin can bring it back as a new photo request.
        c.canReimport && c.key
          ? h(
              'button',
              {
                type: 'button',
                class: 'btn btn-ghost btn-sm reimport-btn',
                onclick: async () => {
                  const ok = await confirmDialog({
                    title: `Add ${c.unit} again?`,
                    message: 'A new photo request is created for it, as if it were new on today’s report.',
                    confirmLabel: 'Add again',
                  });
                  if (ok) run({ ...args, dryRun: false, reimport: [c.key] });
                },
              },
              'Add again',
            )
          : null,
      );
    mount(
      clear(resultEl),
      h('h2', { class: 'section-title' }, r.dryRun ? 'Preview — nothing has been added yet' : 'Import finished'),
      h('p', { class: 'muted' }, `${r.fileName || 'Report'}${r.reportDate ? ` · as of ${r.reportDate}` : ''} · ${r.rowsFound} units in the report, ${r.postToWeb} marked Post to Web.`),
      r.unmapped?.length
        ? h('p', { class: 'warn small' }, `Warehouse code${r.unmapped.length === 1 ? '' : 's'} ${r.unmapped.join(', ')} ${r.unmapped.length === 1 ? 'isn’t' : 'aren’t'} matched to a warehouse — add ${r.unmapped.length === 1 ? 'it' : 'them'} on the Locations tab (+ code), or the code is used as the location name.`)
        : null,
      h('h3', { class: 'sub-title' }, r.dryRun ? `Would request photos of ${r.created.length}` : `Requested ${r.created.length}`),
      r.created.length ? h('ul', { class: 'report-list' }, r.created.map(listItem)) : h('p', { class: 'muted small' }, 'No new Post to Web units.'),
      r.skipped.length ? h('h3', { class: 'sub-title' }, `Skipped ${r.skipped.length}`) : null,
      r.skipped.length ? h('ul', { class: 'report-list' }, r.skipped.map(listItem)) : null,
      offReportSummary(r),
      r.dryRun && r.created.length
        ? h(
            'div',
            { class: 'form-actions-row' },
            h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => (resultEl.hidden = true) }, 'Cancel'),
            h('button', { type: 'button', class: 'btn btn-primary', onclick: () => run({ ...args, dryRun: false }) }, `Create ${r.created.length} photo request${r.created.length === 1 ? '' : 's'}`),
          )
        : null,
    );
  }

  // ---------- 4. history ----------
  const runsEl = h('ul', { class: 'mail-log' }, h('li', { class: 'muted small' }, 'Loading…'));
  const unsubRuns = subscribeReportRuns(
    (rows) => {
      if (!rows.length) {
        mount(clear(runsEl), h('li', { class: 'muted small' }, 'No imports yet.'));
        return;
      }
      mount(
        clear(runsEl),
        ...rows.map((r) =>
          h(
            'li',
            { class: r.ok ? 'ok' : 'bad' },
            h('span', { class: 'mail-status' }, r.ok ? (r.created?.length ? `+${r.created.length}` : 'No new') : 'Failed'),
            h(
              'span',
              { class: 'mail-body' },
              h('strong', {}, SOURCES[r.source] || r.source),
              r.byName ? ` by ${r.byName}` : '',
              r.ok ? h('span', { class: 'block small' }, `${r.reportDate ? `Report of ${r.reportDate} · ` : ''}${r.postToWeb} Post to Web, ${r.created?.length || 0} requested, ${r.skipped?.length || 0} skipped${r.created?.length ? ` — ${r.created.map((c) => c.unit).join(', ')}` : ''}${r.offReport?.flagged?.length ? ` · ${r.offReport.flagged.length} no longer on report` : ''}${r.offReport?.deleted?.length ? ` · ${r.offReport.deleted.length} moved to Deleted` : ""}`) : h('span', { class: 'block small' }, r.error),
            ),
            h('span', { class: 'muted small' }, when(r.at)),
          ),
        ),
      );
    },
    (err) => mount(clear(runsEl), h('li', { class: 'muted small' }, `Couldn’t load history: ${err.message}`)),
  );

  function drawLast() {
    const l = cfg?.lastRun;
    if (!l) {
      mount(clear(lastEl), h('p', { class: 'muted small' }, 'Hasn’t run yet.'));
      return;
    }
    mount(
      clear(lastEl),
      h(
        'p',
        { class: `test-result ${l.ok ? 'ok' : 'bad'}` },
        l.ok ? `Last import ${when(l.at)}: ${l.created} photo request${l.created === 1 ? "" : "s"} created${l.reportDate ? ` (report of ${l.reportDate})` : ''}.` : `Last import failed ${when(l.at)}: ${l.error}`,
      ),
    );
  }

  const unsubCfg = subscribeReportSettings(
    (d) => {
      cfg = d;
      if (!dirty) {
        url.value = d.url || '';
        enabled.checked = Boolean(d.enabled);
      }
      drawLast();
    },
    (err) => toast(`Couldn’t load report settings: ${err.message}`, 'error'),
  );

  mount(
    page,
    fileInput,
    h('div', { class: 'settings-grid' }, autoForm, h('section', { class: 'card scroll-card' }, h('h2', { class: 'section-title' }, 'Recent imports'), h('div', { class: 'scroll-body' }, runsEl))),
    resultEl,
  );
  return () => {
    unsubRuns();
    unsubCfg();
  };
}
```

## `src/pages/requests.js`

```js
import { h, clear, icon, toast, fmtDate, confirmDialog, mount, pager } from '../ui.js';
import { store } from '../store.js';
import { deletedLink } from './deleted.js';
import { navigate, setLeaveGuard } from '../main.js';
import { PHOTO_SLOTS } from '../config.js';
import {
  createRequest, completeRequest, reopenRequest, deleteRequest, findCandidate, linkRequest, assignRequest, coverThumb,
} from '../data.js';

// Remembered while the browser tab is open.
const view = { tab: 'open', q: '', who: 'all', page: 1 };

const slotLabel = (k) => PHOTO_SLOTS.find((s) => s.key === k)?.label || k;
const norm = (s) => String(s ?? '').toLowerCase().trim();

function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function fmtDue(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Where "Upload photos" goes: the linked unit (add photos), or a new submission prefilled from the request. */
export function fulfillHref(req) {
  return req.equipmentId ? `#/equipment/${req.equipmentId}/edit?request=${req.id}` : `#/new?request=${req.id}`;
}

/** Active staff, sorted by name, for the "Assign to" pickers. */
function staff() {
  return (store.get().users || [])
    .filter((u) => u.active && u.role !== 'viewer') // viewers can't upload, so they aren't assignable
    .sort((a, b) => (a.displayName || a.email).localeCompare(b.displayName || b.email));
}

function assigneeOptions(selected) {
  const me = store.get().user.uid;
  const list = staff();
  // Keep the current assignee visible even if they've since become view-only or inactive.
  const current = selected && !list.some((u) => u.uid === selected) ? (store.get().users || []).find((u) => u.uid === selected) : null;
  return [
    h('option', { value: '' }, 'Unassigned'),
    current ? h('option', { value: current.uid, selected: true }, `${current.displayName || current.email} (${current.active ? 'view-only' : 'inactive'} — reassign)`) : null,
    ...list.map((u) => h('option', { value: u.uid, selected: u.uid === selected }, `${u.displayName || u.email}${u.uid === me ? ' (me)' : ''}`)),
  ].filter(Boolean);
}

export function renderRequests(page) {
  const me = store.get().user.uid;
  const isAdmin = store.isAdmin();

  const toggleBtn = h(
    'div',
    { class: 'btn-row' },
    h('a', { href: '#/requests/import', class: 'btn btn-ghost' }, icon('download'), h('span', {}, 'Import')),
    h('a', { href: '#/requests/new', class: 'btn btn-primary' }, icon('plus'), h('span', {}, 'New request')),
  );

  // ---------- list ----------
  const tabsEl = h('div', { class: 'seg', role: 'tablist' });
  const search = h('input', { type: 'search', value: view.q, placeholder: 'Search make, model, serial, EIN…', 'aria-label': 'Search requests', oninput: (e) => { view.q = e.target.value; view.page = 1; draw(); } });
  const whoSel = h(
    'select',
    { class: 'who-select', 'aria-label': 'Show', onchange: (e) => { view.who = e.target.value; view.page = 1; draw(); } },
    h('option', { value: 'all', selected: view.who === 'all' }, 'Everyone’s requests'),
    h('option', { value: 'assigned', selected: view.who === 'assigned' }, 'Assigned to me'),
    h('option', { value: 'mine', selected: view.who === 'mine' }, 'Requested by me'),
    h('option', { value: 'unassigned', selected: view.who === 'unassigned' }, 'Unassigned'),
  );
  const list = h('div', { class: 'todo-list' });
  const pg = pager(view, () => draw(), { noun: 'requests', scrollTo: list });

  mount(page, 
    h('div', { class: 'page-head' }, h('div', {}, h('p', { class: 'muted' }, 'Units that need photos taken — added by hand or from the daily equipment report. Use “Upload photos” and the unit moves to Pending.')), toggleBtn),
    h('div', { class: 'todo-toolbar' }, tabsEl, h('div', { class: 'todo-filters' }, h('div', { class: 'search-wrap compact' }, icon('search'), search), whoSel)),
    list,
    pg.el,
    deletedLink(),
  );

  async function run(promise, okMsg) {
    try {
      await promise;
      if (okMsg) toast(okMsg);
    } catch (err) {
      toast(err.message, 'error');
      draw();
    }
  }

  function item(req, equipment) {
    const done = req.status === 'done';
    const eq = req.equipmentId ? equipment?.find((e) => e.id === req.equipmentId) : null;
    const thumb = eq ? coverThumb(eq) : null;
    const today = todayISO();
    const overdue = !done && req.dueDate && req.dueDate < today;
    const dueToday = !done && req.dueDate === today;
    const canEdit = isAdmin || req.createdBy === me;
    const title = [req.year, req.make, req.model].filter(Boolean).join(' ') || 'Unit';
    const ids = [req.serial && `Serial ${req.serial}`, req.ein && `EIN ${req.ein}`, req.warehouse, req.hours != null && `${Number(req.hours).toLocaleString()} hrs`].filter(Boolean).join(' · ');
    const missing = eq ? PHOTO_SLOTS.filter((s) => !eq.photos?.[s.key]).map((s) => s.key) : null;

    const mayCheck = store.canEdit() || req.createdBy === me;
    const check = h('input', {
      type: 'checkbox',
      class: 'todo-check',
      checked: done,
      disabled: !mayCheck,
      title: mayCheck ? null : 'View-only accounts can’t check off other people’s requests',
      'aria-label': done ? `Reopen request for ${title}` : `Mark request for ${title} done`,
      onchange: (e) => run(e.target.checked ? completeRequest(req.id) : reopenRequest(req.id), e.target.checked ? 'Marked done — find it under Completed' : 'Request reopened'),
    });

    // Assignee: editable by the requester or an admin while open; read-only otherwise.
    const assignEl =
      canEdit && !done
        ? h(
            'label',
            { class: 'assign-inline' },
            h('span', {}, 'Assigned to'),
            h(
              'select',
              {
                onchange: (e) => {
                  const u = staff().find((x) => x.uid === e.target.value) || null;
                  run(assignRequest(req.id, u), u ? (u.uid === me ? 'Assigned to you' : `Assigned to ${u.displayName || u.email} — they’ve been emailed`) : 'Unassigned');
                },
              },
              assigneeOptions(req.assignedTo),
            ),
          )
        : h('span', { class: `assignee${req.assignedTo === me ? ' me' : ''}` }, req.assignedTo ? `Assigned to ${req.assignedTo === me ? 'you' : req.assignedToName || 'someone'}` : 'Unassigned');

    return h(
      'article',
      { class: `todo${done ? ' is-done' : ''}${overdue ? ' is-overdue' : ''}${req.assignedTo === me && !done ? ' is-mine' : ''}` },
      check,
      h(
        'div',
        { class: 'todo-body' },
        h(
          'div',
          { class: 'todo-title' },
          h('strong', {}, title),
          req.dueDate ? h('span', { class: `due${overdue ? ' overdue' : dueToday ? ' today' : ''}` }, overdue ? `Overdue · ${fmtDue(req.dueDate)}` : dueToday ? 'Due today' : `Due ${fmtDue(req.dueDate)}`) : null,
        ),
        ids ? h('div', { class: 'todo-ids mono' }, ids) : null,
        h(
          'div',
          { class: 'todo-angles' },
          req.angles?.length
            ? req.angles.map((k) => h('span', { class: `angle${missing && !missing.includes(k) ? ' have' : ''}` }, slotLabel(k)))
            : h('span', { class: 'angle all' }, 'All angles'),
        ),
        req.notes ? h('p', { class: 'todo-notes prewrap' }, req.notes) : null,
        h('div', { class: 'todo-assign' }, assignEl),
        h(
          'div',
          { class: 'todo-meta muted small' },
          `Requested by ${req.createdByName || req.createdByEmail} · ${fmtDate(req.createdAt)}`,
          done ? ` — done by ${req.completedByName || 'someone'} · ${fmtDate(req.completedAt)}` : null,
          eq
            ? h(
                'span',
                {},
                ' · Linked to ',
                h('a', { href: `#/equipment/${eq.id}` }, `${eq.make} ${eq.model} (Serial ${eq.serial})`),
                missing ? ` · ${PHOTO_SLOTS.length - missing.length}/${PHOTO_SLOTS.length} photos` : '',
                canEdit && !done ? h('button', { class: 'link-btn unlink', onclick: () => run(linkRequest(req.id, null), 'Unlinked — Upload photos will start a new submission') }, 'Not this unit') : null,
              )
            : req.equipmentId
              ? ' · Linked unit was deleted'
              : null,
        ),
      ),
      h(
        'div',
        { class: 'todo-actions' },
        thumb ? h('img', { src: thumb, alt: '', class: 'thumb', loading: 'lazy' }) : null,
        !done && store.canEdit() ? h('a', { href: fulfillHref(req), class: 'btn btn-primary btn-sm' }, icon('camera'), h('span', {}, 'Upload photos')) : null,
        canEdit
          ? h(
              'button',
              {
                class: 'icon-btn danger',
                title: 'Delete request',
                'aria-label': `Delete request for ${title}`,
                onclick: async () => {
                  const ok = await confirmDialog({ title: 'Delete this request?', message: `${title}${req.serial ? ` (Serial ${req.serial})` : ''} will be removed from the list.`, confirmLabel: 'Delete', danger: true });
                  if (ok) run(deleteRequest(req.id), 'Request deleted');
                },
              },
              icon('trash'),
            )
          : null,
      ),
    );
  }

  function draw() {
    const { requests, requestsError, equipment } = store.get();
    if (requestsError) {
      mount(clear(list), h('div', { class: 'card empty' }, `Couldn't load requests: ${requestsError}`));
      return;
    }
    if (!requests) {
      mount(clear(list), h('div', { class: 'center-pad' }, h('div', { class: 'spinner' })));
      return;
    }
    const open = requests.filter((r) => r.status !== 'done');
    const done = requests.filter((r) => r.status === 'done');

    const tab = (key, label, n) =>
      h('button', { role: 'tab', 'aria-selected': String(view.tab === key), class: `seg-btn${view.tab === key ? ' active' : ''}`, onclick: () => { view.tab = key; view.page = 1; draw(); } }, label, h('span', { class: 'seg-count' }, n));
    mount(clear(tabsEl), tab('open', 'Open', open.length), tab('done', 'Completed', done.length));

    const q = norm(view.q);
    let rows = (view.tab === 'open' ? open : done).filter((r) => {
      if (view.who === 'assigned' && r.assignedTo !== me) return false;
      if (view.who === 'mine' && r.createdBy !== me) return false;
      if (view.who === 'unassigned' && r.assignedTo) return false;
      if (!q) return true;
      const hay = norm([r.make, r.model, r.serial, r.ein, r.warehouse, r.notes, r.createdByName, r.assignedToName].join(' '));
      return q.split(/\s+/).every((t) => hay.includes(t));
    });
    if (view.tab === 'open') {
      // Due date first (overdue on top), then oldest request first.
      rows = [...rows].sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999') || (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0));
    } else {
      rows = [...rows].sort((a, b) => (b.completedAt?.toMillis?.() ?? 0) - (a.completedAt?.toMillis?.() ?? 0));
    }

    clear(list);
    if (!rows.length) {
      pg.slice([]);
      mount(list, 
        h(
          'div',
          { class: 'card empty' },
          requests.length && (q || view.who !== 'all')
            ? h('p', {}, 'No requests match.')
            : view.tab === 'open'
              ? h('div', {}, h('p', {}, 'Nothing waiting on photos. 🎉'), h('a', { href: '#/requests/new', class: 'btn btn-primary' }, 'New request'))
              : h('p', {}, 'No completed requests yet.'),
        ),
      );
      return;
    }
    mount(list, ...pg.slice(rows).map((r) => item(r, equipment)));
  }

  draw();
  return store.subscribe(draw);
}

/** "New photo request" — its own page, like the unit submission form. */
export function renderNewRequest(page) {
  const me = store.get().user.uid;
  let dirty = false;
  setLeaveGuard(() => dirty);

  // ---------- new request form ----------
  const warehouses = () => store.get().settings.warehouses || [];
  const f = {
    make: h('input', { id: 'rq-make', value: 'Bobcat', maxlength: 80, autocomplete: 'off' }),
    model: h('input', { id: 'rq-model', maxlength: 80, placeholder: 'e.g. T76', autocomplete: 'off' }),
    serial: h('input', { id: 'rq-serial', maxlength: 60, class: 'mono', autocomplete: 'off' }),
    ein: h('input', { id: 'rq-ein', maxlength: 40, class: 'mono', autocomplete: 'off' }),
    warehouse: h('select', { id: 'rq-wh' }),
    assignee: h('select', { id: 'rq-assign' }),
    due: h('input', { id: 'rq-due', type: 'date', min: todayISO() }),
    notes: h('textarea', { id: 'rq-notes', rows: 2, maxlength: 2000, placeholder: 'Anything the photographer should know — where it’s parked, what to focus on…' }),
  };
  function fillSelects() {
    const wh = f.warehouse.value;
    mount(clear(f.warehouse), h('option', { value: '' }, 'Any / not sure'), ...warehouses().map((w) => h('option', { value: w }, w)));
    f.warehouse.value = wh;
    const who = f.assignee.value;
    mount(clear(f.assignee), ...assigneeOptions(who));
    f.assignee.value = who;
  }
  fillSelects();

  // Suggest an existing unit when the serial / EIN matches one — the requester decides whether to link it.
  const linkCb = h('input', { type: 'checkbox' });
  const matchBox = h('div', { class: 'match-box', hidden: true });
  let candidate = null;
  function updateMatch() {
    const found = findCandidate({ serial: f.serial.value, ein: f.ein.value }, store.get().equipment);
    const prevId = candidate?.eq.id;
    candidate = found;
    if (!found) {
      matchBox.hidden = true;
      linkCb.checked = false;
      return;
    }
    const { eq, by } = found;
    if (eq.id !== prevId) linkCb.checked = false; // never pre-checked: linking is a deliberate choice
    const thumb = coverThumb(eq);
    const modelDiffers = f.model.value.trim() && eq.model && norm(f.model.value) !== norm(eq.model);
    mount(clear(matchBox), 
      thumb ? h('img', { src: thumb, alt: '', class: 'thumb' }) : h('div', { class: 'thumb thumb-empty' }, icon('image')),
      h(
        'div',
        { class: 'grow' },
        h('div', {}, h('strong', {}, `Same ${by} as a unit already in inventory:`)),
        h('div', { class: 'small' }, `${eq.year ? `${eq.year} ` : ''}${eq.make} ${eq.model} · Serial ${eq.serial}${eq.ein ? ` · EIN ${eq.ein}` : ''}${eq.warehouse ? ` · ${eq.warehouse}` : ''} `, h('a', { href: `#/equipment/${eq.id}`, target: '_blank' }, 'view')),
        modelDiffers ? h('div', { class: 'small warn' }, `Heads up: the model (${eq.model}) doesn’t match what you typed.`) : null,
        h('label', { class: 'check-inline' }, linkCb, h('span', {}, 'This is the same unit — add the photos to it')),
      ),
    );
    matchBox.hidden = false;
  }
  ['input', 'change'].forEach((ev) => {
    f.serial.addEventListener(ev, updateMatch);
    f.ein.addEventListener(ev, updateMatch);
    f.model.addEventListener(ev, updateMatch);
  });

  const angleBoxes = PHOTO_SLOTS.map((s) => {
    const cb = h('input', { type: 'checkbox', value: s.key });
    return { cb, el: h('label', { class: 'chip-check' }, cb, h('span', {}, s.label)) };
  });
  const allBtn = h('button', { type: 'button', class: 'link-btn', onclick: () => {
    const allOn = angleBoxes.every((a) => a.cb.checked);
    angleBoxes.forEach((a) => (a.cb.checked = !allOn));
  } }, 'Select all / none');

  const msg = h('p', { class: 'form-msg', role: 'alert' });
  const saveBtn = h('button', { type: 'submit', class: 'btn btn-primary' }, 'Add request');
  const field = (label, id, el, cls = '') => h('div', { class: `field ${cls}` }, h('label', { for: id }, label), el);

  const formCard = h(
    'form',
    {
      class: 'card request-form',
      oninput: () => (dirty = true),
      onsubmit: async (e) => {
        e.preventDefault();
        msg.className = 'form-msg';
        msg.textContent = '';
        const assignee = staff().find((u) => u.uid === f.assignee.value) || null;
        const data = {
          make: f.make.value.trim(),
          model: f.model.value.trim(),
          serial: f.serial.value.trim(),
          ein: f.ein.value.trim(),
          warehouse: f.warehouse.value,
          dueDate: f.due.value || null,
          notes: f.notes.value.trim(),
          // Every angle ticked = "all angles" (stored as an empty list).
          angles: angleBoxes.every((a) => a.cb.checked) ? [] : angleBoxes.filter((a) => a.cb.checked).map((a) => a.cb.value),
          equipmentId: candidate && linkCb.checked ? candidate.eq.id : null,
          assignedTo: assignee?.uid || null,
          assignedToName: assignee ? assignee.displayName || assignee.email : null,
        };
        if (!data.serial && !data.ein && !data.model) {
          msg.textContent = 'Enter at least a serial #, EIN, or model so the unit can be found.';
          f.serial.focus();
          return;
        }
        saveBtn.disabled = true;
        try {
          await createRequest(data);
          toast(assignee && assignee.uid !== me ? `Request added — ${data.assignedToName} has been emailed` : 'Photo request added');
          dirty = false;
          setLeaveGuard(null);
          view.tab = 'open';
          navigate('/requests');
        } catch (err) {
          msg.textContent = err.message;
        } finally {
          saveBtn.disabled = false;
        }
      },
    },
    h('h2', { class: 'section-title' }, 'Unit'),
    h(
      'div',
      { class: 'form-grid' },
      field('Make', 'rq-make', f.make),
      field('Model', 'rq-model', f.model),
      field('Serial #', 'rq-serial', f.serial),
      field('EIN', 'rq-ein', f.ein),
      field('Warehouse', 'rq-wh', f.warehouse),
      field('Assign to', 'rq-assign', f.assignee),
      field('Needed by', 'rq-due', f.due),
    ),
    matchBox,
    h(
      'div',
      { class: 'field wide angles-field' },
      h('div', { class: 'angles-head' }, h('span', { class: 'label-like' }, 'Angles needed'), h('span', { class: 'muted small' }, 'Leave all unchecked for “all angles”.'), allBtn),
      h('div', { class: 'chip-checks' }, angleBoxes.map((a) => a.el)),
    ),
    field('Notes', 'rq-notes', f.notes, 'wide'),
    msg,
    h('div', { class: 'form-actions-row' }, h('a', { href: '#/requests', class: 'btn btn-ghost' }, 'Cancel'), saveBtn),
  );


  mount(page, 
    h(
      'div',
      { class: 'page-head' },
      h('div', {}, h('a', { href: '#/requests', class: 'back-link' }, icon('back'), 'Back to requests'), h('h1', {}, 'New photo request'), h('p', { class: 'muted' }, 'Ask for photos of a unit. Assign it to someone and they’ll get an email.')),
    ),
    formCard,
  );
  f.model.focus();

  // Warehouse / staff lists can arrive after the page opens.
  const unsub = store.subscribe(fillSelects);
  return () => {
    unsub();
    setLeaveGuard(null);
  };
}
```

## `src/pages/settings.js`

```js
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
```

## `src/pages/submit.js`

```js
import { h, clear, icon, toast, confirmDialog, mount } from '../ui.js';
import { store } from '../store.js';
import { PHOTO_SLOTS, ALL_PHOTOS_REQUIRED, CONDITIONS, EXAMPLE_PHOTOS } from '../config.js';
import {
  newEquipmentId, createEquipment, updateEquipment, getEquipment, uploadPhoto, findBySerial, normalizeKey,
  getRequest, completeRequest, addPhotos, getPrivateNotes, savePrivateNotes,
} from '../data.js';
import { navigate, setLeaveGuard } from '../main.js';

export function renderSubmit(page, { id, requestId }) {
  const editing = Boolean(id);
  mount(page, h('div', { class: 'center-pad' }, h('div', { class: 'spinner' })));

  let alive = true;
  Promise.all([
    editing ? getEquipment(id) : null,
    requestId ? getRequest(requestId).catch(() => null) : null,
    editing && store.canEdit() ? getPrivateNotes(id).catch(() => '') : '',
  ])
    .then(([eq, request, privateNotes]) => {
      if (!alive) return; // user navigated away while loading
      clear(page);
      if (editing && !eq) {
        mount(page, h('div', { class: 'card narrow' }, h('h2', {}, 'Unit not found'), h('a', { href: '#/' }, 'Back to inventory')));
        return;
      }
      // Anyone can fill empty photo slots; only the submitter or an admin can change details or replace photos.
      const photosOnly = editing && !store.isAdmin() && eq.createdBy !== store.get().user.uid;
      build(page, eq, { request, photosOnly, privateNotes });
    })
    .catch((err) => {
      if (!alive) return;
      clear(page);
      mount(page, h('div', { class: 'card narrow' }, h('h2', {}, 'Couldn’t load unit'), h('p', {}, err.message)));
    });

  return () => {
    alive = false;
    teardown();
  };
}

let beforeUnload = null;
let storeUnsub = null;
function teardown() {
  if (beforeUnload) window.removeEventListener('beforeunload', beforeUnload);
  beforeUnload = null;
  storeUnsub?.();
  storeUnsub = null;
  setLeaveGuard(null);
}

function build(page, existing, { request = null, photosOnly = false, privateNotes = '' } = {}) {
  const editing = Boolean(existing);
  const requested = new Set(request?.angles?.length ? request.angles : request ? PHOTO_SLOTS.map((s) => s.key) : []);
  const prefill = !editing && request ? request : null;
  const equipmentId = existing?.id || newEquipmentId();
  const { equipment, settings } = store.get();

  // slotKey -> { file, previewUrl, uploaded }  (uploaded = photo object once sent, so a retry skips it)
  const picked = {};
  const existingPhotos = { ...(existing?.photos || {}) };
  let dirty = false;
  let busy = false;

  beforeUnload = (e) => {
    if (dirty || busy) {
      e.preventDefault();
      e.returnValue = '';
    }
  };
  window.addEventListener('beforeunload', beforeUnload);

  // ---------- fields ----------
  const knownMakes = [...new Set(['Bobcat', ...(equipment || []).map((e) => e.make).filter(Boolean)])].sort();
  const warehouses = settings.warehouses || [];

  const inputs = {
    make: h('input', { id: 'make', name: 'make', list: 'make-list', required: true, maxlength: 80, value: existing?.make ?? (prefill?.make || 'Bobcat'), autocomplete: 'off' }),
    model: h('input', { id: 'model', name: 'model', required: true, maxlength: 80, value: existing?.model ?? prefill?.model ?? '', placeholder: 'e.g. T76', autocomplete: 'off' }),
    year: h('input', { id: 'year', name: 'year', type: 'number', inputmode: 'numeric', min: 1950, max: new Date().getFullYear() + 1, value: existing?.year ?? prefill?.year ?? '', placeholder: 'e.g. 2021' }),
    hours: h('input', { id: 'hours', name: 'hours', type: 'number', inputmode: 'decimal', min: 0, step: '0.1', value: existing?.hours ?? prefill?.hours ?? '', placeholder: 'From hour meter' }),
    warehouse: h(
      'select',
      { id: 'warehouse', name: 'warehouse', required: true },
      h('option', { value: '' }, 'Select warehouse…'),
      [...new Set([...warehouses, existing?.warehouse, prefill?.warehouse].filter(Boolean))].map((w) => h('option', { value: w, selected: w === (existing?.warehouse || prefill?.warehouse) }, w)),
    ),
    ein: h('input', { id: 'ein', name: 'ein', required: true, maxlength: 40, value: existing?.ein ?? prefill?.ein ?? '', autocomplete: 'off', class: 'mono' }),
    serial: h('input', { id: 'serial', name: 'serial', required: true, maxlength: 60, value: existing?.serial ?? prefill?.serial ?? '', autocomplete: 'off', class: 'mono' }),
    condition: h(
      'select',
      { id: 'condition', name: 'condition' },
      h('option', { value: '' }, 'Select condition…'),
      CONDITIONS.map((c) => h('option', { value: c, selected: c === existing?.condition }, c)),
    ),
    price: h('input', { id: 'price', name: 'price', type: 'number', inputmode: 'decimal', min: 0, step: '1', value: existing?.price ?? '', placeholder: '0' }),
    comments: h('textarea', { id: 'comments', name: 'comments', rows: 4, maxlength: 5000, placeholder: 'Selling points and anything a customer or sales rep should know — attachments, recent service, condition notes…' }, existing?.comments ?? ''),
    privateNotes: h('textarea', { id: 'privateNotes', name: 'privateNotes', rows: 4, maxlength: 5000, placeholder: 'Internal only — damage to fix, pricing notes, trade-in details, what the customer said…' }, privateNotes || ''),
    attachments: h('textarea', { id: 'attachments', name: 'attachments', rows: 3, maxlength: 2000, placeholder: 'Bucket, cab enclosure, A/C, 2-speed, etc.' }, existing?.attachments ?? ''),
  };
  if (warehouses.length === 1 && !existing && !prefill?.warehouse) inputs.warehouse.value = warehouses[0];
  if (photosOnly) Object.values(inputs).forEach((el) => (el.disabled = true));

  // Settings may arrive after the form is built (page refresh / direct link) — refill the dropdown, keeping the choice.
  let whSig = JSON.stringify(warehouses);
  storeUnsub = store.subscribe((s) => {
    const list = s.settings.warehouses || [];
    if (JSON.stringify(list) === whSig) return;
    whSig = JSON.stringify(list);
    const current = inputs.warehouse.value || existing?.warehouse || prefill?.warehouse || '';
    const values = [...new Set([...list, current].filter(Boolean))];
    mount(clear(inputs.warehouse), h('option', { value: '' }, 'Select warehouse…'), ...values.map((w) => h('option', { value: w }, w)));
    inputs.warehouse.value = current || (values.length === 1 ? values[0] : '');
  });

  setLeaveGuard(() => dirty || busy);

  const field = (label, key, { req, hint, wide, prefix } = {}) =>
    h(
      'div',
      { class: `field${wide ? ' wide' : ''}` },
      h('label', { for: key }, label, req ? h('span', { class: 'req', 'aria-hidden': 'true' }, ' *') : null),
      prefix ? h('div', { class: 'input-prefix' }, h('span', {}, prefix), inputs[key]) : inputs[key],
      hint ? h('span', { class: 'hint' }, hint) : null,
    );

  // ---------- photo slots ----------
  const tiles = {};
  const photoGrid = h('div', { class: 'photo-grid' });
  const bulkInput = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true, onchange: (e) => bulkAdd([...e.target.files]) });

  function setSlotFile(slotKey, file) {
    const prev = picked[slotKey];
    if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
    picked[slotKey] = file ? { file, previewUrl: URL.createObjectURL(file), uploaded: null } : undefined;
    if (!file) delete picked[slotKey];
    dirty = true;
    drawTile(slotKey);
    updatePhotoCount();
  }

  function bulkAdd(files) {
    const empty = PHOTO_SLOTS.filter((s) => !picked[s.key] && !existingPhotos[s.key]);
    files.slice(0, empty.length).forEach((file, i) => setSlotFile(empty[i].key, file));
    if (files.length > empty.length) toast(`Only ${empty.length} empty slot${empty.length === 1 ? '' : 's'} — extra photos were skipped.`, 'error');
    bulkInput.value = '';
  }

  function drawTile(slotKey) {
    const slot = PHOTO_SLOTS.find((s) => s.key === slotKey);
    const tile = tiles[slotKey];
    const p = picked[slotKey];
    const ex = existingPhotos[slotKey];
    const src = p?.previewUrl || ex?.thumbUrl || ex?.url;
    const fileInput = h('input', {
      type: 'file',
      accept: 'image/*',
      hidden: true,
      onchange: (e) => e.target.files[0] && setSlotFile(slotKey, e.target.files[0]),
    });

    const locked = photosOnly && Boolean(ex) && existing?.createdBy !== 'daily-report'; // can't replace someone else's photo (report units: anyone can retake)
    clear(tile);
    tile.className = `photo-tile${src ? ' has-photo' : ''}${p ? ' is-new' : ''}${requested.has(slotKey) && !ex ? ' requested' : ''}`;
    mount(tile, 
      fileInput,
      h(
        'button',
        { type: 'button', class: 'photo-drop', disabled: locked, onclick: () => fileInput.click(), 'aria-label': `${src ? 'Replace' : 'Add'} ${slot.label} photo` },
        src
          ? h('img', { src, alt: slot.label, onerror: (e) => e.target.replaceWith(h('span', { class: 'photo-fallback' }, icon('image'), p?.file?.name || 'Photo selected')) })
          : h(
              'span',
              { class: `photo-empty${EXAMPLE_PHOTOS[slotKey] ? ' has-example' : ''}`, style: EXAMPLE_PHOTOS[slotKey] ? `background-image:url(${EXAMPLE_PHOTOS[slotKey].small})` : null },
              icon('camera'),
              h('span', {}, 'Add photo'),
            ),
        h('span', { class: 'photo-progress', style: 'width:0%' }),
      ),
      h(
        'div',
        { class: 'photo-label' },
        h('span', {}, slot.label, ALL_PHOTOS_REQUIRED ? h('span', { class: 'req', 'aria-hidden': 'true' }, ' *') : null),
        p
          ? h('button', { type: 'button', class: 'icon-btn sm', title: 'Remove', 'aria-label': `Remove ${slot.label} photo`, onclick: () => setSlotFile(slotKey, null) }, icon('x'))
          : locked
            ? h('span', { class: 'muted small' }, 'Already taken')
            : src
              ? h('span', { class: 'muted small' }, 'Tap to replace')
              : requested.has(slotKey)
                ? h('span', { class: 'requested-tag' }, 'Requested')
                : null,
      ),
    );

    // drag & drop on desktop
    tile.ondragover = (e) => { e.preventDefault(); tile.classList.add('drag'); };
    tile.ondragleave = () => tile.classList.remove('drag');
    tile.ondrop = (e) => {
      e.preventDefault();
      if (locked) return;
      tile.classList.remove('drag');
      const f = [...e.dataTransfer.files].find((x) => x.type.startsWith('image/'));
      if (f) setSlotFile(slotKey, f);
    };
  }

  PHOTO_SLOTS.forEach((s) => {
    tiles[s.key] = h('div', { class: 'photo-tile', 'data-slot': s.key });
    mount(photoGrid, tiles[s.key]);
    drawTile(s.key);
  });

  const photoCount = h('span', { class: 'muted' });
  function updatePhotoCount() {
    const n = PHOTO_SLOTS.filter((s) => picked[s.key] || existingPhotos[s.key]).length;
    photoCount.textContent = `${n} of ${PHOTO_SLOTS.length} photos`;
  }
  updatePhotoCount();

  // ---------- submit ----------
  const progressWrap = h('div', { class: 'upload-progress', hidden: true }, h('div', { class: 'bar' }, h('span', {})), h('span', { class: 'label' }));
  const submitBtn = h('button', { type: 'submit', class: 'btn btn-primary btn-lg' }, editing ? 'Save changes' : 'Add equipment');
  const formMsg = h('p', { class: 'form-msg', role: 'alert' });

  const form = h(
    'form',
    { class: 'submit-form', novalidate: true, oninput: () => (dirty = true), onsubmit: onSubmit },
    h('datalist', { id: 'make-list' }, knownMakes.map((m) => h('option', { value: m }))),
    h(
      'section',
      { class: 'card' },
      h('h2', { class: 'section-title' }, 'Unit details'),
      h(
        'div',
        { class: 'form-grid' },
        field('Make', 'make', { req: true }),
        field('Model', 'model', { req: true }),
        field('Year', 'year'),
        field('Hours', 'hours', { hint: 'Should match the hour meter photo' }),
        field('Warehouse', 'warehouse', { req: true, hint: warehouses.length ? null : 'No warehouses set up yet — an admin can add them under Settings.' }),
        field('EIN', 'ein', { req: true }),
        field('Serial #', 'serial', { req: true }),
        field('Condition', 'condition'),
        field('Price', 'price', { prefix: '$' }),
        field('Attachments / options', 'attachments', { wide: true }),
      ),
    ),
    h(
      'section',
      { class: 'card' },
      h(
        'div',
        { class: 'section-head' },
        h('div', {}, h('h2', { class: 'section-title' }, 'Photos'), h('p', { class: 'muted small' }, ALL_PHOTOS_REQUIRED ? `All ${PHOTO_SLOTS.length} angles are required. Tap a slot to take or choose a photo, or drag one onto it.` : 'Add whichever angles you have — none are required. Tap a slot to take or choose a photo, or drag one onto it. The faded pictures show what each angle should look like.'), h('a', { href: '#/instructions', class: 'small instr-link', target: '_blank' }, icon('info'), ' How to take the photos')),
        h('div', { class: 'section-head-actions' }, photoCount, bulkInput, h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => bulkInput.click() }, 'Add several at once')),
      ),
      h('p', { class: 'muted small bulk-hint' }, '“Add several at once” fills the empty slots in the order shown below — select photos in that order.'),
      photoGrid,
    ),
    h(
      'section',
      { class: 'card' },
      h('h2', { class: 'section-title' }, 'Comments'),
      h(
        'div',
        { class: 'comment-fields' },
        h(
          'div',
          { class: 'field' },
          h('label', { for: 'comments' }, 'Public comments', h('span', { class: 'vis-tag public' }, 'Everyone can see')),
          inputs.comments,
        ),
        h(
          'div',
          { class: 'field' },
          h('label', { for: 'privateNotes' }, 'Private comments', h('span', { class: 'vis-tag private' }, 'Hidden from viewers / sales reps')),
          inputs.privateNotes,
        ),
      ),
      photosOnly ? h('p', { class: 'muted small' }, 'Only the person who submitted this unit or an admin can change comments.') : null,
    ),
    h(
      'div',
      { class: 'form-actions' },
      formMsg,
      progressWrap,
      h('div', { class: 'form-actions-row' }, h('a', { href: request ? '#/requests' : editing ? `#/equipment/${equipmentId}` : '#/', class: 'btn btn-ghost' }, 'Cancel'), submitBtn),
    ),
  );

  const backHref = request ? '#/requests' : editing ? `#/equipment/${equipmentId}` : '#/';
  const banner = request
    ? h(
        'div',
        { class: `request-banner${request.status === 'done' ? ' done' : ''}` },
        icon('camera'),
        h(
          'div',
          {},
          h('strong', {}, request.status === 'done' ? 'This photo request is already marked done.' : `Photo request from ${request.createdByName || request.createdByEmail}`),
          h('div', { class: 'small' }, request.angles?.length ? `Angles needed: ${request.angles.map((k) => PHOTO_SLOTS.find((x) => x.key === k)?.label || k).join(', ')}` : 'All angles requested', request.dueDate ? ` · needed by ${request.dueDate}` : ''),
          request.notes ? h('div', { class: 'small prewrap' }, request.notes) : null,
          request.status !== 'done' ? h('div', { class: 'small muted' }, 'Saving will check this request off.') : null,
        ),
      )
    : null;
  const photosOnlyNote = photosOnly
    ? h('p', { class: 'muted small' }, 'You can add photos to empty slots. Only the person who submitted this unit or an admin can change its details or replace photos.')
    : null;

  mount(page, 
    h(
      'div',
      { class: 'page-head' },
      h(
        'div',
        {},
        h('a', { href: backHref, class: 'back-link' }, icon('back'), request ? 'Back to requests' : editing ? 'Back to unit' : 'Back to inventory'),
        h('h1', {}, photosOnly ? `Add photos · ${existing.make} ${existing.model}` : editing ? `Edit ${existing.make} ${existing.model}` : 'Add equipment'),
        photosOnlyNote,
      ),
    ),
    banner,
    form,
  );

  function readFields() {
    const num = (v) => (v === '' || v === null ? null : Number(v));
    return {
      make: inputs.make.value.trim(),
      model: inputs.model.value.trim(),
      year: num(inputs.year.value),
      hours: num(inputs.hours.value),
      warehouse: inputs.warehouse.value,
      ein: inputs.ein.value.trim(),
      serial: inputs.serial.value.trim(),
      serialKey: normalizeKey(inputs.serial.value),
      condition: inputs.condition.value || null,
      price: num(inputs.price.value),
      attachments: inputs.attachments.value.trim(),
      comments: inputs.comments.value.trim(),
    };
  }

  function validate(fields) {
    form.querySelectorAll('.invalid').forEach((el) => el.classList.remove('invalid'));
    const problems = [];
    for (const key of ['make', 'model', 'warehouse', 'ein', 'serial']) {
      if (!fields[key]) {
        inputs[key].classList.add('invalid');
        problems.push(inputs[key]);
      }
    }
    for (const key of ['year', 'hours', 'price']) {
      if (fields[key] !== null && (Number.isNaN(fields[key]) || fields[key] < 0)) {
        inputs[key].classList.add('invalid');
        problems.push(inputs[key]);
      }
    }
    const missingPhotos = ALL_PHOTOS_REQUIRED ? PHOTO_SLOTS.filter((s) => !picked[s.key] && !existingPhotos[s.key]) : [];
    missingPhotos.forEach((s) => tiles[s.key].classList.add('invalid'));

    if (problems.length) {
      problems[0].focus();
      return 'Fill in the highlighted fields.';
    }
    if (missingPhotos.length) {
      tiles[missingPhotos[0].key].scrollIntoView({ behavior: 'smooth', block: 'center' });
      return `Missing photo${missingPhotos.length > 1 ? 's' : ''}: ${missingPhotos.map((s) => s.label).join(', ')}.`;
    }
    return null;
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (busy) return;
    formMsg.textContent = '';
    formMsg.className = 'form-msg';
    const fields = readFields();
    if (photosOnly) {
      if (!Object.keys(picked).length) {
        formMsg.textContent = 'Add at least one photo to an empty slot.';
        return;
      }
    } else {
      const problem = validate(fields);
      if (problem) {
        formMsg.textContent = problem;
        return;
      }
    }

    // Soft duplicate check on serial number.
    if (!photosOnly && (!editing || fields.serialKey !== existing.serialKey)) {
      try {
        const dupes = await findBySerial(fields.serial, equipmentId);
        if (dupes.length) {
          const d = dupes[0];
          const ok = await confirmDialog({
            title: 'Serial number already submitted',
            message: `${d.make} ${d.model} with serial ${d.serial} is already in the system${d.status === 'archived' ? ' (archived)' : ''}. Submit anyway?`,
            confirmLabel: 'Submit anyway',
          });
          if (!ok) return;
        }
      } catch {
        /* non-blocking */
      }
    }

    busy = true;
    submitBtn.disabled = true;
    submitBtn.textContent = editing ? 'Saving…' : 'Uploading…';
    form.classList.add('is-busy');

    try {
      const photos = await uploadPending();
      if (photosOnly) {
        await addPhotos(equipmentId, photos);
      } else if (editing) {
        // Write only the slots that changed, so two people editing at once don't overwrite each other's photos.
        const photoPatch = Object.fromEntries(Object.entries(photos).map(([k, v]) => [`photos.${k}`, v]));
        await updateEquipment(equipmentId, { ...fields, ...photoPatch });
      } else {
        // requestId: lets the new-unit email step see this answers a photo request (see onEquipmentCreated).
        await createEquipment(equipmentId, request ? { ...fields, requestId: request.id } : fields, photos);
      }
      // Private comments live in their own document (written after the unit exists).
      const priv = inputs.privateNotes.value.trim();
      if (!photosOnly && priv !== (privateNotes || '')) await savePrivateNotes(equipmentId, priv);
      dirty = false;
      busy = false;
      setLeaveGuard(null);
      Object.values(picked).forEach((p) => p?.previewUrl && URL.revokeObjectURL(p.previewUrl));
      let requestNote = '';
      // A new submission always answers the request; an edit only does if photos were actually added.
      if (request && request.status !== 'done' && (!editing || Object.keys(photos).length > 0)) {
        try {
          await completeRequest(request.id, equipmentId);
          requestNote = ' · photo request checked off';
        } catch {
          requestNote = ' · couldn’t check off the request — do it from Requests';
        }
      }
      toast((photosOnly ? 'Photos added' : editing ? 'Changes saved' : 'Unit submitted — admins have been notified') + requestNote);
      navigate(`/equipment/${equipmentId}`);
    } catch (err) {
      busy = false;
      submitBtn.disabled = false;
      submitBtn.textContent = editing ? 'Save changes' : 'Retry submit';
      form.classList.remove('is-busy');
      if (photosOnly && err.code === 'permission-denied') {
        // Most likely someone else filled one of these slots meanwhile — refresh and drop the clashing ones.
        try {
          const fresh = await getEquipment(equipmentId);
          const taken = PHOTO_SLOTS.filter((s) => picked[s.key] && fresh?.photos?.[s.key]);
          Object.keys(existingPhotos).forEach((k) => delete existingPhotos[k]);
          Object.assign(existingPhotos, fresh?.photos || {});
          taken.forEach((s) => {
            if (picked[s.key]?.previewUrl) URL.revokeObjectURL(picked[s.key].previewUrl);
            delete picked[s.key];
          });
          PHOTO_SLOTS.forEach((s) => drawTile(s.key));
          updatePhotoCount();
          if (taken.length) {
            formMsg.textContent = `Someone else just added ${taken.map((s) => s.label).join(', ')}. Those were skipped — press the button to save the rest.`;
            return;
          }
        } catch {
          /* fall through to the generic message */
        }
      }
      formMsg.textContent = `Something went wrong: ${err.message}. Photos that finished uploading won't be re-sent — press the button to retry.`;
    }
  }

  async function uploadPending() {
    const pending = PHOTO_SLOTS.filter((s) => picked[s.key]);
    const result = {};
    const fraction = {};
    const bar = progressWrap.querySelector('.bar span');
    const label = progressWrap.querySelector('.label');
    progressWrap.hidden = pending.length === 0;

    const totalBytes = pending.reduce((sum, s) => sum + picked[s.key].file.size, 0) || 1;
    const refresh = () => {
      const done = pending.reduce((sum, s) => sum + (fraction[s.key] || 0) * picked[s.key].file.size, 0);
      const pct = Math.round((done / totalBytes) * 100);
      bar.style.width = `${pct}%`;
      const finished = pending.filter((s) => picked[s.key].uploaded).length;
      label.textContent = `Uploading photos… ${finished} of ${pending.length} (${pct}%)`;
    };

    // Upload 3 at a time — friendlier on cell connections than 10 in parallel.
    const queue = [...pending];
    async function worker() {
      while (queue.length) {
        const slot = queue.shift();
        const p = picked[slot.key];
        const bar1 = tiles[slot.key].querySelector('.photo-progress');
        if (!p.uploaded) {
          p.uploaded = await uploadPhoto(equipmentId, slot.key, p.file, (fr) => {
            fraction[slot.key] = fr;
            if (bar1) bar1.style.width = `${Math.round(fr * 100)}%`;
            refresh();
          });
        }
        fraction[slot.key] = 1;
        tiles[slot.key].classList.add('done');
        result[slot.key] = p.uploaded;
        refresh();
      }
    }
    refresh();
    await Promise.all([worker(), worker(), worker()]);
    label.textContent = 'Saving…';
    return result;
  }
}
```

## `src/pages/users.js`

```js
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase.js';
import { h, clear, icon, toast, fmtDate, confirmDialog, passwordInput, checkNewPassword, MIN_PASSWORD, mount, pager } from '../ui.js';
import { store } from '../store.js';
import { subscribeUsers, callCreateUser, callUpdateUser, callAdminPassword, callDeleteUser } from '../data.js';
import { notificationsDialog, notifySummary } from './notifications.js';
import { ROLES, roleLabel } from '../config.js';

export function renderUsers(page) {
  const me = store.get().user.uid;
  const tbody = h('tbody');
  const pageState = { page: 1 };
  let allUsers = [];
  const drawUsers = () => mount(clear(tbody), ...pg.slice(allUsers).map(row));
  const pg = pager(pageState, drawUsers, { noun: 'users' });
  const count = h('span', { class: 'muted small' });

  // ----- add user form -----
  const name = h('input', { id: 'nu-name', required: true, maxlength: 80, placeholder: 'Jane Smith', autocomplete: 'off' });
  const email = h('input', { id: 'nu-email', type: 'email', required: true, placeholder: 'jane@kcbobcat.com', autocomplete: 'off' });
  const role = h('select', { id: 'nu-role' }, ROLES.map((r) => h('option', { value: r.key, selected: r.key === 'employee', title: r.desc }, r.label)));
  const startPw = passwordInput({ id: 'nu-pw', autocomplete: 'new-password', placeholder: 'Leave blank to generate one', required: false });
  const addBtn = h('button', { type: 'submit', class: 'btn btn-primary' }, icon('plus'), h('span', {}, 'Add user'));
  const addMsg = h('p', { class: 'form-msg', role: 'alert' });

  const addForm = h(
    'form',
    {
      class: 'card',
      onsubmit: async (e) => {
        e.preventDefault();
        addMsg.textContent = '';
        addMsg.className = 'form-msg';
        if (!name.value.trim() || !email.value.trim()) {
          addMsg.textContent = 'Name and email are required.';
          return;
        }
        const pw = startPw.input.value;
        if (pw) {
          const problem = checkNewPassword(pw);
          if (problem) {
            addMsg.textContent = problem;
            startPw.input.focus();
            return;
          }
        }
        addBtn.disabled = true;
        try {
          const addr = email.value.trim();
          const res = await callCreateUser({ displayName: name.value.trim(), email: addr, role: role.value, password: pw || undefined });
          if (res.data.emailed) {
            addMsg.className = 'form-msg ok';
            addMsg.textContent = `Added. ${addr} has been emailed their login and temporary password — they’ll choose their own when they first sign in.`;
          } else {
            addMsg.className = 'form-msg';
            mount(clear(addMsg), 
              `Added, but the welcome email didn’t send (see Settings → Email). Give ${addr} this temporary password yourself: `,
              tempPasswordChip(res.data.tempPassword),
            );
          }
          name.value = '';
          email.value = '';
          role.value = 'employee';
          startPw.input.value = '';
        } catch (err) {
          addMsg.textContent = err.message;
        } finally {
          addBtn.disabled = false;
        }
      },
    },
    h('h2', { class: 'section-title' }, 'Add a user'),
    h('ul', { class: 'role-legend' }, ROLES.map((r) => h('li', {}, h('strong', {}, r.label), ` — ${r.desc}`))),
    h('p', { class: 'muted small' }, 'They’re emailed their login with a temporary password (yours, or a generated one if you leave it blank) and must choose their own the first time they sign in. Admins can manage users, change statuses, and archive or delete units. Admins start with emails for all new units; employees start with only photo-request emails — change it any time with “Edit” in the Email alerts column.'),
    h(
      'div',
      { class: 'form-grid add-user-grid' },
      h('div', { class: 'field' }, h('label', { for: 'nu-name' }, 'Name'), name),
      h('div', { class: 'field' }, h('label', { for: 'nu-email' }, 'Email'), email),
      h('div', { class: 'field' }, h('label', { for: 'nu-role' }, 'Role'), role),
      h('div', { class: 'field' }, h('label', { for: 'nu-pw' }, 'Starting password ', h('span', { class: 'optional' }, '(optional)')), startPw.wrap),
      h('div', { class: 'field field-btn' }, addBtn),
    ),
    addMsg,
  );

  mount(page, 
    h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Users'), h('p', { class: 'muted' }, 'Who can sign in, who is an admin, and what email notifications each person gets.'))),
    addForm,
    h(
      'section',
      { class: 'card table-card' },
      h('div', { class: 'section-head pad' }, h('h2', { class: 'section-title' }, 'All users'), count),
      h(
        'div',
        { class: 'table-scroll' },
        h(
          'table',
          { class: 'users-table' },
          h('thead', {}, h('tr', {}, h('th', {}, 'Name'), h('th', {}, 'Email'), h('th', {}, 'Role'), h('th', {}, 'Email alerts'), h('th', {}, 'Access'), h('th', {}, 'Added'), h('th', {}, ''))),
          tbody,
        ),
      ),
      pg.el,
    ),
  );

  // `revert` puts the control back if the server refuses the change.
  async function change(u, patch, label, revert) {
    try {
      await callUpdateUser({ uid: u.uid, ...patch });
      toast(label);
    } catch (err) {
      revert?.();
      toast(err.message, 'error');
    }
  }

  function row(u) {
    const self = u.uid === me;
    return h(
      'tr',
      { class: u.active ? '' : 'inactive' },
      h('td', { 'data-label': 'Name', class: 'u-name' }, h('strong', {}, u.displayName || '—'), self ? h('span', { class: 'pill sm' }, 'You') : null, u.mustChangePassword ? h('span', { class: 'pill sm', title: 'Hasn’t chosen their own password yet' }, 'Temp password') : null),
      h('td', { 'data-label': 'Email', class: 'u-email' }, u.email),
      h(
        'td',
        { 'data-label': 'Role', class: 'u-role' },
        h(
          'select',
          {
            disabled: self,
            title: self ? 'You can’t change your own role' : null,
            onchange: (e) => change(u, { role: e.target.value }, `${u.email} is now ${roleLabel(e.target.value)}`, () => (e.target.value = u.role || 'employee')),
          },
          ROLES.map((r) => h('option', { value: r.key, selected: r.key === (u.role || 'employee'), title: r.desc }, r.label)),
        ),
      ),
      h(
        'td',
        { 'data-label': 'Email alerts', class: 'u-alerts' },
        h(
          'button',
          { class: 'alerts-btn', title: 'Edit email notifications', onclick: () => notificationsDialog(u) },
          h('span', { class: 'small' }, notifySummary(u)),
          h('span', { class: 'link-btn small' }, 'Edit'),
        ),
      ),
      h(
        'td',
        { 'data-label': 'Access', class: 'u-access' },
        h(
          'label',
          { class: 'switch' },
          h('input', {
            type: 'checkbox',
            checked: u.active,
            disabled: self,
            onchange: async (e) => {
              if (!e.target.checked) {
                const ok = await confirmDialog({ title: `Deactivate ${u.displayName || u.email}?`, message: 'They’ll be signed out and won’t be able to sign in until reactivated. Their submissions stay.', confirmLabel: 'Deactivate', danger: true });
                if (!ok) {
                  e.target.checked = true;
                  return;
                }
              }
              change(u, { active: e.target.checked }, e.target.checked ? 'User reactivated' : 'User deactivated', () => (e.target.checked = u.active));
            },
          }),
          h('span', {}, u.active ? 'Active' : 'Disabled'),
        ),
      ),
      h('td', { 'data-label': 'Added', class: 'u-added' }, fmtDate(u.createdAt)),
      h(
        'td',
        { class: 'col-actions u-actions' },
        self
          ? h('a', { href: '#/account', class: 'btn btn-ghost btn-sm' }, icon('key'), h('span', {}, 'Change mine'))
          : h(
              'span',
              { class: 'row-actions' },
              h('button', { class: 'btn btn-ghost btn-sm', onclick: () => passwordDialog(u) }, icon('key'), h('span', {}, 'Password')),
              h('button', { class: 'icon-btn danger', title: `Delete ${u.displayName || u.email}`, 'aria-label': `Delete ${u.displayName || u.email}`, onclick: () => removeUser(u) }, icon('trash')),
            ),
      ),
    );
  }

  async function removeUser(u) {
    const who = u.displayName || u.email;
    const ok = await confirmDialog({
      title: `Delete ${who}?`,
      message: `This permanently removes ${u.email}’s login. Units, photos and messages they added stay (with their name), and any open photo requests assigned to them become unassigned. To keep the account but block sign-in, turn off Access instead.`,
      confirmLabel: 'Delete user',
      danger: true,
    });
    if (!ok) return;
    try {
      const { data } = await callDeleteUser({ uid: u.uid });
      toast(`${who} deleted${data.unassigned ? ` — ${data.unassigned} open request${data.unassigned === 1 ? '' : 's'} unassigned` : ''}`);
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  // ----- password dialog: email a link, copy a link, or set it directly -----
  function passwordDialog(u) {
    const who = u.displayName || u.email;
    const linkOut = h('div', { class: 'link-out', hidden: true });
    const setPw = passwordInput({ id: 'ap-new', autocomplete: 'new-password', placeholder: `At least ${MIN_PASSWORD} characters` });
    const setPw2 = passwordInput({ id: 'ap-confirm', autocomplete: 'new-password' });
    const setMsg = h('p', { class: 'form-msg', role: 'alert' });

    const emailBtn = h(
      'button',
      {
        type: 'button',
        class: 'btn btn-ghost',
        onclick: async () => {
          emailBtn.disabled = true;
          try {
            await sendPasswordResetEmail(auth, u.email, { url: location.origin });
            toast(`Reset link emailed to ${u.email}`);
          } catch (err) {
            toast(err.message, 'error');
          } finally {
            emailBtn.disabled = false;
          }
        },
      },
      'Email reset link',
    );

    const copyBtn = h(
      'button',
      {
        type: 'button',
        class: 'btn btn-ghost',
        onclick: async () => {
          copyBtn.disabled = true;
          try {
            const { data } = await callAdminPassword({ uid: u.uid, action: 'link' });
            const field = h('input', { type: 'text', readonly: true, value: data.link, 'aria-label': 'Reset link', onfocus: (e) => e.target.select() });
            const copy = async () => {
              try {
                await navigator.clipboard.writeText(data.link);
                toast('Link copied');
              } catch {
                field.select();
                toast('Press Ctrl+C to copy', 'error');
              }
            };
            mount(clear(linkOut), 
              h('div', { class: 'link-row' }, field, h('button', { type: 'button', class: 'btn btn-primary btn-sm', onclick: copy }, icon('copy'), h('span', {}, 'Copy'))),
              h('p', { class: 'muted small' }, 'Send this to them however you like (text, Teams). It works once and expires in about an hour.'),
            );
            linkOut.hidden = false;
            copy();
          } catch (err) {
            toast(err.message, 'error');
          } finally {
            copyBtn.disabled = false;
          }
        },
      },
      'Get a link to copy',
    );

    const saveBtn = h('button', { type: 'submit', class: 'btn btn-primary' }, 'Set password');
    const emailIt = h('input', { type: 'checkbox', checked: true });
    const genBtn = h(
      'button',
      {
        type: 'button',
        class: 'btn btn-ghost',
        onclick: async () => {
          genBtn.disabled = true;
          setMsg.className = 'form-msg';
          setMsg.textContent = '';
          try {
            const { data } = await callAdminPassword({ uid: u.uid, action: 'set', generate: true });
            if (data.emailed) {
              toast(`Temporary password emailed to ${u.email}`);
              dlg.close();
            } else {
              mount(clear(setMsg), 'Password changed, but the email didn’t send. Give them this temporary password: ', tempPasswordChip(data.tempPassword));
            }
          } catch (err) {
            setMsg.textContent = err.message;
          } finally {
            genBtn.disabled = false;
          }
        },
      },
      'Email a new temporary password',
    );
    const setForm = h(
      'form',
      {
        class: 'stack',
        onsubmit: async (e) => {
          e.preventDefault();
          setMsg.className = 'form-msg';
          setMsg.textContent = '';
          const problem = checkNewPassword(setPw.input.value, setPw2.input.value);
          if (problem) {
            setMsg.textContent = problem;
            return;
          }
          saveBtn.disabled = true;
          try {
            const { data } = await callAdminPassword({ uid: u.uid, action: 'set', password: setPw.input.value, email: emailIt.checked });
            if (emailIt.checked && !data.emailed) {
              setMsg.textContent = 'Password changed, but the email didn’t send — give it to them yourself.';
              return;
            }
            toast(emailIt.checked ? `Password changed and emailed to ${u.email}` : `Password changed for ${who}`);
            dlg.close();
          } catch (err) {
            setMsg.textContent = err.message;
          } finally {
            saveBtn.disabled = false;
          }
        },
      },
      h('div', { class: 'field' }, h('label', { for: 'ap-new' }, 'New password'), setPw.wrap),
      h('div', { class: 'field' }, h('label', { for: 'ap-confirm' }, 'Confirm new password'), setPw2.wrap),
      h('label', { class: 'check-inline' }, emailIt, h('span', {}, 'Email it to them (they’ll choose their own at next sign-in)')),
      setMsg,
      h('p', { class: 'muted small' }, 'They’ll be signed out everywhere and need the new password to get back in.'),
      h('div', { class: 'dialog-actions' }, saveBtn),
    );

    const dlg = h(
      'dialog',
      { class: 'dialog dialog-wide' },
      h('div', { class: 'dialog-head' }, h('h3', {}, `Password for ${who}`), h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Close', onclick: () => dlg.close() }, icon('x'))),
      h('p', { class: 'muted small' }, u.email),
      h('section', { class: 'dlg-section' }, h('h4', {}, 'Send a temporary password'), h('p', { class: 'muted small' }, 'Generates one, emails it with their login, and has them choose their own when they sign in.'), h('div', { class: 'btn-row' }, genBtn)),
      h('section', { class: 'dlg-section' }, h('h4', {}, 'Or send a reset link'), h('p', { class: 'muted small' }, 'They choose their own new password.'), h('div', { class: 'btn-row' }, emailBtn, copyBtn), linkOut),
      h('section', { class: 'dlg-section' }, h('h4', {}, 'Or set it yourself'), setForm),
    );
    dlg.addEventListener('close', () => dlg.remove());
    document.body.append(dlg);
    dlg.showModal();
  }

  const unsub = subscribeUsers(
    (users) => {
      count.textContent = `${users.length} user${users.length === 1 ? '' : 's'} · ${ROLES.map((r) => `${users.filter((u) => (u.role || 'employee') === r.key).length} ${r.label.toLowerCase()}`).join(' · ')}`;
      allUsers = users;
      drawUsers();
    },
    (err) => toast(`Couldn't load users: ${err.message}`, 'error'),
  );
  return unsub;
}

/** Shows a temporary password with a copy button (only used when the email didn't go out). */
function tempPasswordChip(pw) {
  if (!pw) return '';
  return h(
    'span',
    { class: 'temp-pw' },
    h('code', {}, pw),
    h(
      'button',
      {
        type: 'button',
        class: 'link-btn',
        onclick: async () => {
          try {
            await navigator.clipboard.writeText(pw);
            toast('Copied');
          } catch {
            toast('Select it and press Ctrl+C', 'error');
          }
        },
      },
      'Copy',
    ),
  );
}
```

## `functions/.env`

```
# Used in notification emails for links back to the dashboard.
APP_URL=https://used.kcbobcat.com

# Sender for all emails. The domain must be verified in Resend (Domains → Add domain).
MAIL_FROM=Used Equipment <used-equipment@used.kcbobcat.com>
```

## `functions/.secret.local.example`

```
# For the local Functions emulator only: copy to .secret.local (git-ignored) and paste a Resend test key.
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
```

## `functions/downloads.js`

```js
// Photo downloads served from our own domain (Hosting rewrite /api/download → this function), so the
// browser never has to fetch from the Storage bucket directly — no bucket CORS setting needed.
// The page POSTs a hidden form: token (Firebase ID token), id (unit), slot (optional; omitted = all as .zip).
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions';
import archiver from 'archiver';

// Same order/labels as src/config.js PHOTO_SLOTS (file names are numbered in this order).
const SLOTS = [
  ['rightSide', 'Right Side'],
  ['rightSideRear', 'Right Side Rear'],
  ['rearEngine', 'Rear Engine'],
  ['leftRear', 'Left Rear'],
  ['leftSide', 'Left Side'],
  ['leftFront', 'Left Front'],
  ['front', 'Front'],
  ['rightFront', 'Right Front'],
  ['interior', 'Interior'],
  ['hourMeter', 'Hour Meter'],
  ['serialPlate', 'Serial Plate'],
];

const safe = (s) => String(s || '').trim().replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '') || 'unit';
const fileBase = (eq) => safe([eq.ein || eq.serial, eq.make, eq.model].filter(Boolean).join('-'));
function photoName(eq, i, label, photo) {
  const ext = (String(photo.path).split('.').pop() || 'jpg').toLowerCase();
  return `${fileBase(eq)}_${String(i + 1).padStart(2, '0')}-${safe(label)}.${ext}`;
}

function fail(res, status, message) {
  // The form targets a hidden iframe; a short page there is enough (the app shows its own toast on timeout).
  res.status(status).set('Content-Type', 'text/html; charset=utf-8').send(`<!doctype html><meta charset="utf-8"><p>${message}</p>`);
}

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

## `functions/emails.js`

```js
// HTML email templates for the Trigger Email extension ({ subject, html, text }).

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const SLOT_ORDER = [
  ['rightFront', 'Right Front'],
  ['leftFront', 'Left Front'],
  ['front', 'Front'],
  ['rightSide', 'Right Side'],
  ['leftSide', 'Left Side'],
  ['rightSideRear', 'Right Side Rear'],
  ['leftRear', 'Left Rear'],
  ['rearEngine', 'Rear Engine'],
  ['interior', 'Interior'],
  ['hourMeter', 'Hour Meter'],
  ['serialPlate', 'Serial Plate'],
];

// Logo is served by the site itself; set APP_URL in functions/.env.
const LOGO_URL = `${(process.env.APP_URL || 'https://used.kcbobcat.com').replace(/\/$/, '')}/kc-bobcat-logo.png`;

function shell(title, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#f2f2f2;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#000000;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f2;padding:24px 0;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e0e0e0;">
<tr><td style="background:#ffffff;border-bottom:4px solid #ff3300;padding:16px 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td valign="middle"><img src="${LOGO_URL}" alt="K.C. Bobcat" width="120" style="width:120px;height:auto;display:block;"></td>
<td valign="middle" align="right" style="color:#666666;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Used Equipment</td>
</tr></table></td></tr>
<tr><td style="padding:24px;">
<h1 style="margin:0 0 12px;font-size:20px;">${esc(title)}</h1>
${body}
</td></tr></table>
<p style="color:#999999;font-size:12px;margin:12px 0 0;">Sent automatically by the used equipment dashboard.</p>
</td></tr></table></body></html>`;
}

function button(href, label) {
  return `<a href="${esc(href)}" style="display:inline-block;background:#ff3300;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:6px;">${esc(label)}</a>`;
}

export function newSubmissionEmail({ eq, link }) {
  const title = `${eq.year ? `${eq.year} ` : ''}${eq.make} ${eq.model}`;
  const rows = [
    ['Warehouse', eq.warehouse],
    ['EIN', eq.ein],
    ['Serial #', eq.serial],
    ['Hours', eq.hours != null ? Number(eq.hours).toLocaleString('en-US') : null],
    ['Condition', eq.condition],
    ['Price', eq.price != null ? `$${Number(eq.price).toLocaleString('en-US')}` : null],
    ['Attachments', eq.attachments],
    ['Public comments', eq.comments],
    ['Submitted by', eq.createdByName || eq.createdByEmail],
  ].filter(([, v]) => v !== null && v !== undefined && v !== '');

  const photos = SLOT_ORDER.map(([k, label]) => ({ label, p: eq.photos?.[k] })).filter((x) => x.p);
  // Only embed images hosted in Firebase Storage (no outside tracking pixels).
  const storageUrl = (u) => typeof u === 'string' && u.startsWith('https://firebasestorage.googleapis.com/');
  const thumbs = photos
    .map(({ label, p }) => ({ label, src: [p.thumbUrl, p.url].find(storageUrl) }))
    .filter((x) => x.src)
    .slice(0, 4)
    .map(({ label, src }) => `<td style="padding:4px;width:25%;" valign="top"><img src="${esc(src)}" alt="${esc(label)}" width="130" style="width:100%;max-width:130px;height:auto;border-radius:4px;display:block;"><div style="font-size:11px;color:#666666;margin-top:2px;">${esc(label)}</div></td>`)
    .join('');

  const html = shell(
    `New unit submitted: ${title}`,
    `<p style="margin:0 0 16px;color:#333333;">${photos.length ? `${photos.length} of ${SLOT_ORDER.length} photos uploaded and ready to review or download.` : 'No photos were uploaded with this unit yet.'}</p>
${thumbs ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;"><tr>${thumbs}</tr></table>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;font-size:14px;">
${rows.map(([k, v]) => `<tr><td style="padding:6px 0;color:#666666;border-bottom:1px solid #eeeeee;width:130px;">${esc(k)}</td><td style="padding:6px 0;border-bottom:1px solid #eeeeee;font-weight:600;">${esc(v)}</td></tr>`).join('')}
</table>
${button(link, 'View unit & download photos')}`,
  );

  const text = [
    `New unit submitted: ${title}`,
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    `Photos: ${photos.length} of ${SLOT_ORDER.length}`,
    '',
    `View and download photos: ${link}`,
  ].join('\n');

  return { subject: `New used unit: ${title} (Serial ${eq.serial})`, html, text };
}

function credentialsBox(email, password) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#f2f2f2;border-radius:6px;width:100%;">
<tr><td style="padding:12px 14px 4px;color:#666666;font-size:13px;">Email</td></tr>
<tr><td style="padding:0 14px 10px;font-weight:700;font-size:15px;">${esc(email)}</td></tr>
<tr><td style="padding:4px 14px 4px;color:#666666;font-size:13px;">Temporary password</td></tr>
<tr><td style="padding:0 14px 14px;font-weight:700;font-size:18px;font-family:Consolas,Menlo,monospace;letter-spacing:1px;">${esc(password)}</td></tr>
</table>`;
}

export function welcomeEmail({ displayName, role, email, password, appUrl, invitedBy }) {
  const site = appUrl.replace(/^https?:\/\//, '');
  const roleHtml = role === 'admin' ? 'an <strong>admin</strong>' : role === 'viewer' ? 'a <strong>viewer</strong> (view and download only)' : 'an <strong>employee</strong>';
  const html = shell(
    `Welcome, ${displayName}`,
    `<p style="margin:0 0 12px;color:#333333;">${esc(invitedBy)} added you to the K.C. Bobcat used equipment dashboard as ${roleHtml}. Here’s how to sign in:</p>
${credentialsBox(email, password)}
${button(appUrl, 'Sign in')}
<p style="margin:20px 0 0;color:#666666;font-size:13px;">You’ll be asked to choose your own password the first time you sign in. Site: <a href="${esc(appUrl)}" style="color:#cc2900;">${esc(site)}</a></p>`,
  );
  const text = `Welcome, ${displayName}\n\n${invitedBy} added you to the K.C. Bobcat used equipment dashboard.\n\nSign in at ${appUrl}\nEmail: ${email}\nTemporary password: ${password}\n\nYou'll be asked to choose your own password the first time you sign in.`;
  return { subject: 'Your K.C. Bobcat used equipment login', html, text };
}

export function passwordEmail({ displayName, email, password, appUrl, setBy }) {
  const html = shell(
    'Your password was reset',
    `<p style="margin:0 0 12px;color:#333333;">Hi ${esc(displayName)}, ${esc(setBy)} reset your password for the K.C. Bobcat used equipment dashboard.</p>
${credentialsBox(email, password)}
${button(appUrl, 'Sign in')}
<p style="margin:20px 0 0;color:#666666;font-size:13px;">You’ll be asked to choose a new password when you sign in. If you didn’t expect this, tell your manager.</p>`,
  );
  const text = `Hi ${displayName},\n\n${setBy} reset your password for the K.C. Bobcat used equipment dashboard.\n\nSign in at ${appUrl}\nEmail: ${email}\nTemporary password: ${password}\n\nYou'll be asked to choose a new password when you sign in.`;
  return { subject: 'Your K.C. Bobcat used equipment password was reset', html, text };
}

export function assignmentEmail({ req, assigneeName, assignedByName, uploadLink, listLink }) {
  const title = [req.make, req.model].filter(Boolean).join(' ') || 'a unit';
  const angles = req.angles?.length
    ? req.angles.map((k) => SLOT_ORDER.find(([key]) => key === k)?.[1] || k).join(', ')
    : 'All angles';
  const due = req.dueDate
    ? new Date(`${req.dueDate}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : null;
  const rows = [
    ['Serial #', req.serial],
    ['EIN', req.ein],
    ['Warehouse', req.warehouse],
    ['Angles needed', angles],
    ['Needed by', due],
    ['Notes', req.notes],
  ].filter(([, v]) => v);

  const html = shell(
    `Photos needed: ${title}`,
    `<p style="margin:0 0 16px;color:#333333;">Hi ${esc(assigneeName)}, ${esc(assignedByName)} assigned you a photo request.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;font-size:14px;">
${rows.map(([k, v]) => `<tr><td style="padding:6px 0;color:#666666;border-bottom:1px solid #eeeeee;width:130px;" valign="top">${esc(k)}</td><td style="padding:6px 0;border-bottom:1px solid #eeeeee;font-weight:600;white-space:pre-wrap;">${esc(v)}</td></tr>`).join('')}
</table>
${button(uploadLink, 'Upload photos')}
<p style="margin:16px 0 0;font-size:13px;"><a href="${esc(listLink)}" style="color:#cc2900;">See all photo requests</a></p>`,
  );
  const text = [
    `Photos needed: ${title}`,
    '',
    `${assignedByName} assigned you a photo request.`,
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    `Upload photos: ${uploadLink}`,
    `All requests: ${listLink}`,
  ].join('\n');
  return { subject: `Photo request: ${title}${req.serial ? ` (Serial ${req.serial})` : ''}${due ? ` — needed by ${due}` : ''}`, html, text };
}

export function messageEmail({ eq, msg, recipientName, link, toSubmitter, mentioned = false }) {
  const title = `${eq.year ? `${eq.year} ` : ''}${eq.make} ${eq.model}`;
  const who = msg.authorName || msg.authorEmail || 'Someone';
  const headline = mentioned
    ? `${who} tagged you on ${title}`
    : msg.kind === 'action'
      ? `${who} needs more photos or changes on ${title}`
      : msg.kind === 'resolved'
        ? `${who} marked the follow-up on ${title} done`
        : `${who} sent a message about ${title}`;
  const callout =
    msg.kind === 'action'
      ? `<p style="margin:0 0 12px;padding:10px 12px;background:#fff0eb;border-left:4px solid #ff3300;color:#cc2900;font-weight:700;">Action needed${toSubmitter ? ' on a unit you submitted' : ''}</p>`
      : '';
  const quote = msg.text
    ? `<div style="margin:0 0 20px;padding:12px 14px;background:#f2f2f2;border-radius:6px;white-space:pre-wrap;color:#000000;">${esc(msg.text)}</div>`
    : '';
  const html = shell(
    headline,
    `<p style="margin:0 0 12px;color:#333333;">Hi ${esc(recipientName)},</p>
${callout}${quote}
<p style="margin:0 0 20px;color:#666666;font-size:13px;">${esc(title)} · Serial ${esc(eq.serial)}${eq.ein ? ` · EIN ${esc(eq.ein)}` : ''}${eq.warehouse ? ` · ${esc(eq.warehouse)}` : ''}</p>
${button(link, msg.kind === 'resolved' ? 'View unit' : 'Reply or view unit')}`,
  );
  const text = [headline, '', msg.text || '', '', `${title} · Serial ${eq.serial}`, '', `Reply or view: ${link}`].join('\n');
  const subject = mentioned
    ? `${who} tagged you: ${title} (Serial ${eq.serial})`
    : msg.kind === 'action'
      ? `Action needed: ${title} (Serial ${eq.serial})`
      : msg.kind === 'resolved'
        ? `Done: ${title} (Serial ${eq.serial})`
        : `Message about ${title} (Serial ${eq.serial})`;
  return { subject, html, text };
}

export function importDigestEmail({ rows, assigneeName, assignedByName, listLink, appUrl }) {
  const n = rows.length;
  const dues = [...new Set(rows.map((r) => r.dueDate).filter(Boolean))];
  const due = dues.length === 1 ? new Date(`${dues[0]}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : null;
  const shown = rows.slice(0, 60);
  const cell = 'padding:6px 8px;border-bottom:1px solid #eeeeee;font-size:13px;vertical-align:top;';
  const table = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 16px;">
<tr>${['Whse', 'Unit', 'Serial #', 'EIN'].map((h) => `<td style="${cell}color:#666666;font-weight:700;">${h}</td>`).join('')}</tr>
${shown
  .map((r) => {
    const link = r.equipmentId ? `${appUrl}/#/equipment/${r.equipmentId}/edit?request=${r.id}` : `${appUrl}/#/new?request=${r.id}`;
    const unit = [r.year, r.make, r.model].filter(Boolean).join(' ');
    return `<tr><td style="${cell}">${esc(r.warehouse || r.warehouseCode || '')}</td><td style="${cell}"><a href="${esc(link)}" style="color:#cc2900;font-weight:700;">${esc(unit)}</a></td><td style="${cell}font-family:Consolas,Menlo,monospace;">${esc(r.serial)}</td><td style="${cell}font-family:Consolas,Menlo,monospace;">${esc(r.ein)}</td></tr>`;
  })
  .join('')}
</table>${n > shown.length ? `<p style="margin:0 0 16px;color:#666666;font-size:13px;">…and ${n - shown.length} more.</p>` : ''}`;
  const html = shell(
    `${n} photo request${n === 1 ? '' : 's'} assigned to you`,
    `<p style="margin:0 0 16px;color:#333333;">Hi ${esc(assigneeName)}, ${esc(assignedByName)} assigned you ${n} photo request${n === 1 ? '' : 's'}${due ? `, needed by <strong>${esc(due)}</strong>` : ''}. Tap a unit to upload its photos.</p>
${table}
${button(listLink, 'Open my photo requests')}`,
  );
  const text = [
    `${assignedByName} assigned you ${n} photo request${n === 1 ? '' : 's'}${due ? `, needed by ${due}` : ''}.`,
    '',
    ...rows.map((r) => `${r.warehouse || r.warehouseCode || ''}  ${[r.year, r.make, r.model].filter(Boolean).join(' ')}  Serial ${r.serial}  EIN ${r.ein}`),
    '',
    `Open your requests: ${listLink}`,
  ].join('\n');
  return { subject: `${n} photo request${n === 1 ? '' : 's'} assigned to you${due ? ` — needed by ${due}` : ''}`, html, text };
}

/** Photos uploaded for a request → the requester (or admins, for units from the daily report). */
export function photosReadyEmail({ req, eq, recipientName, completedByName, link, count, total }) {
  const unit = [eq?.year ?? req.year, eq?.make || req.make, eq?.model || req.model].filter(Boolean).join(' ');
  const where = eq?.warehouse || req.warehouse || '';
  const html = shell(
    'Photos are ready',
    `<p style="margin:0 0 16px;color:#333333;">Hi ${esc(recipientName)}, ${esc(completedByName)} uploaded photos for <strong>${esc(unit)}</strong>${where ? ` at ${esc(where)}` : ''} (${count} of ${total} angles).</p>
<p style="margin:0 0 16px;color:#666666;font-size:13px;">Serial ${esc(eq?.serial || req.serial || '—')}${eq?.ein || req.ein ? ` · EIN ${esc(eq?.ein || req.ein)}` : ''}</p>
${button(link, 'View and download photos')}`,
  );
  const text = `${completedByName} uploaded photos for ${unit}${where ? ` at ${where}` : ''} (${count} of ${total} angles).\n\nView and download: ${link}`;
  return { subject: `Photos ready: ${unit}${where ? ` (${where})` : ''}`, html, text };
}

/** Units that dropped off the daily report: heads-up before auto-delete, and what was deleted today → admins. */
export function offReportEmail({ warn, deleted, appUrl }) {
  const day = (iso) => new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Chicago' });
  const cell = 'padding:6px 8px;border-bottom:1px solid #eeeeee;font-size:13px;vertical-align:top;';
  const table = (rows, extra) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 16px;">
${rows.map((r) => `<tr><td style="${cell}"><a href="${esc(`${appUrl}/#/equipment/${r.id}`)}" style="color:#cc2900;font-weight:700;">${esc(r.unit)}</a></td><td style="${cell}">${esc(r.warehouse)}</td><td style="${cell}font-family:Consolas,Menlo,monospace;">${esc(r.serial)}</td><td style="${cell}">${esc(extra(r))}</td></tr>`).join('')}
</table>`;
  const parts = [];
  if (warn.length) {
    parts.push(`<p style="margin:0 0 8px;color:#333333;">${warn.length === 1 ? 'This unit has' : 'These units have'} been off the daily equipment report for over 50 days and will be <strong>deleted with ${warn.length === 1 ? 'its' : 'their'} photos</strong> on the date shown. To keep one, open it and click <strong>Keep</strong>.</p>${table(warn, (r) => `Deletes ${day(r.deleteAt)}`)}`);
  }
  if (deleted.length) {
    parts.push(`<p style="margin:0 0 8px;color:#333333;">Deleted today after 60 days off the report:</p>${table(deleted, () => 'Deleted')}`);
  }
  const subject = warn.length ? `${warn.length} unit${warn.length === 1 ? '' : 's'} will be deleted soon (off the equipment report)` : `${deleted.length} unit${deleted.length === 1 ? '' : 's'} deleted (off the equipment report 60 days)`;
  const text = [
    ...warn.map((r) => `Deletes ${day(r.deleteAt)}: ${r.unit} · ${r.warehouse} · Serial ${r.serial} — ${appUrl}/#/equipment/${r.id}`),
    ...deleted.map((r) => `Deleted: ${r.unit} · ${r.warehouse} · Serial ${r.serial}`),
  ].join('\n');
  return { subject, html: shell('Units no longer on the equipment report', parts.join('')), text };
}

/** The daily report import failed (bad URL, Zapier stopped, unreadable file) → admins. */
export function reportFailedEmail({ error, settingsLink }) {
  const html = shell(
    'Daily report import didn’t run',
    `<p style="margin:0 0 16px;color:#333333;">This morning’s equipment report couldn’t be imported, so no new “Post to Web” units were added to Pending.</p>
<p style="margin:0 0 16px;padding:12px;background:#fff1ec;border-radius:6px;color:#8a1f00;font-size:13px;">${esc(error)}</p>
<p style="margin:0 0 16px;color:#333333;">Check that the Zapier zap is still running and that the report link in Settings opens the PDF. You can also upload the report by hand.</p>
${button(settingsLink, 'Open report settings')}`,
  );
  return { subject: 'Daily equipment report import failed', html, text: `The daily equipment report import failed: ${error}\n\nSettings: ${settingsLink}` };
}
```

## `functions/index.js`

```js
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { onDocumentCreated, onDocumentUpdated, onDocumentDeleted, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { handleDownload } from './downloads.js';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { setGlobalOptions } from 'firebase-functions/v2';
import { defineString } from 'firebase-functions/params';
import { logger } from 'firebase-functions';
import { randomBytes } from 'node:crypto';
import { newSubmissionEmail, welcomeEmail, passwordEmail, assignmentEmail, messageEmail, importDigestEmail, photosReadyEmail, reportFailedEmail, offReportEmail } from './emails.js';
import { importReport, fetchReport, recordFailure } from './report-import.js';
import { sendEmails, logSkipped, RESEND_API_KEY, MAIL_FROM } from './mailer.js';

initializeApp();
const db = getFirestore();

setGlobalOptions({ region: 'us-central1', maxInstances: 10 });

// Set in functions/.env (or prompted on first deploy).
const APP_URL = defineString('APP_URL', { default: 'https://used.kcbobcat.com' });

const ROLES = ['admin', 'employee', 'viewer'];

// Mirrors notifyPrefs() in src/pages/notifications.js (older accounts: admins = all, employees = none).
function wantsNewUnit(u, warehouse) {
  const mode = u.notifyNewUnits || (u.role === 'admin' && u.notify !== false ? 'all' : 'none');
  if (mode === 'all') return true;
  if (mode === 'locations') return Boolean(warehouse) && (u.notifyLocations || []).includes(warehouse);
  return false;
}
const MIN_PASSWORD = 8;

// Turn Admin SDK errors into messages the admin can act on (instead of a bare "INTERNAL").
function friendly(err) {
  if (err instanceof HttpsError) return err;
  const code = err?.code || err?.errorInfo?.code || '';
  const msg = err?.message || 'Something went wrong.';
  if (code === 'auth/invalid-password' || code === 'auth/password-does-not-meet-requirements') {
    return new HttpsError('invalid-argument', `That password doesn’t meet the requirements: ${msg}`);
  }
  if (code === 'auth/user-not-found') return new HttpsError('not-found', 'That user has no login. Remove and re-add them.');
  if (code === 'auth/email-already-exists') return new HttpsError('already-exists', 'Another login already uses that email.');
  if (code === 'auth/unauthorized-continue-uri' || code === 'auth/invalid-continue-uri') {
    return new HttpsError('failed-precondition', 'The site’s domain isn’t in Firebase Auth → Settings → Authorized domains yet.');
  }
  logger.error('Unexpected admin error', err);
  return new HttpsError('internal', msg);
}

// Readable temporary password, e.g. "Kc7-mPw4-xR9t" (no look-alike characters like 0/O or 1/l).
function tempPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = randomBytes(12);
  const s = [...bytes].map((b) => chars[b % chars.length]).join('');
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

function validPassword(pw) {
  if (typeof pw !== 'string' || pw.length < MIN_PASSWORD) {
    throw new HttpsError('invalid-argument', `Password must be at least ${MIN_PASSWORD} characters.`);
  }
  if (pw.length > 128) throw new HttpsError('invalid-argument', 'Password is too long.');
  return pw;
}

// ---------------------------------------------------------------------------
// Notify admins when a unit is submitted
// ---------------------------------------------------------------------------
export const onEquipmentCreated = onDocumentCreated({ document: 'equipment/{id}', secrets: [RESEND_API_KEY] }, async (event) => {
  const eq = event.data?.data();
  if (!eq) return;
  // Units added by the daily report have no photos yet — the branch gets a photo-request digest instead.
  if (eq.importBatch) return;
  // Answering a photo request from the daily report → the admins get a "Photos ready" email instead (onRequestWritten).
  if (eq.requestId) {
    const req = await db.doc(`requests/${eq.requestId}`).get();
    if (req.get('createdBy') === 'daily-report') return;
  }

  // Everyone whose notification settings cover this unit (all units, or this unit's location),
  // except the person who submitted it.
  const users = await db.collection('users').where('active', '==', true).get();
  const to = users.docs
    .filter((d) => d.id !== eq.createdBy)
    .map((d) => d.data())
    .filter((u) => u.email && wantsNewUnit(u, eq.warehouse))
    .map((u) => u.email);

  if (!to.length) {
    await logSkipped({
      type: 'new-submission',
      ref: event.params.id,
      reason: `Nobody (other than the submitter) is set to get new-unit emails${eq.warehouse ? ` for ${eq.warehouse}` : ''}.`,
    });
    return;
  }

  const link = `${APP_URL.value().replace(/\/$/, '')}/#/equipment/${event.params.id}`;
  const message = newSubmissionEmail({ eq, link });

  // One email per person (batched, max 100 per API call) so addresses aren't shared.
  // The idempotency key stops a retried trigger from emailing twice.
  for (let i = 0; i < to.length; i += 100) {
    await sendEmails(
      to.slice(i, i + 100).map((addr) => ({ to: [addr], ...message })),
      { idempotencyKey: `new-unit/${event.params.id}/${i}`, type: 'new-submission', ref: event.params.id },
    );
  }
});

// ---------------------------------------------------------------------------
// Email whoever a photo request is assigned to (on create or reassignment)
// ---------------------------------------------------------------------------
export const onRequestWritten = onDocumentWritten({ document: 'requests/{id}', secrets: [RESEND_API_KEY] }, async (event) => {
  const before = event.data?.before?.exists ? event.data.before.data() : null;
  const req = event.data?.after?.exists ? event.data.after.data() : null;
  if (req && req.status === 'done' && before?.status !== 'done') {
    if (!['listed', 'deleted'].includes(req.completedBy)) await photosReady(event.params.id, req);
    return;
  }
  if (!req || req.status === 'done' || !req.assignedTo) return;
  if (before && before.assignedTo === req.assignedTo) return; // assignee didn't change
  if (!before && req.importBatch) return; // imported in a batch — onRequestImportCreated sends one summary email
  if (req.assignedTo === req.assignedBy) {
    await logSkipped({ type: 'request-assigned', ref: event.params.id, reason: 'Assigned to themselves — no email needed.' });
    return;
  }

  const [assigneeSnap, bySnap] = await Promise.all([
    db.doc(`users/${req.assignedTo}`).get(),
    req.assignedBy ? db.doc(`users/${req.assignedBy}`).get() : null,
  ]);
  const assignee = assigneeSnap.data();
  if (!assignee?.active || !assignee.email) {
    await logSkipped({ type: 'request-assigned', ref: event.params.id, reason: 'Assignee is inactive or has no email address.' });
    return;
  }
  if (assignee.role === 'viewer') {
    await logSkipped({ type: 'request-assigned', ref: event.params.id, to: [assignee.email], reason: 'Assignee has view-only access and can’t upload photos — reassign the request.' });
    return;
  }
  if (assignee.notifyAssigned === false) {
    await logSkipped({ type: 'request-assigned', ref: event.params.id, to: [assignee.email], reason: 'Assignee has turned off assignment emails.' });
    return;
  }
  const by = bySnap?.data();
  const base = APP_URL.value().replace(/\/$/, '');
  const id = event.params.id;
  const uploadLink = req.equipmentId ? `${base}/#/equipment/${req.equipmentId}/edit?request=${id}` : `${base}/#/new?request=${id}`;

  const message = assignmentEmail({
    req,
    assigneeName: assignee.displayName || assignee.email,
    assignedByName: by?.displayName || by?.email || req.createdByName || 'Someone',
    uploadLink,
    listLink: `${base}/#/requests`,
  });
  await sendEmails([{ to: [assignee.email], ...message }], {
    idempotencyKey: `assign/${id}/${req.assignedTo}/${event.id}`,
    type: 'request-assigned',
    ref: id,
  });
});

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

// ---------------------------------------------------------------------------
// Daily equipment report → Pending (see report-import.js)
// ---------------------------------------------------------------------------
async function emailImportDigests(result) {
  const byAssignee = new Map();
  for (const c of result.created) {
    if (!c.assignedTo) continue;
    if (!byAssignee.has(c.assignedTo)) byAssignee.set(c.assignedTo, []);
    byAssignee.get(c.assignedTo).push(c);
  }
  const base = APP_URL.value().replace(/\/$/, '');
  for (const [uid, items] of byAssignee) {
    const snap = await db.doc(`users/${uid}`).get();
    const u = snap.data();
    if (!u?.active || !u.email || u.notifyAssigned === false) {
      await logSkipped({ type: 'request-import', ref: result.id, to: u?.email ? [u.email] : [], reason: 'Branch photo contact is inactive or has assignment emails turned off.' });
      continue;
    }
    const rows = items.map((c) => ({ id: c.requestId, equipmentId: c.equipmentId, warehouse: c.warehouse, serial: c.serial, ein: c.ein, year: c.year, make: c.make, model: c.model }));
    await sendEmails(
      [{ to: [u.email], ...importDigestEmail({ rows, assigneeName: u.displayName || u.email, assignedByName: 'The daily equipment report', listLink: `${base}/#/requests`, appUrl: base }) }],
      { idempotencyKey: `report/${result.id}/${uid}`, type: 'request-import', ref: result.id },
    );
  }
}

async function emailOffReport(result) {
  const warn = result.offReport?.warn || [];
  const deleted = result.offReport?.deleted || [];
  if (!warn.length && !deleted.length) return;
  const admins = await db.collection('users').where('role', '==', 'admin').where('active', '==', true).get();
  const to = admins.docs.map((d) => d.get('email')).filter(Boolean);
  if (!to.length) return;
  const msg = offReportEmail({ warn, deleted, appUrl: APP_URL.value().replace(/\/$/, '') });
  await sendEmails(to.map((addr) => ({ to: [addr], ...msg })), { idempotencyKey: `offreport/${result.id}`, type: 'off-report', ref: result.id });
}

async function emailAdminsFailure(error) {
  const admins = await db.collection('users').where('role', '==', 'admin').where('active', '==', true).get();
  const to = admins.docs.map((d) => d.get('email')).filter(Boolean);
  if (!to.length) return;
  const msg = reportFailedEmail({ error, settingsLink: `${APP_URL.value().replace(/\/$/, '')}/#/admin/settings/report` });
  await sendEmails(to.map((addr) => ({ to: [addr], ...msg })), { type: 'report-import', ref: 'daily' });
}

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

// Deleted units stay restorable for 30 days, then go for good (onEquipmentDeleted removes photos/messages).
export const purgeDeletedUnits = onSchedule({ schedule: '15 2 * * *', timeZone: 'America/Chicago', retryCount: 0 }, async () => {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const snap = await db.collection('equipment').where('status', '==', 'deleted').get();
  const old = snap.docs.filter((d) => (d.get('deletedAt')?.toMillis?.() ?? 0) < cutoff);
  for (const d of old) await d.ref.delete();
  logger.info('Purged deleted units', { count: old.length });
});

// Admin: run the import now — from the saved URL, or from an uploaded file. dryRun previews without saving.
export const runReportImport = onCall({ secrets: [RESEND_API_KEY], timeoutSeconds: 300, memory: '512MiB' }, async (request) => {
  const me = await requireAdmin(request);
  const by = { uid: request.auth.uid, ...me };
  const dryRun = request.data?.dryRun === true;
  const upload = request.data?.fileBase64;
  try {
    let file;
    if (upload) {
      if (typeof upload !== 'string' || upload.length > 20 * 1024 * 1024) throw new HttpsError('invalid-argument', 'That file is too large.');
      file = { bytes: Buffer.from(upload, 'base64'), name: String(request.data?.fileName || 'upload').slice(0, 120) };
    } else {
      const url = String(request.data?.url || (await db.doc('settings/reportImport').get()).get('url') || '');
      file = await fetchReport(url);
    }
    const reimport = Array.isArray(request.data?.reimport) ? request.data.reimport.filter((k) => typeof k === 'string').slice(0, 200) : [];
    const result = await importReport({ ...file, source: upload ? 'upload' : 'manual', by, dryRun, reimport });
    if (!dryRun) {
      await emailImportDigests(result).catch((e) => logger.error('Import digest emails failed', e));
      await emailOffReport(result).catch((e) => logger.error('Off-report email failed', e));
    }
    return result;
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    if (!dryRun) await recordFailure({ source: upload ? 'upload' : 'manual', by, error: err.message });
    throw new HttpsError('failed-precondition', err.message);
  }
});

// ---------------------------------------------------------------------------
// Messages on a unit: keep the unit's follow-up flag in sync and email the people involved
// ---------------------------------------------------------------------------
export const onMessageCreated = onDocumentCreated({ document: 'equipment/{id}/messages/{mid}', secrets: [RESEND_API_KEY] }, async (event) => {
  const msg = event.data?.data();
  if (!msg) return;
  const { id, mid } = event.params;
  const eqRef = db.doc(`equipment/${id}`);
  const eqSnap = await eqRef.get();
  if (!eqSnap.exists) return;
  const eq = eqSnap.data();

  // 1. Follow-up flag (written here with admin rights, so clients never edit it directly).
  if (msg.kind === 'action') {
    await eqRef.update({
      followUp: { open: true, text: msg.text || '', byId: msg.authorId, byName: msg.authorName || msg.authorEmail, at: FieldValue.serverTimestamp(), messageId: mid },
    });
  } else if (msg.kind === 'resolved' && !eq.followUp?.open) {
    return; // nothing was open (double click / two tabs) — don't email the thread again
  } else if (msg.kind === 'resolved') {
    await eqRef.update({
      'followUp.open': false,
      'followUp.resolvedById': msg.authorId,
      'followUp.resolvedByName': msg.authorName || msg.authorEmail,
      'followUp.resolvedAt': FieldValue.serverTimestamp(),
    });
  }

  // 2. Who to email: the submitter plus everyone who has posted in this thread — except the author.
  // Plus whoever a photo request for this unit is assigned to / was completed by (e.g. units from the daily report).
  const [thread, reqs] = await Promise.all([
    eqRef.collection('messages').select('authorId').get(),
    db.collection('requests').where('equipmentId', '==', id).get(),
  ]);
  const uids = new Set(
    [eq.createdBy, ...thread.docs.map((d) => d.get('authorId')), ...reqs.docs.flatMap((d) => [d.get('assignedTo'), d.get('completedBy')])]
      .filter((u) => u && u !== 'daily-report'),
  );
  // @-tagged people are always emailed (even with message emails off) — someone asked for them by name.
  const tagged = new Set((Array.isArray(msg.mentions) ? msg.mentions : []).filter((u) => typeof u === 'string').slice(0, 25));
  tagged.forEach((u) => uids.add(u));
  uids.delete(msg.authorId);
  tagged.delete(msg.authorId);
  if (!uids.size) return;

  const users = await Promise.all([...uids].map((uid) => db.doc(`users/${uid}`).get()));
  const recipients = users
    .filter((s) => s.exists)
    .map((s) => ({ uid: s.id, ...s.data() }))
    .filter((u) => u.active && u.email && (tagged.has(u.uid) || u.notifyMessages !== false));
  if (!recipients.length) {
    await logSkipped({ type: 'message', ref: id, reason: 'Nobody else in this thread is active with message emails turned on.' });
    return;
  }

  const link = `${APP_URL.value().replace(/\/$/, '')}/#/equipment/${id}?messages`;
  await sendEmails(
    recipients.map((u) => ({
      to: [u.email],
      ...messageEmail({ eq, msg, recipientName: u.displayName || u.email, link, toSubmitter: u.uid === eq.createdBy, mentioned: tagged.has(u.uid) }),
    })),
    { idempotencyKey: `msg/${id}/${mid}`, type: 'message', ref: id },
  );
});

// ---------------------------------------------------------------------------
// Imported batch of requests: one summary email to the assignee instead of one per request
// ---------------------------------------------------------------------------
export const onRequestImportCreated = onDocumentCreated({ document: 'requestImports/{id}', secrets: [RESEND_API_KEY] }, async (event) => {
  const imp = event.data?.data();
  if (!imp) return;
  const id = event.params.id;
  if (!imp.assignedTo) {
    await logSkipped({ type: 'request-import', ref: id, reason: `Imported ${imp.count} requests with nobody assigned.` });
    return;
  }
  if (imp.assignedTo === imp.createdBy) {
    await logSkipped({ type: 'request-import', ref: id, reason: 'Imported requests were assigned to the person who imported them — no email needed.' });
    return;
  }
  const [assigneeSnap, bySnap, reqSnap] = await Promise.all([
    db.doc(`users/${imp.assignedTo}`).get(),
    db.doc(`users/${imp.createdBy}`).get(),
    db.collection('requests').where('importBatch', '==', id).get(),
  ]);
  const assignee = assigneeSnap.data();
  if (!assignee?.active || !assignee.email || assignee.role === 'viewer') {
    await logSkipped({ type: 'request-import', ref: id, reason: 'Assignee is inactive, view-only, or has no email address.' });
    return;
  }
  if (assignee.notifyAssigned === false) {
    await logSkipped({ type: 'request-import', ref: id, to: [assignee.email], reason: 'Assignee has turned off assignment emails.' });
    return;
  }
  const rows = reqSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((r) => r.status !== 'done' && r.assignedTo === imp.assignedTo)
    .sort((a, b) => String(a.warehouse || a.warehouseCode).localeCompare(String(b.warehouse || b.warehouseCode)) || String(a.model).localeCompare(String(b.model)));
  if (!rows.length) return;
  const appUrl = APP_URL.value().replace(/\/$/, '');
  const by = bySnap.data() || {};
  await sendEmails(
    [{ to: [assignee.email], ...importDigestEmail({ rows, assigneeName: assignee.displayName || assignee.email, assignedByName: by.displayName || imp.createdByName || 'Someone', listLink: `${appUrl}/#/requests`, appUrl }) }],
    { idempotencyKey: `import/${id}`, type: 'request-import', ref: id },
  );
});

// ---------------------------------------------------------------------------
// Storage cleanup: replaced photos and deleted units
// ---------------------------------------------------------------------------
function photoPaths(photos = {}) {
  return Object.values(photos).flatMap((p) => [p?.path, p?.thumbPath]).filter(Boolean);
}

export const onEquipmentUpdated = onDocumentUpdated('equipment/{id}', async (event) => {
  // Marked Listed or deleted → its open photo requests are finished (no "photos ready" email).
  const now = event.data.after.get('status');
  if (['archived', 'deleted'].includes(now) && event.data.before.get('status') !== now) {
    const reqs = await db.collection('requests').where('equipmentId', '==', event.params.id).where('status', '==', 'open').get();
    const by = now === 'deleted' ? { completedBy: 'deleted', completedByName: 'Unit deleted' } : { completedBy: 'listed', completedByName: 'Marked as Listed' };
    await Promise.all(reqs.docs.map((d) => d.ref.update({ status: 'done', completedAt: FieldValue.serverTimestamp(), ...by, updatedAt: FieldValue.serverTimestamp() })));
  }
  const before = new Set(photoPaths(event.data.before.data()?.photos));
  const after = new Set(photoPaths(event.data.after.data()?.photos));
  // Only ever delete files inside this unit's own folder, whatever the document claims.
  const prefix = `equipment/${event.params.id}/`;
  const removed = [...before].filter((p) => !after.has(p) && p.startsWith(prefix) && !p.includes('..'));
  if (!removed.length) return;
  const bucket = getStorage().bucket();
  await Promise.all(removed.map((p) => bucket.file(p).delete({ ignoreNotFound: true })));
  logger.info('Deleted replaced photos', { id: event.params.id, count: removed.length });
});

export const onEquipmentDeleted = onDocumentDeleted('equipment/{id}', async (event) => {
  await getStorage().bucket().deleteFiles({ prefix: `equipment/${event.params.id}/` });
  await db.recursiveDelete(db.collection(`equipment/${event.params.id}/messages`));
  await db.recursiveDelete(db.collection(`equipment/${event.params.id}/private`));
  // Open photo requests for a deleted unit can't be fulfilled any more — remove them.
  const reqs = await db.collection('requests').where('equipmentId', '==', event.params.id).where('status', '==', 'open').get();
  await Promise.all(reqs.docs.map((d) => d.ref.delete()));
  logger.info('Deleted photos for removed unit', { id: event.params.id });
});

// ---------------------------------------------------------------------------
// Admin: send a test email to yourself and report exactly what Resend said
// ---------------------------------------------------------------------------
export const sendTestEmail = onCall({ secrets: [RESEND_API_KEY] }, async (request) => {
  const me = await requireAdmin(request);
  const appUrl = APP_URL.value().replace(/\/$/, '');
  const result = await sendEmails(
    [
      {
        to: [me.email],
        subject: 'Test email from the used equipment dashboard',
        html: `<p>It works! Emails from <strong>${MAIL_FROM.value().replace(/[<>&]/g, '')}</strong> are reaching you.</p><p><a href="${appUrl}">${appUrl}</a></p>`,
        text: `It works! Emails from ${MAIL_FROM.value()} are reaching you.\n\n${appUrl}`,
      },
    ],
    { type: 'test', ref: request.auth.uid },
  );
  return { ...result, to: me.email, from: MAIL_FROM.value() };
});

// ---------------------------------------------------------------------------
// Photo downloads (one photo, or all as a .zip) through our own domain: Hosting rewrites /api/download here.
// ---------------------------------------------------------------------------
export const downloadPhotos = onRequest({ memory: '512MiB', timeoutSeconds: 120, concurrency: 20 }, handleDownload);

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

// ---------------------------------------------------------------------------
// User management (admin only)
// ---------------------------------------------------------------------------
async function requireAdmin(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  const snap = await db.doc(`users/${request.auth.uid}`).get();
  const me = snap.data();
  if (!me || me.active !== true || me.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Only admins can manage users.');
  }
  return me;
}

export const createUser = onCall({ secrets: [RESEND_API_KEY] }, async (request) => {
  const caller = await requireAdmin(request);
  const email = String(request.data?.email || '').trim().toLowerCase();
  const displayName = String(request.data?.displayName || '').trim().slice(0, 80);
  const role = ROLES.includes(request.data?.role) ? request.data.role : 'employee';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpsError('invalid-argument', 'Enter a valid email address.');
  if (!displayName) throw new HttpsError('invalid-argument', 'Enter a name.');
  // Starting password: the one the admin typed, or a generated one. It's emailed to the new user,
  // and they must choose their own the first time they sign in.
  const password = request.data?.password ? validPassword(request.data.password) : tempPassword();

  const auth = getAuth();
  let user;
  try {
    user = await auth.getUserByEmail(email);
    const existing = await db.doc(`users/${user.uid}`).get();
    if (existing.exists) throw new HttpsError('already-exists', `${email} already has an account.`);
    // A login with this email already exists (e.g. someone used the sign-up API). Reset its password
    // and sign out any sessions so only the real person — via the emailed password — can get in.
    await auth.updateUser(user.uid, {
      displayName,
      disabled: false,
      emailVerified: false,
      password,
    });
    await auth.revokeRefreshTokens(user.uid);
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    if (err.code !== 'auth/user-not-found') throw friendly(err);
    try {
      user = await auth.createUser({ email, displayName, password });
    } catch (e) {
      throw friendly(e);
    }
  }

  await db.doc(`users/${user.uid}`).set({
    email,
    displayName,
    role,
    active: true,
    notifyNewUnits: role === 'admin' ? 'all' : 'none',
    notifyLocations: [],
    notifyAssigned: true,
    mustChangePassword: true,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: request.auth.uid,
  });

  let emailed = false;
  try {
    const appUrl = APP_URL.value().replace(/\/$/, '');
    const message = welcomeEmail({ displayName, role, email, password, appUrl, invitedBy: caller.displayName || caller.email });
    const sent = await sendEmails([{ to: [email], ...message }], { type: 'welcome', ref: user.uid });
    emailed = sent.ok;
  } catch (err) {
    logger.error('Could not send welcome email', err);
  }

  // The password goes back to the admin only if the email failed, so they can pass it on another way.
  return { uid: user.uid, emailed, tempPassword: emailed ? null : password };
});

// Admin password help for another user:
//   { uid, action: 'set', password }  → sets it directly and signs them out everywhere
//   { uid, action: 'link' }           → returns a one-time reset link the admin can copy and send
export const adminPassword = onCall({ secrets: [RESEND_API_KEY] }, async (request) => {
  try {
    return await adminPasswordImpl(request);
  } catch (err) {
    throw friendly(err);
  }
});

async function adminPasswordImpl(request) {
  await requireAdmin(request);
  const { uid, action } = request.data || {};
  if (!uid || typeof uid !== 'string') throw new HttpsError('invalid-argument', 'Missing user.');
  const snap = await db.doc(`users/${uid}`).get();
  if (!snap.exists) throw new HttpsError('not-found', 'User not found.');
  const target = snap.data();
  const auth = getAuth();

  if (action === 'set') {
    if (uid === request.auth.uid) {
      throw new HttpsError('failed-precondition', 'Change your own password from My account → Change password.');
    }
    const generate = request.data.generate === true;
    const password = generate ? tempPassword() : validPassword(request.data.password);
    const sendIt = generate || request.data.email === true;
    await auth.updateUser(uid, { password });
    await auth.revokeRefreshTokens(uid);
    await db.doc(`users/${uid}`).update({
      passwordChangedAt: FieldValue.serverTimestamp(),
      passwordChangedBy: request.auth.uid,
      // An emailed password is temporary: they pick their own at next sign-in.
      mustChangePassword: sendIt,
    });
    logger.info('Admin set password', { uid, by: request.auth.uid, emailed: sendIt });

    let emailed = false;
    if (sendIt) {
      const caller = (await db.doc(`users/${request.auth.uid}`).get()).data() || {};
      const sent = await sendEmails(
        [{ to: [target.email], ...passwordEmail({ displayName: target.displayName || target.email, email: target.email, password, appUrl: APP_URL.value().replace(/\/$/, ''), setBy: caller.displayName || caller.email }) }],
        { type: 'password', ref: uid },
      );
      emailed = sent.ok;
    }
    return { ok: true, emailed, tempPassword: sendIt && !emailed ? password : null };
  }

  if (action === 'link') {
    const link = await auth.generatePasswordResetLink(target.email, { url: APP_URL.value().replace(/\/$/, '') });
    logger.info('Admin generated reset link', { uid, by: request.auth.uid });
    return { link };
  }

  throw new HttpsError('invalid-argument', 'Unknown action.');
}

export const updateUser = onCall(async (request) => {
  await requireAdmin(request);
  const { uid } = request.data || {};
  if (!uid || typeof uid !== 'string') throw new HttpsError('invalid-argument', 'Missing user.');

  const ref = db.doc(`users/${uid}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'User not found.');
  const current = snap.data();

  const patch = {};
  if ('role' in request.data) {
    if (!ROLES.includes(request.data.role)) throw new HttpsError('invalid-argument', 'Unknown role.');
    patch.role = request.data.role;
  }
  if ('active' in request.data) patch.active = request.data.active === true;
  if ('notify' in request.data) patch.notify = request.data.notify === true;
  if ('displayName' in request.data) patch.displayName = String(request.data.displayName || '').trim().slice(0, 80);

  const isSelf = uid === request.auth.uid;
  if (isSelf && ((patch.role && patch.role !== 'admin') || patch.active === false)) {
    throw new HttpsError('failed-precondition', 'You can’t remove your own admin access or deactivate yourself.');
  }

  const losingAdmin = current.role === 'admin' && current.active && ((patch.role !== undefined && patch.role !== 'admin') || patch.active === false);
  if (losingAdmin) {
    const admins = await db.collection('users').where('role', '==', 'admin').where('active', '==', true).count().get();
    if (admins.data().count <= 1) throw new HttpsError('failed-precondition', 'There must be at least one active admin.');
  }

  patch.updatedAt = FieldValue.serverTimestamp();
  patch.updatedBy = request.auth.uid;
  await ref.update(patch);

  if ('active' in patch || 'displayName' in patch) {
    const authPatch = {};
    if ('active' in patch) authPatch.disabled = !patch.active;
    if (patch.displayName) authPatch.displayName = patch.displayName;
    try {
      await getAuth().updateUser(uid, authPatch);
      if (patch.active === false) await getAuth().revokeRefreshTokens(uid);
    } catch (err) {
      throw friendly(err);
    }
  }
  return { ok: true };
});

// Admin: permanently remove a user's login and profile. Their units, photos, messages and requests stay
// (showing their name); open photo requests assigned to them are unassigned so nothing is stuck.
export const deleteUser = onCall(async (request) => {
  await requireAdmin(request);
  const uid = request.data?.uid;
  if (!uid || typeof uid !== 'string') throw new HttpsError('invalid-argument', 'Missing user.');
  if (uid === request.auth.uid) throw new HttpsError('failed-precondition', 'You can’t delete your own account.');

  const ref = db.doc(`users/${uid}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'User not found.');
  const target = snap.data();
  if (target.role === 'admin' && target.active) {
    const admins = await db.collection('users').where('role', '==', 'admin').where('active', '==', true).count().get();
    if (admins.data().count <= 1) throw new HttpsError('failed-precondition', 'There must be at least one active admin.');
  }

  try {
    await getAuth().deleteUser(uid);
  } catch (err) {
    if (err.code !== 'auth/user-not-found') throw friendly(err);
  }

  const assigned = await db.collection('requests').where('assignedTo', '==', uid).get();
  const open = assigned.docs.filter((d) => d.get('status') !== 'done');
  for (let i = 0; i < open.length; i += 400) {
    const batch = db.batch();
    open.slice(i, i + 400).forEach((d) => batch.update(d.ref, { assignedTo: null, assignedToName: null, assignedBy: null, updatedAt: FieldValue.serverTimestamp() }));
    await batch.commit();
  }

  await ref.delete();
  logger.info('Admin deleted user', { uid, email: target.email, by: request.auth.uid, unassigned: open.length });
  return { ok: true, unassigned: open.length };
});
```

## `functions/mailer.js`

```js
// Sends email through the Resend API (https://resend.com) and keeps a small log in Firestore.
import { defineSecret, defineString } from 'firebase-functions/params';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

// Set with:  firebase functions:secrets:set RESEND_API_KEY
export const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
// Set in functions/.env — must be on a domain verified in Resend.
export const MAIL_FROM = defineString('MAIL_FROM', {
  default: 'Used Equipment <used-equipment@used.kcbobcat.com>',
});

const API = 'https://api.resend.com';

/**
 * Sends one or more emails in a single API call.
 * messages: [{ to: string[], subject, html, text }]
 * idempotencyKey: retries with the same key within 24h won't send twice.
 * Returns { ok, ids?, error? } — never throws, so a mail problem doesn't fail the caller.
 */
export async function sendEmails(messages, { idempotencyKey, type, ref } = {}) {
  const from = MAIL_FROM.value();
  const payload = messages.map((m) => ({
    from,
    to: m.to,
    subject: m.subject,
    html: m.html,
    text: m.text,
  }));
  const single = payload.length === 1;

  let result;
  try {
    const res = await fetch(`${API}/emails${single ? '' : '/batch'}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY.value()}`,
        'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey.slice(0, 256) } : {}),
      },
      body: JSON.stringify(single ? payload[0] : payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      result = {
        ok: false,
        error: `${res.status} ${body.name || ''} ${body.message || ''}`.trim(),
      };
    } else {
      const ids = single ? [body.id] : (body.data || []).map((d) => d.id);
      result = { ok: true, ids };
    }
  } catch (err) {
    result = { ok: false, error: err.message };
  }

  if (result.ok) logger.info('Email sent', { type, ref, count: payload.length });
  else logger.error('Email failed', { type, ref, error: result.error });

  // Lightweight audit trail (Firestore console → mailLog) for "did the alert go out?" questions.
  try {
    await getFirestore()
      .collection('mailLog')
      .add({
        type: type || null,
        ref: ref || null,
        to: payload.flatMap((p) => p.to),
        subject: payload[0]?.subject || null,
        ok: result.ok,
        resendIds: result.ids || [],
        error: result.error || null,
        createdAt: FieldValue.serverTimestamp(),
      });
  } catch (err) {
    logger.warn('Could not write mailLog', err);
  }

  return result;
}

/** Records an email that was deliberately NOT sent, so "why didn't I get it?" shows up in the app. */
export async function logSkipped({ type, ref, to = [], reason }) {
  logger.info('Email skipped', { type, ref, reason });
  try {
    await getFirestore().collection('mailLog').add({
      type: type || null,
      ref: ref || null,
      to,
      subject: null,
      ok: false,
      skipped: true,
      error: reason,
      resendIds: [],
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    logger.warn('Could not write mailLog', err);
  }
}
```

## `functions/package.json`

```json
{
  "name": "kcb-used-equipment-functions",
  "private": true,
  "type": "module",
  "main": "index.js",
  "engines": {
    "node": "22"
  },
  "scripts": {
    "serve": "firebase emulators:start --only functions",
    "deploy": "firebase deploy --only functions",
    "logs": "firebase functions:log"
  },
  "dependencies": {
    "archiver": "^7.0.1",
    "firebase-admin": "^14.5.0",
    "firebase-functions": "^7.4.0",
    "pdfjs-dist": "^5.7.284"
  }
}
```

## `functions/report-import.js`

```js
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
```

## `functions/scripts/create-admin.mjs`

```js
// One-time bootstrap: makes the first admin (everyone after that is added from the Users page).
//
//   cd functions
//   gcloud auth application-default login        # or: export GOOGLE_APPLICATION_CREDENTIALS=path/to/key.json
//   node scripts/create-admin.mjs --project YOUR-PROJECT-ID --email you@kcbobcat.com --name "Your Name"
//
// Prints a link to set the password. Running it again for the same email just makes sure they're an active admin.

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { randomBytes } from 'node:crypto';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    project: { type: 'string' },
    email: { type: 'string' },
    name: { type: 'string' },
  },
});

if (!values.project || !values.email || !values.name) {
  console.error('Usage: node scripts/create-admin.mjs --project PROJECT_ID --email EMAIL --name "Full Name"');
  process.exit(1);
}

initializeApp({ credential: applicationDefault(), projectId: values.project });
const auth = getAuth();
const db = getFirestore();
const email = values.email.trim().toLowerCase();

let user;
try {
  user = await auth.getUserByEmail(email);
  console.log(`Auth user already exists (${user.uid}).`);
} catch (err) {
  if (err.code !== 'auth/user-not-found') throw err;
  user = await auth.createUser({ email, displayName: values.name, password: randomBytes(24).toString('base64url') });
  console.log(`Created auth user ${user.uid}.`);
}

await db.doc(`users/${user.uid}`).set(
  {
    email,
    displayName: values.name,
    role: 'admin',
    active: true,
    notifyNewUnits: 'all',
    notifyLocations: [],
    notifyAssigned: true,
    createdAt: FieldValue.serverTimestamp(),
  },
  { merge: true },
);

const link = await auth.generatePasswordResetLink(email);
console.log(`\n${email} is an admin.\nSet the password here:\n\n${link}\n`);
process.exit(0);
```

## `functions/shared/report-parse.js`

```js
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
```

## `.github/workflows/firebase-hosting-merge.yml`

```yaml
# Deploys the site to Firebase Hosting (used.kcbobcat.com) on every push to main.
# Needs the repo secret FIREBASE_SERVICE_ACCOUNT (created by `firebase init hosting:github`,
# or paste a service-account JSON key with the "Firebase Hosting Admin" role).
name: Deploy to Firebase Hosting on merge

on:
  push:
    branches: [main]

jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          channelId: live
          projectId: ${{ vars.FIREBASE_PROJECT_ID }}
```

## `.github/workflows/firebase-hosting-pull-request.yml`

```yaml
# Builds every pull request and posts a temporary preview URL on the PR.
name: Deploy preview on PR

on: pull_request

permissions:
  checks: write
  contents: read
  pull-requests: write

jobs:
  build_and_preview:
    if: ${{ github.event.pull_request.head.repo.full_name == github.repository }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          projectId: ${{ vars.FIREBASE_PROJECT_ID }}
          expires: 7d
```

## `tests/import-parse.test.mjs`

```js
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
```

## `tests/report-import.test.mjs`

```js
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
```

## `tests/rules.test.js`

```js
// Security rules tests. Run with:  npm run test:rules
// (starts the Firestore + Storage emulators, runs these tests, shuts them down)

import { test, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';

let env;

const unit = (uid, extra = {}) => ({
  make: 'Bobcat', model: 'T76', year: 2021, hours: 1200, warehouse: 'Lenexa', ein: 'E1', serial: 'S1', serialKey: 'S1',
  condition: 'Good', price: null, attachments: '', photos: {}, status: 'active',
  createdBy: uid, createdByEmail: `${uid}@x.com`, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...extra,
});

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-used-equipment',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
    storage: { rules: readFileSync('storage.rules', 'utf8'), host: '127.0.0.1', port: 9199 },
  });
});
after(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/admin'), { email: 'a@x.com', role: 'admin', active: true });
    await setDoc(doc(db, 'users/emp'), { email: 'e@x.com', role: 'employee', active: true });
    await setDoc(doc(db, 'users/emp2'), { email: 'e2@x.com', role: 'employee', active: true });
    await setDoc(doc(db, 'users/gone'), { email: 'g@x.com', role: 'admin', active: false });
    await setDoc(doc(db, 'users/rep'), { email: 'rep@x.com', role: 'viewer', active: true });
    await setDoc(doc(db, 'equipment/u1'), { ...unit('emp'), createdAt: new Date(), updatedAt: new Date() });
  });
});

const db = (uid) => (uid ? env.authenticatedContext(uid, { email: `${uid}@x.com` }).firestore() : env.unauthenticatedContext().firestore());
const st = (uid) => (uid ? env.authenticatedContext(uid).storage() : env.unauthenticatedContext().storage());

test('signed-out and unknown users see nothing', async () => {
  await assertFails(getDoc(doc(db(null), 'equipment/u1')));
  await assertFails(getDoc(doc(db('stranger'), 'equipment/u1')));
  await assertFails(getDocs(collection(db('stranger'), 'equipment')));
  await assertFails(getDoc(doc(db('gone'), 'equipment/u1')));
});

test('active employee can read and submit, but only as themselves and as active', async () => {
  await assertSucceeds(getDocs(collection(db('emp'), 'equipment')));
  await assertSucceeds(setDoc(doc(db('emp'), 'equipment/new1'), unit('emp')));
  await assertFails(setDoc(doc(db('emp'), 'equipment/new2'), unit('admin')));
  await assertFails(setDoc(doc(db('emp'), 'equipment/new3'), unit('emp', { status: 'hidden' })));
  await assertFails(setDoc(doc(db('emp'), 'equipment/new4'), unit('emp', { serial: '' })));
});

test('submitter can edit details but not status; others cannot edit', async () => {
  await assertSucceeds(updateDoc(doc(db('emp'), 'equipment/u1'), { model: 'T86' }));
  await assertFails(updateDoc(doc(db('emp'), 'equipment/u1'), { status: 'hidden' }));
  await assertFails(updateDoc(doc(db('emp'), 'equipment/u1'), { createdBy: 'emp2' }));
  await assertFails(updateDoc(doc(db('emp2'), 'equipment/u1'), { model: 'T86' }));
});

test('admin can change status and delete; employees cannot delete', async () => {
  await assertSucceeds(updateDoc(doc(db('admin'), 'equipment/u1'), { status: 'archived' }));
  await assertFails(updateDoc(doc(db('admin'), 'equipment/u1'), { status: 'sold' }));
  await assertFails(deleteDoc(doc(db('emp'), 'equipment/u1')));
  await assertSucceeds(deleteDoc(doc(db('admin'), 'equipment/u1')));
});

test('users collection: active staff can read, never written from the client', async () => {
  await assertSucceeds(getDoc(doc(db('emp'), 'users/emp')));
  await assertSucceeds(getDoc(doc(db('emp'), 'users/emp2')));
  await assertFails(getDoc(doc(db('stranger'), 'users/emp2')));
  await assertSucceeds(getDocs(collection(db('admin'), 'users')));
  await assertFails(updateDoc(doc(db('emp'), 'users/emp'), { role: 'admin' }));
  const prefs = { notifyNewUnits: 'locations', notifyLocations: ['Lenexa'], notifyAssigned: true, notifyUpdatedAt: serverTimestamp() };
  await assertSucceeds(updateDoc(doc(db('emp'), 'users/emp'), prefs));
  await assertFails(updateDoc(doc(db('emp'), 'users/emp2'), prefs));
  await assertSucceeds(updateDoc(doc(db('admin'), 'users/emp2'), prefs));
  await assertFails(updateDoc(doc(db('emp'), 'users/emp'), { ...prefs, role: 'admin' }));
  await assertFails(updateDoc(doc(db('emp'), 'users/emp'), { ...prefs, notifyNewUnits: 'sometimes' }));
  await assertFails(updateDoc(doc(db('gone'), 'users/gone'), prefs));
  await assertFails(setDoc(doc(db('stranger'), 'users/stranger'), { role: 'admin', active: true }));
});

test('settings: everyone active reads, only admins write', async () => {
  await assertSucceeds(getDoc(doc(db('emp'), 'settings/app')));
  await assertFails(setDoc(doc(db('emp'), 'settings/app'), { warehouses: ['X'] }));
  await assertSucceeds(setDoc(doc(db('admin'), 'settings/app'), { warehouses: ['X'] }));
});

test('mailLog collection is closed to clients', async () => {
  await assertFails(setDoc(doc(db('admin'), 'mailLog/m1'), { to: ['x@y.com'] }));
  await assertSucceeds(getDocs(collection(db('admin'), 'mailLog')));
  await assertFails(getDocs(collection(db('emp'), 'mailLog')));
});

test('storage: active users upload images only; strangers cannot', async () => {
  const img = new Uint8Array([0xff, 0xd8, 0xff]);
  await assertSucceeds(uploadBytes(ref(st('emp'), 'equipment/u1/front-1.jpg'), img, { contentType: 'image/jpeg' }));
  await assertFails(uploadBytes(ref(st('emp'), 'equipment/u1/notes.txt'), img, { contentType: 'text/plain' }));
  await assertFails(uploadBytes(ref(st('stranger'), 'equipment/u1/front-2.jpg'), img, { contentType: 'image/jpeg' }));
  await assertFails(uploadBytes(ref(st('emp'), 'other/x.jpg'), img, { contentType: 'image/jpeg' }));
});

const req = (uid, extra = {}) => ({
  make: 'Bobcat', model: 'T76', serial: 'S9', serialKey: 'S9', ein: '', warehouse: '', notes: '', angles: ['front'],
  dueDate: null, status: 'open', equipmentId: null, completedAt: null, completedBy: null, completedByName: null,
  assignedTo: null, assignedToName: null, assignedBy: null,
  createdBy: uid, createdByEmail: `${uid}@x.com`, createdByName: uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...extra,
});

test('any active user can add photos to empty slots, but not replace or edit details', async () => {
  const photo = { path: 'equipment/u1/front-1.jpg', url: 'https://firebasestorage.googleapis.com/x' };
  const by = { updatedByEmail: 'emp2@x.com' };
  await assertSucceeds(updateDoc(doc(db('emp2'), 'equipment/u1'), { 'photos.front': photo, ...by }));
  await assertFails(updateDoc(doc(db('emp2'), 'equipment/u1'), { 'photos.front': { ...photo, path: 'equipment/u1/front-2.jpg' }, ...by }));
  await assertFails(updateDoc(doc(db('emp2'), 'equipment/u1'), { 'photos.interior': photo, model: 'X', ...by }));
  await assertFails(updateDoc(doc(db('emp2'), 'equipment/u1'), { 'photos.notASlot': photo, ...by }));
  await assertFails(updateDoc(doc(db('emp2'), 'equipment/u1'), { 'photos.interior': { ...photo, url: 'https://evil.example/x.png' }, ...by }));
  await assertFails(updateDoc(doc(db('emp2'), 'equipment/u1'), { 'photos.interior': { ...photo, path: 'equipment/OTHER/x.jpg' }, ...by }));
  await assertFails(updateDoc(doc(db('emp2'), 'equipment/u1'), { 'photos.interior': photo, updatedByEmail: 'someone@else.com' }));
  await assertFails(updateDoc(doc(db('stranger'), 'equipment/u1'), { 'photos.interior': photo }));
});

test('photo requests: create, check off by anyone, edit/delete by requester or admin', async () => {
  await assertSucceeds(setDoc(doc(db('emp'), 'requests/r1'), req('emp')));
  await assertFails(setDoc(doc(db('emp'), 'requests/r2'), req('emp2')));
  await assertFails(setDoc(doc(db('emp'), 'requests/r3'), req('emp', { serial: '', model: '', ein: '' })));
  await assertFails(setDoc(doc(db('stranger'), 'requests/r4'), req('stranger')));
  await assertSucceeds(setDoc(doc(db('emp'), 'requests/r5'), req('emp', { assignedTo: 'emp2', assignedToName: 'E2', assignedBy: 'emp' })));
  await assertFails(setDoc(doc(db('emp'), 'requests/r6'), req('emp', { assignedTo: 'ghost', assignedBy: 'emp' })));
  await assertFails(setDoc(doc(db('emp'), 'requests/r7'), req('emp', { assignedTo: 'emp2', assignedBy: 'admin' })));
  await assertFails(setDoc(doc(db('emp'), 'requests/r8'), req('emp', { equipmentId: 'nope' })));
  await assertFails(updateDoc(doc(db('emp2'), 'requests/r5'), { assignedTo: 'emp2', assignedBy: 'emp2' }));
  await assertSucceeds(getDocs(collection(db('emp'), 'users')));
  await assertFails(updateDoc(doc(db('emp2'), 'requests/r1'), { status: 'done', completedBy: 'emp', completedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(db('emp2'), 'requests/r1'), { status: 'done', completedBy: 'emp2', completedAt: serverTimestamp(), equipmentId: 'nope' }));
  await assertSucceeds(updateDoc(doc(db('emp2'), 'requests/r1'), { status: 'done', completedBy: 'emp2', completedAt: serverTimestamp(), equipmentId: 'u1' }));
  await assertFails(updateDoc(doc(db('emp2'), 'requests/r1'), { notes: 'changed' }));
  await assertSucceeds(updateDoc(doc(db('emp'), 'requests/r1'), { notes: 'changed' }));
  await assertFails(deleteDoc(doc(db('emp2'), 'requests/r1')));
  await assertSucceeds(deleteDoc(doc(db('admin'), 'requests/r1')));
});

test('viewers can look and ask for photos, but not change units or upload', async () => {
  await assertSucceeds(getDocs(collection(db('rep'), 'equipment')));
  await assertFails(setDoc(doc(db('rep'), 'equipment/v1'), unit('rep')));
  await assertFails(updateDoc(doc(db('rep'), 'equipment/u1'), {
    'photos.interior': { path: 'equipment/u1/interior-1.jpg', url: 'https://firebasestorage.googleapis.com/x' },
    updatedByEmail: 'rep@x.com',
  }));
  await assertSucceeds(setDoc(doc(db('rep'), 'requests/rv'), req('rep')));
  await assertSucceeds(setDoc(doc(db('emp'), 'requests/re'), req('emp')));
  await assertFails(updateDoc(doc(db('rep'), 'requests/re'), { status: 'done', completedBy: 'rep', completedAt: serverTimestamp() }));
  const img = new Uint8Array([0xff, 0xd8, 0xff]);
  await assertFails(uploadBytes(ref(st('rep'), 'equipment/u1/front-9.jpg'), img, { contentType: 'image/jpeg' }));
});

test('comments are saved with a unit, within a size limit', async () => {
  await assertSucceeds(setDoc(doc(db('emp'), 'equipment/c1'), unit('emp', { comments: 'Small dent on left door.' })));
  await assertFails(setDoc(doc(db('emp'), 'equipment/c2'), unit('emp', { comments: 'x'.repeat(5001) })));
});

const msg = (uid, extra = {}) => ({ text: 'Need a clearer hour-meter photo', kind: 'note', authorId: uid, authorName: uid, authorEmail: `${uid}@x.com`, createdAt: serverTimestamp(), ...extra });

test('messages on a unit: anyone active can write; only submitter/admin can mark done', async () => {
  await assertSucceeds(setDoc(doc(db('rep'), 'equipment/u1/messages/m1'), msg('rep', { kind: 'action' })));
  await assertSucceeds(setDoc(doc(db('emp'), 'equipment/u1/messages/m2'), msg('emp')));
  await assertFails(setDoc(doc(db('emp2'), 'equipment/u1/messages/m3'), msg('emp')));            // pretending to be someone else
  await assertFails(setDoc(doc(db('emp2'), 'equipment/u1/messages/m4'), msg('emp2', { text: '' }))); // empty note
  await assertFails(setDoc(doc(db('emp2'), 'equipment/u1/messages/m5'), msg('emp2', { kind: 'resolved', text: '' }))); // not the submitter
  await assertSucceeds(setDoc(doc(db('emp'), 'equipment/u1/messages/m6'), msg('emp', { kind: 'resolved', text: '' })));  // submitter
  await assertFails(setDoc(doc(db('emp'), 'equipment/u1/messages/m7'), msg('emp', { extra: 'x' })));
  await assertFails(updateDoc(doc(db('emp'), 'equipment/u1/messages/m2'), { text: 'edited' }));
  await assertFails(getDocs(collection(db('stranger'), 'equipment/u1/messages')));
  await assertFails(setDoc(doc(db('emp'), 'equipment/nope/messages/m8'), msg('emp')));             // unit doesn't exist
  await assertFails(updateDoc(doc(db('emp'), 'equipment/u1'), { followUp: { open: false } }));     // only the function sets it
  await assertSucceeds(updateDoc(doc(db('admin'), 'equipment/u1'), { followUp: { open: false } }));
});

test('users can clear their own must-change-password flag, but not set it or touch others', async () => {
  await assertSucceeds(updateDoc(doc(db('emp'), 'users/emp'), { mustChangePassword: false }));
  await assertFails(updateDoc(doc(db('emp'), 'users/emp'), { mustChangePassword: true }));
  await assertFails(updateDoc(doc(db('emp'), 'users/emp2'), { mustChangePassword: false }));
  await assertFails(updateDoc(doc(db('emp'), 'users/emp'), { mustChangePassword: false, role: 'admin' }));
});

test('private comments: hidden from viewers; only submitter/admin can write', async () => {
  const notes = (email) => ({ text: 'Needs new bucket teeth before sale', updatedAt: serverTimestamp(), updatedByEmail: email });
  await assertSucceeds(setDoc(doc(db('emp'), 'equipment/u1/private/notes'), notes('emp@x.com')));
  await assertSucceeds(getDoc(doc(db('emp2'), 'equipment/u1/private/notes')));
  await assertFails(getDoc(doc(db('rep'), 'equipment/u1/private/notes')));
  await assertFails(setDoc(doc(db('emp2'), 'equipment/u1/private/notes'), notes('emp2@x.com')));
  await assertSucceeds(setDoc(doc(db('admin'), 'equipment/u1/private/notes'), notes('admin@x.com')));
  await assertFails(setDoc(doc(db('emp'), 'equipment/u1/private/other'), notes('emp@x.com')));
});

test('request imports: extra fields validated; one import record per batch', async () => {
  await assertSucceeds(setDoc(doc(db('emp'), 'requests/i1'), req('emp', { year: 2024, hours: 399, importBatch: 'b1' })));
  await assertFails(setDoc(doc(db('emp'), 'requests/i2'), req('emp', { year: '2024' })));
  await assertSucceeds(setDoc(doc(db('emp'), 'requestImports/b1'), { count: 1, assignedTo: 'emp2', createdBy: 'emp', createdByName: 'E', createdAt: serverTimestamp() }));
  await assertFails(setDoc(doc(db('emp'), 'requestImports/b2'), { count: 1, assignedTo: 'ghost', createdBy: 'emp', createdByName: 'E', createdAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(db('emp'), 'requestImports/b1'), { count: 2 }));
});
```
