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
