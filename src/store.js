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
