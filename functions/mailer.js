// Sends email through the Resend API (https://resend.com) and keeps a small log in Firestore.
import { defineSecret, defineString } from 'firebase-functions/params';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

// Set with:  firebase functions:secrets:set RESEND_API_KEY
export const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
// Set in functions/.env — must be on a domain verified in Resend.
export const MAIL_FROM = defineString('MAIL_FROM', {
  default: 'Used Equipment <used-equipment@used.kcbobcat.com>',
});

const API = 'https://api.resend.com';

/**
 * Sends one or more emails in a single API call.
 * messages: [{ to: string[], subject, html, text }]
 * idempotencyKey: retries with the same key within 24h won't send twice.
 * Returns { ok, ids?, error? } — never throws, so a mail problem doesn't fail the caller.
 */
export async function sendEmails(messages, { idempotencyKey, type, ref } = {}) {
  const from = MAIL_FROM.value();
  const payload = messages.map((m) => ({
    from,
    to: m.to,
    subject: m.subject,
    html: m.html,
    text: m.text,
  }));
  const single = payload.length === 1;

  let result;
  try {
    const res = await fetch(`${API}/emails${single ? '' : '/batch'}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY.value()}`,
        'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey.slice(0, 256) } : {}),
      },
      body: JSON.stringify(single ? payload[0] : payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      result = {
        ok: false,
        error: `${res.status} ${body.name || ''} ${body.message || ''}`.trim(),
      };
    } else {
      const ids = single ? [body.id] : (body.data || []).map((d) => d.id);
      result = { ok: true, ids };
    }
  } catch (err) {
    result = { ok: false, error: err.message };
  }

  if (result.ok) logger.info('Email sent', { type, ref, count: payload.length });
  else logger.error('Email failed', { type, ref, error: result.error });

  // Lightweight audit trail (Firestore console → mailLog) for "did the alert go out?" questions.
  try {
    await getFirestore()
      .collection('mailLog')
      .add({
        type: type || null,
        ref: ref || null,
        to: payload.flatMap((p) => p.to),
        subject: payload[0]?.subject || null,
        ok: result.ok,
        resendIds: result.ids || [],
        error: result.error || null,
        createdAt: FieldValue.serverTimestamp(),
      });
  } catch (err) {
    logger.warn('Could not write mailLog', err);
  }

  return result;
}

/** Records an email that was deliberately NOT sent, so "why didn't I get it?" shows up in the app. */
export async function logSkipped({ type, ref, to = [], reason }) {
  logger.info('Email skipped', { type, ref, reason });
  try {
    await getFirestore().collection('mailLog').add({
      type: type || null,
      ref: ref || null,
      to,
      subject: null,
      ok: false,
      skipped: true,
      error: reason,
      resendIds: [],
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    logger.warn('Could not write mailLog', err);
  }
}
