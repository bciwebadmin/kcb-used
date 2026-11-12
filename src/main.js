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
