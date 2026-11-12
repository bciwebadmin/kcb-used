// Admin → Settings → Daily report tab: the automatic import of the e-Emphasys equipment report.
// (Photo contacts and report codes per location are on the Locations tab.)
// Rows with ERP status "K – Post to Web" / "*K – Post to Web" become Pending units with a photo request
// assigned to the branch's photo contact. The work happens in the runReportImport / dailyReportImport functions.
import { h, clear, icon, toast, mount, fmtDate, confirmDialog } from '../ui.js';
import { subscribeReportSettings, saveReportSettings, subscribeReportRuns, callRunReportImport, fileToBase64 } from '../data.js';

const when = (t) => (t?.toDate ? t.toDate().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '');
const SOURCES = { schedule: 'Automatic', manual: 'Run now', upload: 'Uploaded file' };

// "No longer on the report" part of a run (flag → warn → delete after 60 days).
function offReportSummary(r) {
  const o = r.offReport;
  if (!o) return null;
  if (o.skippedReason) return h('p', { class: 'muted small' }, o.skippedReason);
  const link = (c) => h('li', {}, h('a', { href: `#/equipment/${c.id}` }, h('strong', {}, c.unit)), h('span', { class: 'muted' }, ` · ${c.warehouse} · Serial ${c.serial}`));
  const part = (title, list, linked = true) => (list?.length ? [h('h3', { class: 'sub-title' }, title), h('ul', { class: 'report-list' }, list.map((c) => (linked ? link(c) : h('li', {}, h('strong', {}, c.unit), h('span', { class: 'muted' }, ` · ${c.warehouse} · Serial ${c.serial}`)))))] : []);
  const nothing = !o.flagged?.length && !o.cleared?.length && !o.warn?.length && !o.deleted?.length && !o.requestsRemoved?.length;
  return [
    ...part(`${r.dryRun ? 'Would flag' : 'Flagged'} ${o.flagged?.length} as no longer on the report`, o.flagged),
    ...part(`Back on the report (${o.cleared?.length})`, o.cleared),
    ...part(`${r.dryRun ? 'Would warn' : 'Warned'} — deleting within a week (${o.warn?.length})`, o.warn),
    ...part(`${r.dryRun ? 'Would move' : 'Moved'} to Deleted units after 60 days off the report (${o.deleted?.length})`, o.deleted),
    ...(o.requestsRemoved?.length ? [h('h3', { class: 'sub-title' }, `${r.dryRun ? 'Would remove' : 'Removed'} ${o.requestsRemoved.length} photo request${o.requestsRemoved.length === 1 ? '' : 's'} — no longer on the report`), h('ul', { class: 'report-list' }, o.requestsRemoved.map((c) => h('li', {}, h('strong', {}, c.unit), h('span', { class: 'muted' }, ` · ${c.warehouse} · Serial ${c.serial}`))))] : []),
    nothing ? h('p', { class: 'muted small' }, 'Every unit in the app is still on the report.') : null,
  ];
}

