import { h, clear, icon, toast, fmtDate, fmtMoney, fmtNumber, confirmDialog, mount } from '../ui.js';
import { store } from '../store.js';
import { PHOTO_SLOTS, STATUSES, OFF_REPORT_DAYS } from '../config.js';
import { callSetupDownloads, restoreEquipment, purgeEquipment, TRASH_DAYS, subscribeEquipmentDoc, setOffReportKeep, setStatus, downloadAllPhotos, downloadPhoto, deleteEquipment, normalizeKey, IS_IOS } from '../data.js';
import { navigate } from '../main.js';
import { messagesPanel, canResolve, markDone } from './messages.js';
import { subscribePrivateNotes } from '../data.js';

// Browser downloads need the Storage bucket to allow this site (CORS). The first time an admin hits that,
// the setupDownloads function switches it on and the download is retried.
async function withDownloadFix(fn) {
  try {
    return await fn();
  } catch (err) {
    if (!/failed to fetch|networkerror|load failed/i.test(err.message)) throw err;
    if (!store.isAdmin()) throw new Error('Photo downloads aren’t switched on yet. Ask an admin to download a photo once — that turns them on for everyone.');
    toast('Turning on photo downloads for this site…');
    try {
      await callSetupDownloads();
    } catch (e) {
      throw new Error(`Couldn’t turn on downloads automatically: ${e.message}. See “Allow photo downloads” in the README.`);
    }
    await new Promise((r) => setTimeout(r, 2500));
    try {
      return await fn();
    } catch {
      throw new Error('Downloads were just switched on — reload the page and try again in a minute.');
    }
  }
}

