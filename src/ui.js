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

/**
 * iPhone/iPad: photos are already downloaded; this asks the user to tap once more, because iOS only opens the
 * share sheet straight from a tap (not after waiting on the network). "Save Image(s)" there puts them in Photos.
 * Without the share sheet (very old iOS), each photo gets its own link that saves it to Files → Downloads.
 */
export function savePhotosDialog(files, { title = 'Photos' } = {}) {
  const n = files.length;
  const urls = [];
  const canShare = !!navigator.canShare?.({ files });
  const close = () => dlg.close();
  const share = async () => {
    try {
      await navigator.share({ files });
      close();
    } catch (err) {
      if (err.name !== 'AbortError') toast(`Couldn’t open the share sheet: ${err.message}`, 'error'); // AbortError = user cancelled
    }
  };
  const links = () =>
    h(
      'ul',
      { class: 'save-links' },
      ...files.map((f) => {
        const url = URL.createObjectURL(f);
        urls.push(url);
        return h('li', {}, h('a', { href: url, download: f.name }, icon('download'), h('span', {}, f.name)));
      }),
    );
  const dlg = h(
    'dialog',
    { class: 'dialog dialog-wide save-sheet' },
    h('div', { class: 'dialog-head' }, h('h3', {}, title), h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Close', onclick: close }, icon('x'))),
    canShare
      ? h('p', {}, `${n === 1 ? 'Photo is' : `${n} photos are`} ready. Tap below, then choose “Save ${n === 1 ? 'Image' : `${n} Images`}” to put ${n === 1 ? 'it' : 'them'} in Photos — or “Save to Files”.`)
      : h('p', {}, `Tap ${n === 1 ? 'the photo' : 'each photo'} to save it to Files → Downloads.`),
    canShare ? h('div', { class: 'dialog-actions' }, h('button', { class: 'btn btn-primary btn-block', autofocus: true, onclick: share }, icon('image'), h('span', {}, n === 1 ? 'Save photo' : `Save ${n} photos`))) : links(),
  );
  dlg.addEventListener('close', () => {
    dlg.remove();
    urls.forEach((u) => URL.revokeObjectURL(u));
  });
  document.body.append(dlg);
  dlg.showModal();
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
