import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase.js';
import { h, passwordInput } from '../ui.js';

const messages = {
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/invalid-email': 'That email address doesn’t look right.',
  'auth/user-disabled': 'This account has been disabled. Ask an admin to reactivate it.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes or reset your password.',
  'auth/network-request-failed': 'Network error — check your connection and try again.',
};

export function renderLogin() {
  const email = h('input', { type: 'email', id: 'email', autocomplete: 'username', required: true });
  const password = passwordInput({ id: 'password', autocomplete: 'current-password' });
  const msg = h('p', { class: 'form-msg', role: 'alert' });
  const submit = h('button', { type: 'submit', class: 'btn btn-primary btn-block' }, 'Sign in');

  const form = h(
    'form',
    {
      class: 'login-card',
      onsubmit: async (e) => {
        e.preventDefault();
        msg.className = 'form-msg';
        msg.textContent = '';
        submit.disabled = true;
        submit.textContent = 'Signing in…';
        try {
          await signInWithEmailAndPassword(auth, email.value.trim(), password.input.value);
        } catch (err) {
          msg.textContent = messages[err.code] || err.message;
          submit.disabled = false;
          submit.textContent = 'Sign in';
        }
      },
    },
    h(
      'div',
      { class: 'login-brand' },
      h('img', { src: '/kc-bobcat-logo.png', alt: 'K.C. Bobcat', class: 'login-logo', width: 500, height: 278 }),
      h('span', { class: 'login-sub' }, 'Used Equipment Dashboard'),
    ),
    h('label', { for: 'email' }, 'Email'),
    email,
    h('label', { for: 'password' }, 'Password'),
    password.wrap,
    msg,
    submit,
    h(
      'button',
      {
        type: 'button',
        class: 'link-btn',
        onclick: async () => {
          msg.className = 'form-msg';
          msg.textContent = '';
          const addr = email.value.trim();
          if (!addr) {
            msg.textContent = 'Enter your email above, then click “Forgot password?” again.';
            email.focus();
            return;
          }
          try {
            await sendPasswordResetEmail(auth, addr, { url: location.origin });
          } catch (err) {
            // Only hide "no such account" (so the form doesn't reveal who has one); show real problems.
            if (err.code !== 'auth/user-not-found') {
              msg.textContent =
                err.code === 'auth/unauthorized-continue-uri'
                  ? `Password reset isn’t set up for ${location.hostname} yet — ask an admin to add it to Firebase Auth’s authorized domains.`
                  : messages[err.code] || err.message;
              return;
            }
          }
          msg.className = 'form-msg ok';
          msg.textContent = `If ${addr} has an account, a password reset link is on its way.`;
        },
      },
      'Forgot password?',
    ),
  );

  return h('div', { class: 'login-screen' }, form, h('p', { class: 'login-foot' }, 'Accounts are created by an admin. Need access? Contact your manager.'));
}
