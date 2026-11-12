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
