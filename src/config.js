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
