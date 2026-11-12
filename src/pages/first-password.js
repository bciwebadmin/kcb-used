// Shown after signing in with a temporary (emailed) password: the user must pick their own before continuing.
import { updatePassword, signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase.js';
import { h, passwordInput, checkNewPassword, MIN_PASSWORD } from '../ui.js';

export function renderFirstPassword({ user, profile }) {
  const next = passwordInput({ id: 'fp-new', autocomplete: 'new-password', placeholder: `At least ${MIN_PASSWORD} characters` });
  const confirm = passwordInput({ id: 'fp-confirm', autocomplete: 'new-password' });
  const msg = h('p', { class: 'form-msg', role: 'alert' });
  const btn = h('button', { type: 'submit', class: 'btn btn-primary btn-block' }, 'Save and continue');

  const form = h(
    'form',
    {
      class: 'login-card',
      onsubmit: async (e) => {
        e.preventDefault();
        msg.textContent = '';
        const problem = checkNewPassword(next.input.value, confirm.input.value);
        if (problem) {
          msg.textContent = problem;
          next.input.focus();
          return;
        }
        btn.disabled = true;
        btn.textContent = 'Saving…';
        try {
          await updatePassword(auth.currentUser, next.input.value);
          // Clearing the flag re-renders the app (main.js listens to the profile).
          await updateDoc(doc(db, 'users', user.uid), { mustChangePassword: false });
        } catch (err) {
          if (err.code === 'auth/requires-recent-login') {
            msg.textContent = 'For security, sign in again with your temporary password, then choose your new one.';
            setTimeout(() => signOut(auth), 2500);
          } else {
            msg.textContent = err.code === 'auth/weak-password' ? `Choose a stronger password (at least ${MIN_PASSWORD} characters).` : err.message;
          }
          btn.disabled = false;
          btn.textContent = 'Save and continue';
        }
      },
    },
    h('div', { class: 'login-brand' }, h('img', { src: '/kc-bobcat-logo.png', alt: 'K.C. Bobcat', class: 'login-logo', width: 500, height: 278 }), h('span', { class: 'login-sub' }, 'Choose your password')),
    h('p', { class: 'muted small' }, `Welcome${profile.displayName ? `, ${profile.displayName}` : ''}! You signed in with a temporary password. Choose your own to continue.`),
    h('label', { for: 'fp-new' }, 'New password'),
    next.wrap,
    h('label', { for: 'fp-confirm' }, 'Confirm new password'),
    confirm.wrap,
    msg,
    btn,
    h('button', { type: 'button', class: 'link-btn', onclick: () => signOut(auth) }, 'Sign out'),
  );
  return h('div', { class: 'login-screen' }, form);
}