export function renderDetail(page, id) {
  mount(page, h('div', { class: 'center-pad' }, h('div', { class: 'spinner' })));
  let lightbox = null;
  let current = null;
  let panel = null; // messages thread — built once so a half-typed message survives redraws
  let focusedMessages = false;
  // Private comments: only loaded for admins/employees (the rules refuse viewers).
  let privateNotes = null;
  const privateEl = h('div', { class: 'comments-block private' });
  const unsubPrivate = store.canEdit()
    ? subscribePrivateNotes(id, (d) => {
        privateNotes = d;
        drawPrivate();
      }, () => {})
    : () => {};
  function drawPrivate() {
    if (!current) return;
    const canEditUnit = store.isAdmin() || current.createdBy === store.get().user.uid;
    mount(clear(privateEl), 
      h('h3', {}, 'Private comments', h('span', { class: 'vis-tag private' }, 'Hidden from viewers')),
      privateNotes?.text
        ? h('p', { class: 'prewrap' }, privateNotes.text)
        : h('p', { class: 'muted small' }, canEditUnit ? 'None — add some with Edit.' : 'None.'),
      privateNotes?.updatedByEmail ? h('p', { class: 'muted small' }, `Updated ${fmtDate(privateNotes.updatedAt)} by ${privateNotes.updatedByEmail}`) : null,
    );
  }
  let reqSig = '';
  const openReqSig = (st) => (st.requests || []).filter((r) => r.status !== 'done').map((r) => r.id + r.equipmentId + (r.assignedTo || '')).join('|');

  const unsub = subscribeEquipmentDoc(
    id,
    (eq) => {
      clear(page);
      if (!eq) {
        current = null;
        panel?.destroy();
        panel = null;
        mount(page, h('div', { class: 'card narrow' }, h('h2', {}, 'Unit not found'), h('p', { class: 'muted' }, 'It may have been deleted.'), h('a', { href: '#/' }, 'Back to inventory')));
        return;
      }
      current = eq;
      reqSig = openReqSig(store.get());
      if (!panel) panel = messagesPanel(eq);
      else panel.update(eq);
      draw(eq);
      if (!focusedMessages && location.hash.endsWith('?messages')) {
        focusedMessages = true; // only on arrival, not on every later update
        panel.focus();
      }
    },
    (err) => {
      clear(page);
      mount(page, h('div', { class: 'card narrow' }, h('h2', {}, 'Couldn’t load unit'), h('p', {}, err.message)));
    },
  );

  // Redraw when open requests for this unit change (they load separately from the unit).
  const unsubStore = store.subscribe((st) => {
    if (!current) return;
    const sig = openReqSig(st);
    if (sig === reqSig) return;
    reqSig = sig;
    clear(page);
    draw(current);
  });

  function draw(eq) {
    const isAdmin = store.isAdmin();
    const gone = eq.status === 'deleted'; // in Deleted units: read-only until restored
    const mayEdit = store.canEdit() && !gone; // viewers can't change anything
    const canEdit = mayEdit && (isAdmin || eq.createdBy === store.get().user.uid);
    const st = STATUSES.find((s) => s.key === eq.status) || STATUSES[0];
    const photoCount = PHOTO_SLOTS.filter((s) => eq.photos?.[s.key]).length;

    const dlBtn = h(
      'button',
      {
        class: 'btn btn-primary',
        disabled: photoCount === 0,
        onclick: async () => {
          dlBtn.disabled = true;
          const label = dlBtn.querySelector('span');
          try {
            await withDownloadFix(() => downloadAllPhotos(eq, (done, n) => (label.textContent = IS_IOS ? `Getting photos… ${done}/${n}` : 'Preparing zip…')));
          } catch (err) {
            toast(`Download failed: ${err.message}`, 'error');
          } finally {
            label.textContent = 'Download all photos';
            dlBtn.disabled = false;
          }
        },
      },
      icon('download'),
      h('span', {}, 'Download all photos'),
    );

    const statusEl = gone
      ? h('span', { class: 'status-badge status-deleted' }, 'Deleted')
      : isAdmin
      ? h(
          'select',
          {
            class: `status-select status-${eq.status}`,
            'aria-label': 'Status',
            onchange: async (e) => {
              try {
                await setStatus(eq.id, e.target.value);
                toast(e.target.value === 'archived' ? 'Marked as Listed' : 'Status updated');
              } catch (err) {
                toast(`Couldn't change status: ${err.message}`, 'error');
              }
            },
          },
          STATUSES.map((s) => h('option', { value: s.key, selected: s.key === eq.status }, s.label)),
        )
      : h('span', { class: `status-badge status-${st.key}` }, st.label);

    // One-click workflow button: photos posted → Listed; or undo.
    const listBtn = isAdmin && !gone
      ? h(
          'button',
          {
            class: eq.status === 'archived' ? 'btn btn-ghost' : 'btn btn-primary',
            onclick: async (e) => {
              const btn = e.currentTarget;
              const toListed = eq.status !== 'archived';
              if (toListed && photoCount < PHOTO_SLOTS.length) {
                const ok = await confirmDialog({ title: 'Mark as Listed?', message: `This unit has ${photoCount} of ${PHOTO_SLOTS.length} photos. It will leave Pending and move to Listed.`, confirmLabel: 'Mark as Listed' });
                if (!ok) return;
              }
              btn.disabled = true;
              try {
                await setStatus(eq.id, toListed ? 'archived' : 'active');
                toast(toListed ? 'Marked as Listed — removed from Pending' : 'Moved back to Pending');
              } catch (err) {
                toast(`Couldn't change status: ${err.message}`, 'error');
                btn.disabled = false;
              }
            },
          },
          icon(eq.status === 'archived' ? 'back' : 'check'),
          h('span', {}, eq.status === 'archived' ? 'Move back to Pending' : 'Mark as Listed'),
        )
      : null;

    const openReqs = (store.get().requests || []).filter(
      (r) => r.status !== 'done' && r.equipmentId === eq.id,
    );
    const reqBanner = openReqs.length
      ? h(
          'div',
          { class: 'request-banner' },
          icon('camera'),
          h(
            'div',
            { class: 'grow' },
            h('strong', {}, `Photos requested by ${openReqs[0].createdByName || openReqs[0].createdByEmail}`, openReqs[0].assignedToName ? ` · assigned to ${openReqs[0].assignedTo === store.get().user.uid ? 'you' : openReqs[0].assignedToName}` : ''),
            h('div', { class: 'small' }, openReqs[0].angles?.length ? openReqs[0].angles.map((k) => PHOTO_SLOTS.find((x) => x.key === k)?.label || k).join(', ') : 'All angles', openReqs[0].dueDate ? ` · needed by ${openReqs[0].dueDate}` : ''),
          ),
          store.canEdit() ? h('a', { href: `#/equipment/${eq.id}/edit?request=${openReqs[0].id}`, class: 'btn btn-primary btn-sm' }, 'Upload photos') : null,
        )
      : null;

    // Dropped off the daily equipment report → auto-deleted after OFF_REPORT_DAYS unless kept.
    const keepBtn = (keep, label, cls) =>
      h(
        'button',
        {
          class: `btn ${cls} btn-sm`,
          onclick: async (e) => {
            e.currentTarget.disabled = true;
            try {
              await setOffReportKeep(eq.id, keep);
              toast(keep ? 'Kept — this unit won’t be deleted automatically' : 'It will be flagged again if it’s not on the report');
            } catch (err) {
              toast(err.message, 'error');
              e.currentTarget.disabled = false;
            }
          },
        },
        label,
      );
    let offBanner = null;
    if (eq.offReport) {
      const since = eq.offReport.since?.toDate?.();
      const delDate = since ? new Date(+since + OFF_REPORT_DAYS * 86400000) : null;
      offBanner = h(
        'div',
        { class: 'offreport-banner' },
        h(
          'div',
          { class: 'grow' },
          h('strong', {}, `Not on the equipment report${since ? ` since ${fmtDate(eq.offReport.since)}` : ''}`),
          h('div', { class: 'small' }, delDate ? `It will be deleted with its photos on ${delDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} unless it shows up on the report again${isAdmin ? ' or you keep it' : ''}.` : 'It will be deleted automatically unless it shows up on the report again.'),
        ),
        isAdmin ? keepBtn(true, 'Keep — don’t delete', 'btn-ghost') : null,
      );
    } else if (eq.offReportKeep && isAdmin) {
      offBanner = h('div', { class: 'offreport-banner' }, h('div', { class: 'grow small' }, `Kept${eq.offReportKeepBy ? ` by ${eq.offReportKeepBy}` : ''} — won’t be deleted even if it’s not on the equipment report.`), keepBtn(false, 'Allow auto-delete', 'btn-ghost'));
    }

    // Follow-up flag set from the Messages thread ("needs more photos or changes").
    const fu = eq.followUp?.open ? eq.followUp : null;
    const followBanner = fu
      ? h(
          'div',
          { class: 'followup-banner' },
          h(
            'div',
            { class: 'grow' },
            h('strong', {}, `Needs more photos or changes — ${fu.byName || 'someone'} asked ${fmtDate(fu.at)}`),
            fu.text ? h('p', { class: 'prewrap small' }, fu.text) : null,
          ),
          h(
            'div',
            { class: 'btn-row' },
            h('button', { class: 'btn btn-ghost btn-sm', onclick: () => panel?.focus() }, 'Reply'),
            mayEdit ? h('a', { href: `#/equipment/${eq.id}/edit`, class: 'btn btn-ghost btn-sm' }, icon(canEdit ? 'edit' : 'camera'), h('span', {}, canEdit ? 'Edit' : 'Add photos')) : null,
            canResolve(eq)
              ? h(
                  'button',
                  {
                    class: 'btn btn-primary btn-sm',
                    onclick: async (e) => {
                      const btn = e.currentTarget;
                      btn.disabled = true;
                      try {
                        await markDone(eq);
                        toast(`Marked done — ${fu.byName || 'they'} will be notified`);
                      } catch (err) {
                        toast(err.message, 'error');
                        btn.disabled = false;
                      }
                    },
                  },
                  'Mark done',
                )
              : null,
          ),
        )
      : null;

    const spec = (label, value, cls = '') => h('div', { class: 'spec' }, h('dt', {}, label), h('dd', { class: cls }, value ?? '—'));

    mount(page, 
      h(
        'div',
        { class: 'page-head' },
        h(
          'div',
          {},
          gone
            ? h('a', { href: '#/deleted', class: 'back-link' }, icon('back'), 'Back to Deleted units')
            : h('a', { href: eq.status === 'archived' ? '#/listed' : '#/', class: 'back-link' }, icon('back'), eq.status === 'archived' ? 'Back to Listed' : 'Back to Pending'),
          h('h1', {}, `${eq.year ? `${eq.year} ` : ''}${eq.make} ${eq.model}`),
          h('p', { class: 'muted' }, [`Serial ${eq.serial}`, eq.ein && `EIN ${eq.ein}`, eq.warehouse].filter(Boolean).join(' · ')),
        ),
        h(
          'div',
          { class: 'head-actions' },
          statusEl,
          listBtn,
          canEdit && h('a', { href: `#/equipment/${eq.id}/edit`, class: 'btn btn-ghost' }, icon('edit'), h('span', {}, 'Edit')),
          mayEdit && !canEdit && (photoCount < PHOTO_SLOTS.length || eq.createdBy === 'daily-report') && h('a', { href: `#/equipment/${eq.id}/edit${openReqs[0] ? `?request=${openReqs[0].id}` : ''}`, class: 'btn btn-ghost' }, icon('camera'), h('span', {}, 'Add photos')),
          dlBtn,
        ),
      ),
      gone ? deletedBanner(eq, isAdmin) : offBanner,
      followBanner,
      reqBanner,
      h(
        'div',
        { class: 'detail-layout' },
        h(
          'div',
          { class: 'detail-main' },
          h(
          'section',
          { class: 'card' },
          h('div', { class: 'section-head' }, h('h2', { class: 'section-title' }, 'Photos'), h('span', { class: 'muted small' }, `${photoCount} of ${PHOTO_SLOTS.length}`)),
          h(
            'div',
            { class: 'gallery' },
            PHOTO_SLOTS.map((slot, i) => {
              const p = eq.photos?.[slot.key];
              if (!p) return h('figure', { class: 'gallery-item missing' }, h('div', { class: 'gallery-img' }, icon('image')), h('figcaption', {}, slot.label, h('span', { class: 'muted small' }, 'No photo')));
              return h(
                'figure',
                { class: 'gallery-item' },
                h('button', { class: 'gallery-img', onclick: () => openLightbox(eq, i), 'aria-label': `View ${slot.label} photo` }, h('img', { src: p.thumbUrl || p.url, alt: slot.label, loading: 'lazy' })),
                h(
                  'figcaption',
                  {},
                  slot.label,
                  h(
                    'button',
                    {
                      class: 'icon-btn sm',
                      title: `Download ${slot.label}`,
                      'aria-label': `Download ${slot.label}`,
                      onclick: () => withDownloadFix(() => downloadPhoto(eq, slot.key)).catch((err) => toast(`Download failed: ${err.message}`, 'error')),
                    },
                    icon('download'),
                  ),
                ),
              );
            }),
          ),
          h(
            'div',
            { class: 'comments-block' },
            h('h3', {}, 'Public comments'),
            eq.comments ? h('p', { class: 'prewrap' }, eq.comments) : h('p', { class: 'muted small' }, canEdit ? 'No comments yet — add some with Edit.' : 'No comments.'),
          ),
          store.canEdit() ? (drawPrivate(), privateEl) : null,
          ),
          panel?.el,
        ),
        h(
          'aside',
          { class: 'card specs-card' },
          h('h2', { class: 'section-title' }, 'Details'),
          h(
            'dl',
            { class: 'specs' },
            spec('Make', eq.make),
            spec('Model', eq.model),
            spec('Year', eq.year),
            spec('Hours', eq.hours != null ? fmtNumber(eq.hours) : null),
            spec('Warehouse', eq.warehouse),
            spec('EIN', eq.ein, 'mono'),
            spec('Serial #', eq.serial, 'mono'),
            spec('Condition', eq.condition),
            spec('Price', eq.price != null ? fmtMoney(eq.price) : null),
          ),
          eq.attachments ? h('div', { class: 'spec-block' }, h('h3', {}, 'Attachments / options'), h('p', { class: 'prewrap' }, eq.attachments)) : null,
          h(
            'div',
            { class: 'meta' },
            h('div', {}, 'Submitted ', h('strong', {}, fmtDate(eq.createdAt)), ' by ', eq.createdByName || eq.createdByEmail || 'unknown'),
            eq.updatedByEmail ? h('div', {}, 'Last updated ', fmtDate(eq.updatedAt), ' by ', eq.updatedByEmail) : null,
            eq.status === 'archived' && eq.listedAt ? h('div', {}, 'Listed ', h('strong', {}, fmtDate(eq.listedAt)), eq.listedByEmail ? ` by ${eq.listedByEmail}` : '') : null,
            eq.importBatch ? h('div', {}, 'Added from the daily equipment report', eq.reportStatus ? ` (${eq.reportStatus})` : '') : null,
          ),
          isAdmin && eq.status !== 'deleted'
            ? h(
                'button',
                {
                  class: 'btn btn-danger btn-block',
                  onclick: async () => {
                    const ok = await confirmDialog({ title: 'Delete this unit?', message: 'It moves to Deleted units. You can restore it for 30 days; after that it and its photos are removed for good.', confirmLabel: 'Delete', danger: true });
                    if (!ok) return;
                    try {
                      await deleteEquipment(eq.id, eq.status);
                      toast('Moved to Deleted units');
                      navigate(eq.status === 'archived' ? '/listed' : '/');
                    } catch (err) {
                      toast(`Delete failed: ${err.message}`, 'error');
                    }
                  },
                },
                icon('trash'),
                h('span', {}, 'Delete'),
              )
            : null,
        ),
      ),
    );
  }

  function openLightbox(eq, startIndex) {
    const slots = PHOTO_SLOTS.filter((s) => eq.photos?.[s.key]);
    let idx = slots.findIndex((s) => s.key === PHOTO_SLOTS[startIndex].key);
    const img = h('img', { alt: '' });
    const caption = h('span', {});
    const show = () => {
      const s = slots[idx];
      img.src = eq.photos[s.key].url;
      img.alt = s.label;
      caption.textContent = `${s.label} · ${idx + 1} of ${slots.length}`;
    };
    const step = (d) => {
      idx = (idx + d + slots.length) % slots.length;
      show();
    };
    const onKey = (e) => {
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    lightbox = h(
      'dialog',
      { class: 'lightbox', onclick: (e) => e.target === lightbox && lightbox.close() },
      h(
        'div',
        { class: 'lightbox-bar' },
        caption,
        h(
          'div',
          {},
          h('button', { class: 'icon-btn light', title: 'Download', 'aria-label': 'Download this photo', onclick: () => withDownloadFix(() => downloadPhoto(eq, slots[idx].key)).catch((err) => toast(`Download failed: ${err.message}`, 'error')) }, icon('download')),
          h('button', { class: 'icon-btn light', title: 'Close', 'aria-label': 'Close', onclick: () => lightbox.close() }, icon('x')),
        ),
      ),
      h('div', { class: 'lightbox-stage' }, h('button', { class: 'lb-nav prev', 'aria-label': 'Previous photo', onclick: () => step(-1) }, '‹'), img, h('button', { class: 'lb-nav next', 'aria-label': 'Next photo', onclick: () => step(1) }, '›')),
    );
    lightbox.addEventListener('close', () => {
      document.removeEventListener('keydown', onKey);
      lightbox.remove();
      lightbox = null;
    });
    document.addEventListener('keydown', onKey);
    document.body.append(lightbox);
    show();
    lightbox.showModal();
  }

  return () => {
    unsub();
    unsubStore();
    panel?.destroy();
    unsubPrivate();
    lightbox?.close();
  };
}

function deletedBanner(eq, isAdmin) {
  const since = eq.deletedAt?.toDate?.();
  const purge = since ? new Date(+since + TRASH_DAYS * 86400000) : null;
  return h(
    'div',
    { class: 'deleted-banner' },
    h(
      'div',
      { class: 'grow' },
      h('strong', {}, `Deleted${since ? ` ${fmtDate(eq.deletedAt)}` : ''}${eq.deletedByEmail ? ` by ${eq.deletedByEmail}` : eq.deletedReason ? ` — ${eq.deletedReason}` : ''}`),
      h('div', { class: 'small' }, purge ? `It and its photos will be removed for good on ${purge.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}.` : 'It will be removed for good after 30 days.'),
    ),
    isAdmin
      ? h(
          'div',
          { class: 'btn-row' },
          h('button', { class: 'btn btn-ghost btn-sm', onclick: () => purgeNow(eq) }, 'Delete forever'),
          h(
            'button',
            {
              class: 'btn btn-primary btn-sm',
              onclick: async (e) => {
                e.currentTarget.disabled = true;
                try {
                  await restoreEquipment(eq);
                  toast(`Restored to ${eq.deletedFromStatus === 'archived' ? 'Listed' : 'Pending'}`);
                } catch (err) {
                  toast(err.message, 'error');
                  e.currentTarget.disabled = false;
                }
              },
            },
            'Restore',
          ),
        )
      : null,
  );
}

export async function purgeNow(eq, after) {
  const ok = await confirmDialog({ title: 'Delete forever?', message: `${eq.make} ${eq.model} (Serial ${eq.serial}) and all of its photos and messages will be removed now. This can’t be undone.`, confirmLabel: 'Delete forever', danger: true });
  if (!ok) return;
  try {
    await purgeEquipment(eq.id);
    toast('Deleted forever');
    if (after) after();
    else navigate('/deleted');
  } catch (err) {
    toast(err.message, 'error');
  }
}
