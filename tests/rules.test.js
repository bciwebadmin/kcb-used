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
