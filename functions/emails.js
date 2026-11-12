// HTML email templates for the Trigger Email extension ({ subject, html, text }).

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const SLOT_ORDER = [
  ['rightFront', 'Right Front'],
  ['leftFront', 'Left Front'],
  ['front', 'Front'],
  ['rightSide', 'Right Side'],
  ['leftSide', 'Left Side'],
  ['rightSideRear', 'Right Side Rear'],
  ['leftRear', 'Left Rear'],
  ['rearEngine', 'Rear Engine'],
  ['interior', 'Interior'],
  ['hourMeter', 'Hour Meter'],
  ['serialPlate', 'Serial Plate'],
];

// Logo is served by the site itself; set APP_URL in functions/.env.
const LOGO_URL = `${(process.env.APP_URL || 'https://used.kcbobcat.com').replace(/\/$/, '')}/kc-bobcat-logo.png`;

function shell(title, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#f2f2f2;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#000000;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f2;padding:24px 0;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e0e0e0;">
<tr><td style="background:#ffffff;border-bottom:4px solid #ff3300;padding:16px 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td valign="middle"><img src="${LOGO_URL}" alt="K.C. Bobcat" width="120" style="width:120px;height:auto;display:block;"></td>
<td valign="middle" align="right" style="color:#666666;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Used Equipment</td>
</tr></table></td></tr>
<tr><td style="padding:24px;">
<h1 style="margin:0 0 12px;font-size:20px;">${esc(title)}</h1>
${body}
</td></tr></table>
<p style="color:#999999;font-size:12px;margin:12px 0 0;">Sent automatically by the used equipment dashboard.</p>
</td></tr></table></body></html>`;
}

function button(href, label) {
  return `<a href="${esc(href)}" style="display:inline-block;background:#ff3300;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:6px;">${esc(label)}</a>`;
}

export function newSubmissionEmail({ eq, link }) {
  const title = `${eq.year ? `${eq.year} ` : ''}${eq.make} ${eq.model}`;
  const rows = [
    ['Warehouse', eq.warehouse],
    ['EIN', eq.ein],
    ['Serial #', eq.serial],
    ['Hours', eq.hours != null ? Number(eq.hours).toLocaleString('en-US') : null],
    ['Condition', eq.condition],
    ['Price', eq.price != null ? `$${Number(eq.price).toLocaleString('en-US')}` : null],
    ['Attachments', eq.attachments],
    ['Public comments', eq.comments],
    ['Submitted by', eq.createdByName || eq.createdByEmail],
  ].filter(([, v]) => v !== null && v !== undefined && v !== '');

  const photos = SLOT_ORDER.map(([k, label]) => ({ label, p: eq.photos?.[k] })).filter((x) => x.p);
  // Only embed images hosted in Firebase Storage (no outside tracking pixels).
  const storageUrl = (u) => typeof u === 'string' && u.startsWith('https://firebasestorage.googleapis.com/');
  const thumbs = photos
    .map(({ label, p }) => ({ label, src: [p.thumbUrl, p.url].find(storageUrl) }))
    .filter((x) => x.src)
    .slice(0, 4)
    .map(({ label, src }) => `<td style="padding:4px;width:25%;" valign="top"><img src="${esc(src)}" alt="${esc(label)}" width="130" style="width:100%;max-width:130px;height:auto;border-radius:4px;display:block;"><div style="font-size:11px;color:#666666;margin-top:2px;">${esc(label)}</div></td>`)
    .join('');

  const html = shell(
    `New unit submitted: ${title}`,
    `<p style="margin:0 0 16px;color:#333333;">${photos.length ? `${photos.length} of ${SLOT_ORDER.length} photos uploaded and ready to review or download.` : 'No photos were uploaded with this unit yet.'}</p>
${thumbs ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;"><tr>${thumbs}</tr></table>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;font-size:14px;">
${rows.map(([k, v]) => `<tr><td style="padding:6px 0;color:#666666;border-bottom:1px solid #eeeeee;width:130px;">${esc(k)}</td><td style="padding:6px 0;border-bottom:1px solid #eeeeee;font-weight:600;">${esc(v)}</td></tr>`).join('')}
</table>
${button(link, 'View unit & download photos')}`,
  );

  const text = [
    `New unit submitted: ${title}`,
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    `Photos: ${photos.length} of ${SLOT_ORDER.length}`,
    '',
    `View and download photos: ${link}`,
  ].join('\n');

  return { subject: `New used unit: ${title} (Serial ${eq.serial})`, html, text };
}

function credentialsBox(email, password) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#f2f2f2;border-radius:6px;width:100%;">
<tr><td style="padding:12px 14px 4px;color:#666666;font-size:13px;">Email</td></tr>
<tr><td style="padding:0 14px 10px;font-weight:700;font-size:15px;">${esc(email)}</td></tr>
<tr><td style="padding:4px 14px 4px;color:#666666;font-size:13px;">Temporary password</td></tr>
<tr><td style="padding:0 14px 14px;font-weight:700;font-size:18px;font-family:Consolas,Menlo,monospace;letter-spacing:1px;">${esc(password)}</td></tr>
</table>`;
}

export function welcomeEmail({ displayName, role, email, password, appUrl, invitedBy }) {
  const site = appUrl.replace(/^https?:\/\//, '');
  const roleHtml = role === 'admin' ? 'an <strong>admin</strong>' : role === 'viewer' ? 'a <strong>viewer</strong> (view and download only)' : 'an <strong>employee</strong>';
  const html = shell(
    `Welcome, ${displayName}`,
    `<p style="margin:0 0 12px;color:#333333;">${esc(invitedBy)} added you to the K.C. Bobcat used equipment dashboard as ${roleHtml}. Here’s how to sign in:</p>
${credentialsBox(email, password)}
${button(appUrl, 'Sign in')}
<p style="margin:20px 0 0;color:#666666;font-size:13px;">You’ll be asked to choose your own password the first time you sign in. Site: <a href="${esc(appUrl)}" style="color:#cc2900;">${esc(site)}</a></p>`,
  );
  const text = `Welcome, ${displayName}\n\n${invitedBy} added you to the K.C. Bobcat used equipment dashboard.\n\nSign in at ${appUrl}\nEmail: ${email}\nTemporary password: ${password}\n\nYou'll be asked to choose your own password the first time you sign in.`;
  return { subject: 'Your K.C. Bobcat used equipment login', html, text };
}

export function passwordEmail({ displayName, email, password, appUrl, setBy }) {
  const html = shell(
    'Your password was reset',
    `<p style="margin:0 0 12px;color:#333333;">Hi ${esc(displayName)}, ${esc(setBy)} reset your password for the K.C. Bobcat used equipment dashboard.</p>
${credentialsBox(email, password)}
${button(appUrl, 'Sign in')}
<p style="margin:20px 0 0;color:#666666;font-size:13px;">You’ll be asked to choose a new password when you sign in. If you didn’t expect this, tell your manager.</p>`,
  );
  const text = `Hi ${displayName},\n\n${setBy} reset your password for the K.C. Bobcat used equipment dashboard.\n\nSign in at ${appUrl}\nEmail: ${email}\nTemporary password: ${password}\n\nYou'll be asked to choose a new password when you sign in.`;
  return { subject: 'Your K.C. Bobcat used equipment password was reset', html, text };
}

export function assignmentEmail({ req, assigneeName, assignedByName, uploadLink, listLink }) {
  const title = [req.make, req.model].filter(Boolean).join(' ') || 'a unit';
  const angles = req.angles?.length
    ? req.angles.map((k) => SLOT_ORDER.find(([key]) => key === k)?.[1] || k).join(', ')
    : 'All angles';
  const due = req.dueDate
    ? new Date(`${req.dueDate}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : null;
  const rows = [
    ['Serial #', req.serial],
    ['EIN', req.ein],
    ['Warehouse', req.warehouse],
    ['Angles needed', angles],
    ['Needed by', due],
    ['Notes', req.notes],
  ].filter(([, v]) => v);

  const html = shell(
    `Photos needed: ${title}`,
    `<p style="margin:0 0 16px;color:#333333;">Hi ${esc(assigneeName)}, ${esc(assignedByName)} assigned you a photo request.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;font-size:14px;">
${rows.map(([k, v]) => `<tr><td style="padding:6px 0;color:#666666;border-bottom:1px solid #eeeeee;width:130px;" valign="top">${esc(k)}</td><td style="padding:6px 0;border-bottom:1px solid #eeeeee;font-weight:600;white-space:pre-wrap;">${esc(v)}</td></tr>`).join('')}
</table>
${button(uploadLink, 'Upload photos')}
<p style="margin:16px 0 0;font-size:13px;"><a href="${esc(listLink)}" style="color:#cc2900;">See all photo requests</a></p>`,
  );
  const text = [
    `Photos needed: ${title}`,
    '',
    `${assignedByName} assigned you a photo request.`,
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    `Upload photos: ${uploadLink}`,
    `All requests: ${listLink}`,
  ].join('\n');
  return { subject: `Photo request: ${title}${req.serial ? ` (Serial ${req.serial})` : ''}${due ? ` — needed by ${due}` : ''}`, html, text };
}

export function messageEmail({ eq, msg, recipientName, link, toSubmitter, mentioned = false }) {
  const title = `${eq.year ? `${eq.year} ` : ''}${eq.make} ${eq.model}`;
  const who = msg.authorName || msg.authorEmail || 'Someone';
  const headline = mentioned
    ? `${who} tagged you on ${title}`
    : msg.kind === 'action'
      ? `${who} needs more photos or changes on ${title}`
      : msg.kind === 'resolved'
        ? `${who} marked the follow-up on ${title} done`
        : `${who} sent a message about ${title}`;
  const callout =
    msg.kind === 'action'
      ? `<p style="margin:0 0 12px;padding:10px 12px;background:#fff0eb;border-left:4px solid #ff3300;color:#cc2900;font-weight:700;">Action needed${toSubmitter ? ' on a unit you submitted' : ''}</p>`
      : '';
  const quote = msg.text
    ? `<div style="margin:0 0 20px;padding:12px 14px;background:#f2f2f2;border-radius:6px;white-space:pre-wrap;color:#000000;">${esc(msg.text)}</div>`
    : '';
  const html = shell(
    headline,
    `<p style="margin:0 0 12px;color:#333333;">Hi ${esc(recipientName)},</p>
${callout}${quote}
<p style="margin:0 0 20px;color:#666666;font-size:13px;">${esc(title)} · Serial ${esc(eq.serial)}${eq.ein ? ` · EIN ${esc(eq.ein)}` : ''}${eq.warehouse ? ` · ${esc(eq.warehouse)}` : ''}</p>
${button(link, msg.kind === 'resolved' ? 'View unit' : 'Reply or view unit')}`,
  );
  const text = [headline, '', msg.text || '', '', `${title} · Serial ${eq.serial}`, '', `Reply or view: ${link}`].join('\n');
  const subject = mentioned
    ? `${who} tagged you: ${title} (Serial ${eq.serial})`
    : msg.kind === 'action'
      ? `Action needed: ${title} (Serial ${eq.serial})`
      : msg.kind === 'resolved'
        ? `Done: ${title} (Serial ${eq.serial})`
        : `Message about ${title} (Serial ${eq.serial})`;
  return { subject, html, text };
}

export function importDigestEmail({ rows, assigneeName, assignedByName, listLink, appUrl }) {
  const n = rows.length;
  const dues = [...new Set(rows.map((r) => r.dueDate).filter(Boolean))];
  const due = dues.length === 1 ? new Date(`${dues[0]}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : null;
  const shown = rows.slice(0, 60);
  const cell = 'padding:6px 8px;border-bottom:1px solid #eeeeee;font-size:13px;vertical-align:top;';
  const table = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 16px;">
<tr>${['Whse', 'Unit', 'Serial #', 'EIN'].map((h) => `<td style="${cell}color:#666666;font-weight:700;">${h}</td>`).join('')}</tr>
${shown
  .map((r) => {
    const link = r.equipmentId ? `${appUrl}/#/equipment/${r.equipmentId}/edit?request=${r.id}` : `${appUrl}/#/new?request=${r.id}`;
    const unit = [r.year, r.make, r.model].filter(Boolean).join(' ');
    return `<tr><td style="${cell}">${esc(r.warehouse || r.warehouseCode || '')}</td><td style="${cell}"><a href="${esc(link)}" style="color:#cc2900;font-weight:700;">${esc(unit)}</a></td><td style="${cell}font-family:Consolas,Menlo,monospace;">${esc(r.serial)}</td><td style="${cell}font-family:Consolas,Menlo,monospace;">${esc(r.ein)}</td></tr>`;
  })
  .join('')}
</table>${n > shown.length ? `<p style="margin:0 0 16px;color:#666666;font-size:13px;">…and ${n - shown.length} more.</p>` : ''}`;
  const html = shell(
    `${n} photo request${n === 1 ? '' : 's'} assigned to you`,
    `<p style="margin:0 0 16px;color:#333333;">Hi ${esc(assigneeName)}, ${esc(assignedByName)} assigned you ${n} photo request${n === 1 ? '' : 's'}${due ? `, needed by <strong>${esc(due)}</strong>` : ''}. Tap a unit to upload its photos.</p>
${table}
${button(listLink, 'Open my photo requests')}`,
  );
  const text = [
    `${assignedByName} assigned you ${n} photo request${n === 1 ? '' : 's'}${due ? `, needed by ${due}` : ''}.`,
    '',
    ...rows.map((r) => `${r.warehouse || r.warehouseCode || ''}  ${[r.year, r.make, r.model].filter(Boolean).join(' ')}  Serial ${r.serial}  EIN ${r.ein}`),
    '',
    `Open your requests: ${listLink}`,
  ].join('\n');
  return { subject: `${n} photo request${n === 1 ? '' : 's'} assigned to you${due ? ` — needed by ${due}` : ''}`, html, text };
}

/** Photos uploaded for a request → the requester (or admins, for units from the daily report). */
export function photosReadyEmail({ req, eq, recipientName, completedByName, link, count, total }) {
  const unit = [eq?.year ?? req.year, eq?.make || req.make, eq?.model || req.model].filter(Boolean).join(' ');
  const where = eq?.warehouse || req.warehouse || '';
  const html = shell(
    'Photos are ready',
    `<p style="margin:0 0 16px;color:#333333;">Hi ${esc(recipientName)}, ${esc(completedByName)} uploaded photos for <strong>${esc(unit)}</strong>${where ? ` at ${esc(where)}` : ''} (${count} of ${total} angles).</p>
<p style="margin:0 0 16px;color:#666666;font-size:13px;">Serial ${esc(eq?.serial || req.serial || '—')}${eq?.ein || req.ein ? ` · EIN ${esc(eq?.ein || req.ein)}` : ''}</p>
${button(link, 'View and download photos')}`,
  );
  const text = `${completedByName} uploaded photos for ${unit}${where ? ` at ${where}` : ''} (${count} of ${total} angles).\n\nView and download: ${link}`;
  return { subject: `Photos ready: ${unit}${where ? ` (${where})` : ''}`, html, text };
}

/** Units that dropped off the daily report: heads-up before auto-delete, and what was deleted today → admins. */
export function offReportEmail({ warn, deleted, appUrl }) {
  const day = (iso) => new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Chicago' });
  const cell = 'padding:6px 8px;border-bottom:1px solid #eeeeee;font-size:13px;vertical-align:top;';
  const table = (rows, extra) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 16px;">
${rows.map((r) => `<tr><td style="${cell}"><a href="${esc(`${appUrl}/#/equipment/${r.id}`)}" style="color:#cc2900;font-weight:700;">${esc(r.unit)}</a></td><td style="${cell}">${esc(r.warehouse)}</td><td style="${cell}font-family:Consolas,Menlo,monospace;">${esc(r.serial)}</td><td style="${cell}">${esc(extra(r))}</td></tr>`).join('')}
</table>`;
  const parts = [];
  if (warn.length) {
    parts.push(`<p style="margin:0 0 8px;color:#333333;">${warn.length === 1 ? 'This unit has' : 'These units have'} been off the daily equipment report for over 50 days and will be <strong>deleted with ${warn.length === 1 ? 'its' : 'their'} photos</strong> on the date shown. To keep one, open it and click <strong>Keep</strong>.</p>${table(warn, (r) => `Deletes ${day(r.deleteAt)}`)}`);
  }
  if (deleted.length) {
    parts.push(`<p style="margin:0 0 8px;color:#333333;">Deleted today after 60 days off the report:</p>${table(deleted, () => 'Deleted')}`);
  }
  const subject = warn.length ? `${warn.length} unit${warn.length === 1 ? '' : 's'} will be deleted soon (off the equipment report)` : `${deleted.length} unit${deleted.length === 1 ? '' : 's'} deleted (off the equipment report 60 days)`;
  const text = [
    ...warn.map((r) => `Deletes ${day(r.deleteAt)}: ${r.unit} · ${r.warehouse} · Serial ${r.serial} — ${appUrl}/#/equipment/${r.id}`),
    ...deleted.map((r) => `Deleted: ${r.unit} · ${r.warehouse} · Serial ${r.serial}`),
  ].join('\n');
  return { subject, html: shell('Units no longer on the equipment report', parts.join('')), text };
}

/** The daily report import failed (bad URL, Zapier stopped, unreadable file) → admins. */
export function reportFailedEmail({ error, settingsLink }) {
  const html = shell(
    'Daily report import didn’t run',
    `<p style="margin:0 0 16px;color:#333333;">This morning’s equipment report couldn’t be imported, so no new “Post to Web” units were added to Pending.</p>
<p style="margin:0 0 16px;padding:12px;background:#fff1ec;border-radius:6px;color:#8a1f00;font-size:13px;">${esc(error)}</p>
<p style="margin:0 0 16px;color:#333333;">Check that the Zapier zap is still running and that the report link in Settings opens the PDF. You can also upload the report by hand.</p>
${button(settingsLink, 'Open report settings')}`,
  );
  return { subject: 'Daily equipment report import failed', html, text: `The daily equipment report import failed: ${error}\n\nSettings: ${settingsLink}` };
}
