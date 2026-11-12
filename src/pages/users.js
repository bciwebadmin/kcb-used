import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase.js';
import { h, clear, icon, toast, fmtDate, confirmDialog, passwordInput, checkNewPassword, MIN_PASSWORD, mount, pager } from '../ui.js';
import { store } from '../store.js';
import { subscribeUsers, callCreateUser, callUpdateUser, callAdminPassword, callDeleteUser } from '../data.js';
import { notificationsDialog, notifySummary } from './notifications.js';
import { ROLES, roleLabel } from '../config.js';

export function renderUsers(page) {
  const me = store.get().user.uid;
  const tbody = h('tbody');
  const pageState = { page: 1 };
  let allUsers = [];
  const drawUsers = () => mount(clear(tbody), ...pg.slice(allUsers).map(row));
  const pg = pager(pageState, drawUsers, { noun: 'users' });
  const count = h('span', { class: 'muted small' });

  // ----- add user form -----
  const name = h('input', { id: 'nu-name', required: true, maxlength: 80, placeholder: 'Jane Smith', autocomplete: 'off' });
  const email = h('input', { id: 'nu-email', type: 'email', required: true, placeholder: 'jane@kcbobcat.com', autocomplete: 'off' });
  const role = h('select', { id: 'nu-role' }, ROLES.map((r) => h('option', { value: r.key, selected: r.key === 'employee', title: r.desc }, r.label)));
  const startPw = passwordInput({ id: 'nu-pw', autocomplete: 'new-password', placeholder: 'Leave blank to generate one', required: false });
  const addBtn = h('button', { type: 'submit', class: 'btn btn-primary' }, icon('plus'), h('span', {}, 'Add user'));
  const addMsg = h('p', { class: 'form-msg', role: 'alert' });

  const addForm = h(
    'form',
    {
      class: 'card',
      onsubmit: async (e) => {
        e.preventDefault();
        addMsg.textContent = '';
        addMsg.className = 'form-msg';
        if (!name.value.trim() || !email.value.trim()) {
          addMsg.textContent = 'Name and email are required.';
          return;
        }
        const pw = startPw.input.value;
        if (pw) {
          const problem = checkNewPassword(pw);
          if (problem) {
            addMsg.textContent = problem;
            startPw.input.focus();
            return;
          }
        }
        addBtn.disabled = true;
        try {
          const addr = email.value.trim();
          const res = await callCreateUser({ displayName: name.value.trim(), email: addr, role: role.value, password: pw || undefined });
          if (res.data.emailed) {
            addMsg.className = 'form-msg ok';
            addMsg.textContent = `Added. ${addr} has been emailed their login and temporary password — they’ll choose their own when they first sign in.`;
          } else {
            addMsg.className = 'form-msg';
            mount(clear(addMsg), 
              `Added, but the welcome email didn’t send (see Settings → Email). Give ${addr} this temporary password yourself: `,
              tempPasswordChip(res.data.tempPassword),
            );
          }
          name.value = '';
          email.value = '';
          role.value = 'employee';
          startPw.input.value = '';
        } catch (err) {
          addMsg.textContent = err.message;
        } finally {
          addBtn.disabled = false;
        }
      },
    },
    h('h2', { class: 'section-title' }, 'Add a user'),
    h('ul', { class: 'role-legend' }, ROLES.map((r) => h('li', {}, h('strong', {}, r.label), ` — ${r.desc}`))),
    h('p', { class: 'muted small' }, 'They’re emailed their login with a temporary password (yours, or a generated one if you leave it blank) and must choose their own the first time they sign in. Admins can manage users, change statuses, and archive or delete units. Admins start with emails for all new units; employees start with only photo-request emails — change it any time with “Edit” in the Email alerts column.'),
    h(
      'div',
      { class: 'form-grid add-user-grid' },
      h('div', { class: 'field' }, h('label', { for: 'nu-name' }, 'Name'), name),
      h('div', { class: 'field' }, h('label', { for: 'nu-email' }, 'Email'), email),
      h('div', { class: 'field' }, h('label', { for: 'nu-role' }, 'Role'), role),
      h('div', { class: 'field' }, h('label', { for: 'nu-pw' }, 'Starting password ', h('span', { class: 'optional' }, '(optional)')), startPw.wrap),
      h('div', { class: 'field field-btn' }, addBtn),
    ),
    addMsg,
  );

  mount(page, 
    h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Users'), h('p', { class: 'muted' }, 'Who can sign in, who is an admin, and what email notifications each person gets.'))),
    addForm,
    h(
      'section',
      { class: 'card table-card' },
      h('div', { class: 'section-head pad' }, h('h2', { class: 'section-title' }, 'All users'), count),
      h(
        'div',
        { class: 'table-scroll' },
        h(
          'table',
          { class: 'users-table' },
          h('thead', {}, h('tr', {}, h('th', {}, 'Name'), h('th', {}, 'Email'), h('th', {}, 'Role'), h('th', {}, 'Email alerts'), h('th', {}, 'Access'), h('th', {}, 'Added'), h('th', {}, ''))),
          tbody,
        ),
      ),
      pg.el,
    ),
  );

  // `revert` puts the control back if the server refuses the change.
  async function change(u, patch, label, revert) {
    try {
      await callUpdateUser({ uid: u.uid, ...patch });
      toast(label);
    } catch (err) {
      revert?.();
      toast(err.message, 'error');
    }
  }

  function row(u) {
    const self = u.uid === me;
    return h(
      'tr',
      { class: u.active ? '' : 'inactive' },
      h('td', { 'data-label': 'Name', class: 'u-name' }, h('strong', {}, u.displayName || '—'), self ? h('span', { class: 'pill sm' }, 'You') : null, u.mustChangePassword ? h('span', { class: 'pill sm', title: 'Hasn’t chosen their own password yet' }, 'Temp password') : null),
      h('td', { 'data-label': 'Email', class: 'u-email' }, u.email),
      h(
        'td',
        { 'data-label': 'Role', class: 'u-role' },
        h(
          'select',
          {
            disabled: self,
            title: self ? 'You can’t change your own role' : null,
            onchange: (e) => change(u, { role: e.target.value }, `${u.email} is now ${roleLabel(e.target.value)}`, () => (e.target.value = u.role || 'employee')),
          },
          ROLES.map((r) => h('option', { value: r.key, selected: r.key === (u.role || 'employee'), title: r.desc }, r.label)),
        ),
      ),
      h(
        'td',
        { 'data-label': 'Email alerts', class: 'u-alerts' },
        h(
          'button',
          { class: 'alerts-btn', title: 'Edit email notifications', onclick: () => notificationsDialog(u) },
          h('span', { class: 'small' }, notifySummary(u)),
          h('span', { class: 'link-btn small' }, 'Edit'),
        ),
      ),
      h(
        'td',
        { 'data-label': 'Access', class: 'u-access' },
        h(
          'label',
          { class: 'switch' },
          h('input', {
            type: 'checkbox',
            checked: u.active,
            disabled: self,
            onchange: async (e) => {
              if (!e.target.checked) {
                const ok = await confirmDialog({ title: `Deactivate ${u.displayName || u.email}?`, message: 'They’ll be signed out and won’t be able to sign in until reactivated. Their submissions stay.', confirmLabel: 'Deactivate', danger: true });
                if (!ok) {
                  e.target.checked = true;
                  return;
                }
              }
              change(u, { active: e.target.checked }, e.target.checked ? 'User reactivated' : 'User deactivated', () => (e.target.checked = u.active));
            },
          }),
          h('span', {}, u.active ? 'Active' : 'Disabled'),
        ),
      ),
      h('td', { 'data-label': 'Added', class: 'u-added' }, fmtDate(u.createdAt)),
      h(
        'td',
        { class: 'col-actions u-actions' },
        self
          ? h('a', { href: '#/account', class: 'btn btn-ghost btn-sm' }, icon('key'), h('span', {}, 'Change mine'))
          : h(
              'span',
              { class: 'row-actions' },
              h('button', { class: 'btn btn-ghost btn-sm', onclick: () => passwordDialog(u) }, icon('key'), h('span', {}, 'Password')),
              h('button', { class: 'icon-btn danger', title: `Delete ${u.displayName || u.email}`, 'aria-label': `Delete ${u.displayName || u.email}`, onclick: () => removeUser(u) }, icon('trash')),
            ),
      ),
    );
  }

  async function removeUser(u) {
    const who = u.displayName || u.email;
    const ok = await confirmDialog({
      title: `Delete ${who}?`,
      message: `This permanently removes ${u.email}’s login. Units, photos and messages they added stay (with their name), and any open photo requests assigned to them become unassigned. To keep the account but block sign-in, turn off Access instead.`,
      confirmLabel: 'Delete user',
      danger: true,
    });
    if (!ok) return;
    try {
      const { data } = await callDeleteUser({ uid: u.uid });
      toast(`${who} deleted${data.unassigned ? ` — ${data.unassigned} open request${data.unassigned === 1 ? '' : 's'} unassigned` : ''}`);
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  // ----- password dialog: email a link, copy a link, or set it directly -----
  function passwordDialog(u) {
    const who = u.displayName || u.email;
    const linkOut = h('div', { class: 'link-out', hidden: true });
    const setPw = passwordInput({ id: 'ap-new', autocomplete: 'new-password', placeholder: `At least ${MIN_PASSWORD} characters` });
    const setPw2 = passwordInput({ id: 'ap-confirm', autocomplete: 'new-password' });
    const setMsg = h('p', { class: 'form-msg', role: 'alert' });

    const emailBtn = h(
      'button',
      {
        type: 'button',
        class: 'btn btn-ghost',
        onclick: async () => {
          emailBtn.disabled = true;
          try {
            await sendPasswordResetEmail(auth, u.email, { url: location.origin });
            toast(`Reset link emailed to ${u.email}`);
          } catch (err) {
            toast(err.message, 'error');
          } finally {
            emailBtn.disabled = false;
          }
        },
      },
      'Email reset link',
    );

    const copyBtn = h(
      'button',
      {
        type: 'button',
        class: 'btn btn-ghost',
        onclick: async () => {
          copyBtn.disabled = true;
          try {
            const { data } = await callAdminPassword({ uid: u.uid, action: 'link' });
            const field = h('input', { type: 'text', readonly: true, value: data.link, 'aria-label': 'Reset link', onfocus: (e) => e.target.select() });
            const copy = async () => {
              try {
                await navigator.clipboard.writeText(data.link);
                toast('Link copied');
              } catch {
                field.select();
                toast('Press Ctrl+C to copy', 'error');
              }
            };
            mount(clear(linkOut), 
              h('div', { class: 'link-row' }, field, h('button', { type: 'button', class: 'btn btn-primary btn-sm', onclick: copy }, icon('copy'), h('span', {}, 'Copy'))),
              h('p', { class: 'muted small' }, 'Send this to them however you like (text, Teams). It works once and expires in about an hour.'),
            );
            linkOut.hidden = false;
            copy();
          } catch (err) {
            toast(err.message, 'error');
          } finally {
            copyBtn.disabled = false;
          }
        },
      },
      'Get a link to copy',
    );

    const saveBtn = h('button', { type: 'submit', class: 'btn btn-primary' }, 'Set password');
    const emailIt = h('input', { type: 'checkbox', checked: true });
    const genBtn = h(
      'button',
      {
        type: 'button',
        class: 'btn btn-ghost',
        onclick: async () => {
          genBtn.disabled = true;
          setMsg.className = 'form-msg';
          setMsg.textContent = '';
          try {
            const { data } = await callAdminPassword({ uid: u.uid, action: 'set', generate: true });
            if (data.emailed) {
              toast(`Temporary password emailed to ${u.email}`);
              dlg.close();
            } else {
              mount(clear(setMsg), 'Password changed, but the email didn’t send. Give them this temporary password: ', tempPasswordChip(data.tempPassword));
            }
          } catch (err) {
            setMsg.textContent = err.message;
          } finally {
            genBtn.disabled = false;
          }
        },
      },
      'Email a new temporary password',
    );
    const setForm = h(
      'form',
      {
        class: 'stack',
        onsubmit: async (e) => {
          e.preventDefault();
          setMsg.className = 'form-msg';
          setMsg.textContent = '';
          const problem = checkNewPassword(setPw.input.value, setPw2.input.value);
          if (problem) {
            setMsg.textContent = problem;
            return;
          }
          saveBtn.disabled = true;
          try {
            const { data } = await callAdminPassword({ uid: u.uid, action: 'set', password: setPw.input.value, email: emailIt.checked });
            if (emailIt.checked && !data.emailed) {
              setMsg.textContent = 'Password changed, but the email didn’t send — give it to them yourself.';
              return;
            }
            toast(emailIt.checked ? `Password changed and emailed to ${u.email}` : `Password changed for ${who}`);
            dlg.close();
          } catch (err) {
            setMsg.textContent = err.message;
          } finally {
            saveBtn.disabled = false;
          }
        },
      },
      h('div', { class: 'field' }, h('label', { for: 'ap-new' }, 'New password'), setPw.wrap),
      h('div', { class: 'field' }, h('label', { for: 'ap-confirm' }, 'Confirm new password'), setPw2.wrap),
      h('label', { class: 'check-inline' }, emailIt, h('span', {}, 'Email it to them (they’ll choose their own at next sign-in)')),
      setMsg,
      h('p', { class: 'muted small' }, 'They’ll be signed out everywhere and need the new password to get back in.'),
      h('div', { class: 'dialog-actions' }, saveBtn),
    );

    const dlg = h(
      'dialog',
      { class: 'dialog dialog-wide' },
      h('div', { class: 'dialog-head' }, h('h3', {}, `Password for ${who}`), h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Close', onclick: () => dlg.close() }, icon('x'))),
      h('p', { class: 'muted small' }, u.email),
      h('section', { class: 'dlg-section' }, h('h4', {}, 'Send a temporary password'), h('p', { class: 'muted small' }, 'Generates one, emails it with their login, and has them choose their own when they sign in.'), h('div', { class: 'btn-row' }, genBtn)),
      h('section', { class: 'dlg-section' }, h('h4', {}, 'Or send a reset link'), h('p', { class: 'muted small' }, 'They choose their own new password.'), h('div', { class: 'btn-row' }, emailBtn, copyBtn), linkOut),
      h('section', { class: 'dlg-section' }, h('h4', {}, 'Or set it yourself'), setForm),
    );
    dlg.addEventListener('close', () => dlg.remove());
    document.body.append(dlg);
    dlg.showModal();
  }

  const unsub = subscribeUsers(
    (users) => {
      count.textContent = `${users.length} user${users.length === 1 ? '' : 's'} · ${ROLES.map((r) => `${users.filter((u) => (u.role || 'employee') === r.key).length} ${r.label.toLowerCase()}`).join(' · ')}`;
      allUsers = users;
      drawUsers();
    },
    (err) => toast(`Couldn't load users: ${err.message}`, 'error'),
  );
  return unsub;
}

/** Shows a temporary password with a copy button (only used when the email didn't go out). */
function tempPasswordChip(pw) {
  if (!pw) return '';
  return h(
    'span',
    { class: 'temp-pw' },
    h('code', {}, pw),
    h(
      'button',
      {
        type: 'button',
        class: 'link-btn',
        onclick: async () => {
          try {
            await navigator.clipboard.writeText(pw);
            toast('Copied');
          } catch {
            toast('Select it and press Ctrl+C', 'error');
          }
        },
      },
      'Copy',
    ),
  );
}
