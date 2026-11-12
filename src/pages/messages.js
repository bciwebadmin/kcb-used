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
