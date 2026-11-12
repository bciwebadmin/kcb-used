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
