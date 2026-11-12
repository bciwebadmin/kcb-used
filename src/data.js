import {
  collection, doc, onSnapshot, query, orderBy, where, getDocs, setDoc, updateDoc,
  deleteDoc, serverTimestamp, getDoc, limit, writeBatch, deleteField,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { db, storage, functions, auth } from './firebase.js';
import { PHOTO_SLOTS, COVER_SLOT, THUMB_MAX, DEFAULT_WAREHOUSES } from './config.js';
import { store } from './store.js';
import { h, toast, savePhotosDialog } from './ui.js';

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

// iPhone/iPad: every iOS browser (Safari, Chrome, Edge…) is Safari underneath, and it silently ignores a file
// sent to a hidden frame — so the form-post above does nothing there. Instead we fetch the photos from the same
// /api/download endpoint and hand them to the share sheet, where "Save Image(s)" puts them in the Photos app.
// (iPadOS reports itself as a Mac; the touch-point check catches it.)
export const IS_IOS = /iP(hone|od|ad)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

async function fetchDownload(fields) {
  const token = await auth.currentUser.getIdToken();
  let res;
  try {
    res = await fetch('/api/download', { method: 'POST', body: new URLSearchParams({ token, ...fields }) });
  } catch {
    // Plain wording on purpose: "Load failed" would trip the old CORS fallback in detail.js.
    throw new Error('Couldn’t reach the server — check your connection and try again.');
  }
  if (!res.ok) {
    const text = (await res.text().catch(() => '')).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    throw new Error(text || `The server answered ${res.status}.`);
  }
  return res.blob();
}

async function fetchPhotoFile(eq, slot) {
  const photo = eq.photos[slot.key];
  const blob = await fetchDownload({ id: eq.id, slot: slot.key });
  return new File([blob], photoFileName(eq, slot, photo), { type: blob.type || 'image/jpeg' });
}

export async function downloadPhoto(eq, slotKey) {
  if (!eq.photos?.[slotKey]) return;
  if (!IS_IOS) return postDownload({ id: eq.id, slot: slotKey });
  const slot = PHOTO_SLOTS.find((s) => s.key === slotKey);
  toast('Getting photo…');
  savePhotosDialog([await fetchPhotoFile(eq, slot)], { title: slot.label });
}

export async function downloadAllPhotos(eq, onProgress) {
  const slots = PHOTO_SLOTS.filter((s) => eq.photos?.[s.key]);
  onProgress?.(0, slots.length);
  if (!IS_IOS) return postDownload({ id: eq.id });
  // One photo at a time, three in flight, kept in slot order.
  const files = new Array(slots.length);
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < slots.length) {
      const i = next++;
      files[i] = await fetchPhotoFile(eq, slots[i]);
      onProgress?.(++done, slots.length);
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  savePhotosDialog(files, { title: [eq.year, eq.make, eq.model].filter(Boolean).join(' ') || 'Photos' });
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