export function renderReportTab(page) {
  let cfg = null;
  let dirty = false;

  // ---------- 1. automatic import ----------
  const enabled = h('input', { type: 'checkbox', id: 'rp-on', onchange: () => (dirty = true) });
  const url = h('input', { type: 'url', id: 'rp-url', placeholder: 'https://…/equipment-list.pdf', autocomplete: 'off', spellcheck: 'false', oninput: () => (dirty = true) });
  const saveBtn = h('button', { type: 'submit', class: 'btn btn-primary' }, 'Save');
  const cleanUrl = (v) => v.replace(/[\s\u200B-\u200D\uFEFF"'<>]/g, '');
  const testBtn = h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => run({ dryRun: true, url: cleanUrl(url.value) }) }, 'Test link');
  // Uses the link in the box (saving it first if it was changed), so you don't have to press Save before running.
  const runBtn = h(
    'button',
    {
      type: 'button',
      class: 'btn btn-ghost',
      onclick: async () => {
        const v = cleanUrl(url.value);
        url.value = v;
        if (!v) {
          toast('Paste the report link first', 'error');
          return;
        }
        if (v !== (cfg?.url || '')) {
          try {
            await saveReportSettings({ url: v });
          } catch (err) {
            toast(err.message, 'error');
            return;
          }
        }
        run({ url: v });
      },
    },
    icon('download'),
    h('span', {}, 'Run import now'),
  );
  const lastEl = h('div', { class: 'report-last' });
  const autoForm = h(
    'form',
    {
      class: 'card',
      onsubmit: async (e) => {
        e.preventDefault();
        const v = cleanUrl(url.value);
        url.value = v;
        if (enabled.checked && !v) {
          toast('Add the report link first', 'error');
          return;
        }
        saveBtn.disabled = true;
        try {
          await saveReportSettings({ url: v, enabled: enabled.checked });
          dirty = false;
          toast(enabled.checked ? 'Saved — the report will be imported every morning' : 'Saved — automatic import is off');
        } catch (err) {
          toast(err.message, 'error');
        } finally {
          saveBtn.disabled = false;
        }
      },
    },
    h('h2', { class: 'section-title' }, 'Automatic import'),
    lastEl,
    h('div', { class: 'field' }, h('label', { for: 'rp-url' }, 'Report link'), url, h('span', { class: 'muted small' }, 'The web address Zapier saves the report to. It should always be the same link, overwritten each day. Use https://user:password@… if the folder is password-protected.')),
    h('label', { class: 'check-inline', style: 'margin-top:12px' }, enabled, h('span', {}, 'Import automatically every morning')),
    h('div', { class: 'form-actions-row' }, testBtn, runBtn, saveBtn),
    h(
      'details',
      { class: 'how-it-works' },
      h('summary', {}, 'How it works'),
      h(
        'ul',
        { class: 'small' },
        h('li', {}, 'Every morning at 8:30 (Central) the report at this link is read.'),
        h('li', {}, 'Units with ERP status “K – Post to Web” or “*K – Post to Web” become photo requests on the Requests tab, assigned to that location’s photo contact (set on the Locations tab).'),
        h('li', {}, 'When the photos are uploaded, the unit is added to Pending and admins get a “Photos ready” email.'),
        h('li', {}, 'Units already in the app, with an open photo request, or imported before are skipped. Requests for units that drop off the report before photos are taken are removed.'),
        h('li', {}, 'Units no longer on the report get a “Not on report” tag and move to Deleted units after 60 days (restorable for 30 more). Admins are emailed a week before; open a unit and click Keep to stop it.'),
      ),
    ),
    h('div', { class: 'upload-row' }, h('span', { class: 'muted small' }, 'Missed a day?'), h('button', { type: 'button', class: 'link-btn small', onclick: () => fileInput.click() }, 'Upload a report file instead')),
  );

  // ---------- 2. manual upload ----------
  const fileInput = h('input', { type: 'file', accept: '.pdf,.csv,.txt,application/pdf,text/csv', hidden: true, onchange: (e) => e.target.files[0] && pickFile(e.target.files[0]) });
  let pendingFile = null;
  async function pickFile(file) {
    fileInput.value = '';
    if (file.size > 12 * 1024 * 1024) {
      toast('That file is too large', 'error');
      return;
    }
    pendingFile = { fileBase64: await fileToBase64(file), fileName: file.name };
    run({ dryRun: true, ...pendingFile });
  }

  // ---------- result / preview ----------
  const resultEl = h('section', { class: 'card', hidden: true, 'aria-live': 'polite' });

  async function run(args) {
    const busy = [testBtn, runBtn, saveBtn];
    busy.forEach((b) => (b.disabled = true));
    resultEl.hidden = false;
    mount(clear(resultEl), h('div', { class: 'row-center' }, h('div', { class: 'spinner sm' }), h('span', { class: 'muted' }, args.dryRun ? 'Reading the report…' : 'Importing…')));
    resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    try {
      const { data } = await callRunReportImport(args);
      drawResult(data, args);
      if (!args.dryRun) {
        toast(data.created.length ? `${data.created.length} photo request${data.created.length === 1 ? '' : 's'} created` : 'Nothing new to add');
        pendingFile = null;
      }
    } catch (err) {
      mount(clear(resultEl), h('h2', { class: 'section-title' }, 'Couldn’t import the report'), h('p', { class: 'form-msg' }, err.message));
    } finally {
      busy.forEach((b) => (b.disabled = false));
    }
  }

  function drawResult(r, args) {
    const listItem = (c) =>
      h(
        'li',
        {},
        h('span', { class: 'mono' }, c.warehouseCode || '—'),
        ' ',
        c.equipmentId && (c.reason || !r.dryRun) ? h('a', { href: `#/equipment/${c.equipmentId}` }, h('strong', {}, c.unit)) : h('strong', {}, c.unit),
        h('span', { class: 'muted' }, ` · Serial ${c.serial} · EIN ${c.ein}`),
        c.reason ? h('span', { class: 'flag warn' }, c.reason) : h('span', { class: 'muted small block' }, `→ ${c.warehouse} · ${c.assignedTo ? `photo request to ${c.assignedToName}` : 'unassigned (no branch contact)'}`),
        // Imported before (e.g. deleted by mistake) → an admin can bring it back as a new photo request.
        c.canReimport && c.key
          ? h(
              'button',
              {
                type: 'button',
                class: 'btn btn-ghost btn-sm reimport-btn',
                onclick: async () => {
                  const ok = await confirmDialog({
                    title: `Add ${c.unit} again?`,
                    message: 'A new photo request is created for it, as if it were new on today’s report.',
                    confirmLabel: 'Add again',
                  });
                  if (ok) run({ ...args, dryRun: false, reimport: [c.key] });
                },
              },
              'Add again',
            )
          : null,
      );
    mount(
      clear(resultEl),
      h('h2', { class: 'section-title' }, r.dryRun ? 'Preview — nothing has been added yet' : 'Import finished'),
      h('p', { class: 'muted' }, `${r.fileName || 'Report'}${r.reportDate ? ` · as of ${r.reportDate}` : ''} · ${r.rowsFound} units in the report, ${r.postToWeb} marked Post to Web.`),
      r.unmapped?.length
        ? h('p', { class: 'warn small' }, `Warehouse code${r.unmapped.length === 1 ? '' : 's'} ${r.unmapped.join(', ')} ${r.unmapped.length === 1 ? 'isn’t' : 'aren’t'} matched to a warehouse — add ${r.unmapped.length === 1 ? 'it' : 'them'} on the Locations tab (+ code), or the code is used as the location name.`)
        : null,
      h('h3', { class: 'sub-title' }, r.dryRun ? `Would request photos of ${r.created.length}` : `Requested ${r.created.length}`),
      r.created.length ? h('ul', { class: 'report-list' }, r.created.map(listItem)) : h('p', { class: 'muted small' }, 'No new Post to Web units.'),
      r.skipped.length ? h('h3', { class: 'sub-title' }, `Skipped ${r.skipped.length}`) : null,
      r.skipped.length ? h('ul', { class: 'report-list' }, r.skipped.map(listItem)) : null,
      offReportSummary(r),
      r.dryRun && r.created.length
        ? h(
            'div',
            { class: 'form-actions-row' },
            h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => (resultEl.hidden = true) }, 'Cancel'),
            h('button', { type: 'button', class: 'btn btn-primary', onclick: () => run({ ...args, dryRun: false }) }, `Create ${r.created.length} photo request${r.created.length === 1 ? '' : 's'}`),
          )
        : null,
    );
  }

  // ---------- 4. history ----------
  const runsEl = h('ul', { class: 'mail-log' }, h('li', { class: 'muted small' }, 'Loading…'));
  const unsubRuns = subscribeReportRuns(
    (rows) => {
      if (!rows.length) {
        mount(clear(runsEl), h('li', { class: 'muted small' }, 'No imports yet.'));
        return;
      }
      mount(
        clear(runsEl),
        ...rows.map((r) =>
          h(
            'li',
            { class: r.ok ? 'ok' : 'bad' },
            h('span', { class: 'mail-status' }, r.ok ? (r.created?.length ? `+${r.created.length}` : 'No new') : 'Failed'),
            h(
              'span',
              { class: 'mail-body' },
              h('strong', {}, SOURCES[r.source] || r.source),
              r.byName ? ` by ${r.byName}` : '',
              r.ok ? h('span', { class: 'block small' }, `${r.reportDate ? `Report of ${r.reportDate} · ` : ''}${r.postToWeb} Post to Web, ${r.created?.length || 0} requested, ${r.skipped?.length || 0} skipped${r.created?.length ? ` — ${r.created.map((c) => c.unit).join(', ')}` : ''}${r.offReport?.flagged?.length ? ` · ${r.offReport.flagged.length} no longer on report` : ''}${r.offReport?.deleted?.length ? ` · ${r.offReport.deleted.length} moved to Deleted` : ""}`) : h('span', { class: 'block small' }, r.error),
            ),
            h('span', { class: 'muted small' }, when(r.at)),
          ),
        ),
      );
    },
    (err) => mount(clear(runsEl), h('li', { class: 'muted small' }, `Couldn’t load history: ${err.message}`)),
  );

  function drawLast() {
    const l = cfg?.lastRun;
    if (!l) {
      mount(clear(lastEl), h('p', { class: 'muted small' }, 'Hasn’t run yet.'));
      return;
    }
    mount(
      clear(lastEl),
      h(
        'p',
        { class: `test-result ${l.ok ? 'ok' : 'bad'}` },
        l.ok ? `Last import ${when(l.at)}: ${l.created} photo request${l.created === 1 ? "" : "s"} created${l.reportDate ? ` (report of ${l.reportDate})` : ''}.` : `Last import failed ${when(l.at)}: ${l.error}`,
      ),
    );
  }

  const unsubCfg = subscribeReportSettings(
    (d) => {
      cfg = d;
      if (!dirty) {
        url.value = d.url || '';
        enabled.checked = Boolean(d.enabled);
      }
      drawLast();
    },
    (err) => toast(`Couldn’t load report settings: ${err.message}`, 'error'),
  );

  mount(
    page,
    fileInput,
    h('div', { class: 'settings-grid' }, autoForm, h('section', { class: 'card scroll-card' }, h('h2', { class: 'section-title' }, 'Recent imports'), h('div', { class: 'scroll-body' }, runsEl))),
    resultEl,
  );
  return () => {
    unsubRuns();
    unsubCfg();
  };
}
