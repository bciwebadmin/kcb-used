import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { auth } from '../firebase.js';
import { h, toast, passwordInput, checkNewPassword, MIN_PASSWORD, mount } from '../ui.js';
import { store } from '../store.js';
import { notificationsForm } from './notifications.js';
import { roleLabel } from '../config.js';

const messages = {
  'auth/invalid-credential': 'Your current password is incorrect.',
  'auth/wrong-password': 'Your current password is incorrect.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/weak-password': `Choose a stronger password (at least ${MIN_PASSWORD} characters).`,
  'auth/network-request-failed': 'Network error — check your connection and try again.',
};

export function renderAccount(page) {
  const { user, profile } = store.get();

  const current = passwordInput({ id: 'pw-current', autocomplete: 'current-password' });
  const next = passwordInput({ id: 'pw-new', autocomplete: 'new-password', placeholder: `At least ${MIN_PASSWORD} characters` });
  const confirm = passwordInput({ id: 'pw-confirm', autocomplete: 'new-password' });
  const msg = h('p', { class: 'form-msg', role: 'alert' });
  const btn = h('button', { type: 'submit', class: 'btn btn-primary' }, 'Change password');

  const form = h(
    'form',
    {
      class: 'card narrow-left',
      onsubmit: async (e) => {
        e.preventDefault();
        msg.className = 'form-msg';
        msg.textContent = '';
        if (!current.input.value) {
          msg.textContent = 'Enter your current password.';
          current.input.focus();
          return;
        }
        const problem = checkNewPassword(next.input.value, confirm.input.value);
        if (problem) {
          msg.textContent = problem;
          next.input.focus();
          return;
        }
        if (next.input.value === current.input.value) {
          msg.textContent = 'The new password is the same as your current one.';
          return;
        }
        btn.disabled = true;
        btn.textContent = 'Saving…';
        try {
          // Firebase requires a recent sign-in before changing a password, so confirm the current one first.
          await reauthenticateWithCredential(auth.currentUser, EmailAuthProvider.credential(user.email, current.input.value));
          await updatePassword(auth.currentUser, next.input.value);
          form.reset();
          msg.className = 'form-msg ok';
          msg.textContent = 'Password changed. Use the new password next time you sign in.';
          toast('Password changed');
        } catch (err) {
          msg.textContent = messages[err.code] || err.message;
        } finally {
          btn.disabled = false;
          btn.textContent = 'Change password';
        }
      },
    },
    h('h2', { class: 'section-title' }, 'Change password'),
    h(
      'div',
      { class: 'stack' },
      h('div', { class: 'field' }, h('label', { for: 'pw-current' }, 'Current password'), current.wrap),
      h('div', { class: 'field' }, h('label', { for: 'pw-new' }, 'New password'), next.wrap),
      h('div', { class: 'field' }, h('label', { for: 'pw-confirm' }, 'Confirm new password'), confirm.wrap),
    ),
    msg,
    h('div', { class: 'form-actions-row' }, btn),
  );

  mount(page, 
    h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'My account'))),
    h(
      'section',
      { class: 'card narrow-left' },
      h(
        'dl',
        { class: 'specs flush' },
        h('div', { class: 'spec' }, h('dt', {}, 'Name'), h('dd', {}, profile.displayName || '—')),
        h('div', { class: 'spec' }, h('dt', {}, 'Email'), h('dd', {}, user.email)),
        h('div', { class: 'spec' }, h('dt', {}, 'Role'), h('dd', {}, roleLabel(profile.role))),
      ),
    ),
    notificationsForm({ ...profile, uid: user.uid, email: user.email }),
    form,
  );
}
