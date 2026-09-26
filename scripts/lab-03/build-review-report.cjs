/* Local-only review artifact. It deliberately cannot emit a final submission. */
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { chromium } = require('@playwright/test');

const root = path.resolve(__dirname, '../..');
const docs = 'docs/lab-03';
const images = 'artifacts/lab-03/screenshots/system';
const repository = 'https://github.com/auto4496/toktickit';
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const head = git('rev-parse', 'HEAD');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const esc = value => String(value).replace(/[\u2010-\u2015\u2212]/g, '-').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const link = name => {
  const local = path.join(root, name);
  const kind = fs.existsSync(local) && fs.statSync(local).isDirectory() ? 'tree' : 'blob';
  return `${repository}/${kind}/lab3-staging/${name.split('/').map(encodeURIComponent).join('/')}`;
};
const manifest = JSON.parse(read(`${images}/manifest.json`));
for (const entry of manifest.files) {
  const file = path.resolve(root, images, entry.path);
  if (!file.startsWith(path.resolve(root, images) + path.sep)) throw new Error('Unsafe manifest path');
  const digest = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  if (digest !== entry.sha256) throw new Error(`Screenshot checksum mismatch: ${entry.path}`);
}

function inline(raw, source) {
  const tokens = [];
  const token = html => { tokens.push(html); return `\u0000${tokens.length - 1}\u0000`; };
  let text = raw.replace(/`([^`]+)`/g, (_, code) => token(`<code>${esc(code)}</code>`));
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, target) => {
    const url = /^https?:\/\//.test(target) ? target : link(path.posix.normalize(path.posix.join(path.posix.dirname(source), target)));
    return token(`<a href="${esc(url)}">${esc(label)}</a>`);
  });
  text = esc(text).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return text.replace(/\u0000(\d+)\u0000/g, (_, n) => tokens[Number(n)]);
}

// This repository's documentation uses headings, paragraphs, tables, lists and fences.
// Keep the renderer intentionally small; escape content before adding markup.
function markdown(source) {
  const lines = read(source).replace(/\r/g, '').split('\n');
  const out = [];
  for (let i = 0; i < lines.length;) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.startsWith('```')) {
      const block = []; i++;
      while (i < lines.length && !lines[i].startsWith('```')) block.push(lines[i++]);
      i++; out.push(`<pre>${esc(block.join('\n'))}</pre>`); continue;
    }
    if (/^#{1,6} /.test(line)) {
      const [, marks, title] = line.match(/^(#+) (.*)$/);
      const level = Math.min(4, marks.length + 1);
      out.push(`<h${level}>${inline(title, source)}</h${level}>`); i++; continue;
    }
    if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        const cells = lines[i++].replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
        if (cells.every(cell => /^:?-+:?$/.test(cell))) continue;
        rows.push(cells);
      }
      const columns = rows[0].length;
      out.push(`<table class="${columns > 5 ? 'wide-table' : ''}"><thead><tr>` + rows.shift().map(cell => `<th>${inline(cell, source)}</th>`).join('') + '</tr></thead><tbody>' + rows.map(row => '<tr>' + row.map(cell => `<td>${inline(cell, source)}</td>`).join('') + '</tr>').join('') + '</tbody></table>');
      continue;
    }
    if (/^\s*[-*] /.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*] /.test(lines[i])) items.push(`<li>${inline(lines[i++].replace(/^\s*[-*] /, ''), source)}</li>`);
      out.push(`<ul>${items.join('')}</ul>`); continue;
    }
    const paragraph = [line]; i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,6} |\||```|\s*[-*] )/.test(lines[i])) paragraph.push(lines[i++]);
    out.push(`<p>${inline(paragraph.join(' '), source)}</p>`);
  }
  return out.join('\n').replace(/(<h[2-4]>[^<]*Planned tests<\/h[2-4]>\s*<p>[\s\S]*?<\/p>\s*)(<table class="wide-table">[\s\S]*?<\/table>)/g,
    (_, introduction, table) => `<div class="wide-page">${introduction}${table.replace('class="wide-table"', '')}</div>`);
}

const sourceDocument = name => `<div class="source-label">Rendered source: <a href="${link(name)}">${esc(name)}</a> - complete document; dated historical entries retained.</div>${markdown(name)}`;
const part = (number, title, contents) => `<section class="part"><div class="eyebrow">TOKTICKIT / LAB 03 / REVIEW COPY</div><h1>Answer Part ${number}</h1><p class="subtitle">${esc(title)}</p>${contents}</section>`;
const note = text => `<div class="notice">${text}</div>`;
function figures(title, scenes, description = '') {
  return `<div class="figure-page"><h3>${esc(title)}</h3><p>${esc(description)}</p><div class="figures ${scenes.length > 1 ? 'multiple' : ''}">${scenes.map(([file, label]) => {
    if (!manifest.files.some(entry => entry.path === file)) throw new Error(`Image absent from manifest: ${file}`);
    const bytes = fs.readFileSync(path.join(root, images, file));
    const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
    const cropHeight = width < 500 ? 844 : width < 1000 ? 1112 : 1000;
    const excerpt = height > cropHeight * 1.2;
    const bottom = /staff-private|requester-public-attachment|requester-indication/.test(file);
    const visibleHeight = excerpt ? cropHeight : height;
    const offset = excerpt && bottom ? height - cropHeight : 0;
    const window = `<div class="image-window" style="aspect-ratio:${width}/${visibleHeight}"><img style="top:-${offset / visibleHeight * 100}%;" src="data:image/png;base64,${bytes.toString('base64')}" alt="${esc(label)}"></div>`;
    return `<figure>${window}<figcaption>${esc(label)}${excerpt ? `<br>${bottom ? 'Bottom' : 'Top'} excerpt of full-page capture` : ''}<br><a href="${link(`${images}/${file}`)}">Full-size evidence</a></figcaption></figure>`;
  }).join('')}</div><p class="provenance">Staging capture ${esc(manifest.capturedAt)}; source ${esc(manifest.baseCommit.slice(0, 12))}. Synthetic fixture data. ${scenes.some(([file]) => file.includes('simulated')) ? 'Names containing simulated use controlled browser responses.' : 'Real browser and API state.'}</p></div>`;
}

const graph = git('log', '--graph', '--oneline', '--decorate', '-24', 'lab3-staging');
const parts = [
  part(1, 'Repository and collaboration', `
    <p><strong>Phanuwit Butchari - 67070501070</strong><br>Peer: Pitchai Chadchuangchot - 67070501068 (Datakung)</p>
    ${note('<strong>REVIEW DRAFT - not ready for submission.</strong> PRs #31-35 are peer-approved and merged into staging. Issue #30 is in progress. The release review, main merge, final-main command outputs, completed Project, human visual checks and student review of the Reflection remain pending.')}
    <p><a href="${repository}">Repository</a> · <a href="https://github.com/users/auto4496/projects/1">Project</a> · <a href="${repository}/issues/30">Release Issue #30</a></p>
    <p>This copy was generated ${esc(new Date().toISOString())} from checkout HEAD <code>${head}</code>. Local release documentation may be uncommitted during preparation. Links to lab3-staging follow the live review branch; capture provenance is pinned separately. This is not a final-main record.</p>
    <h2>Feature branches → lab3-staging → main</h2><p>The first five work items are complete. The sixth release PR supplies the peer-reviewed staging-to-main integration. This graph is a current staging snapshot; final main and completed Project evidence are pending.</p><pre>${esc(graph)}</pre>
    ${sourceDocument(`${docs}/reviewer.md`)}
    <h2>Setup and repository structure</h2>${sourceDocument('README.md')}
    <h2>Ignored generated and private files</h2><pre class="two-columns">${esc(read('.gitignore'))}</pre>`),
  part(2, 'Specification and acceptance contract', `<p>The contract originated in <a href="${repository}/pull/31">PR #31</a> before implementation PRs #32-35. <a href="${repository}/commit/b006797c3fb185a36f84992bb99cfd453bc90e60">Original contract commit</a>. The rendered living document retains dated amendments and original planning language. Final Definition of Done sign-off remains pending.</p>${sourceDocument(`${docs}/specification.md`)}<p>Companion <a href="${link(`${docs}/api-spec.md`)}">API contract</a>.</p>`),
  part(3, 'Test plan, traceability and execution evidence', `${note('Final-main output is PENDING. The 389 tests, 17 browser journeys and two production builds below were verified on staging and independently repeated by the reviewer. They must not be represented as runs on main. Full final-main console outputs will be included after the actual release merge.')} ${sourceDocument(`${docs}/tests.md`)}${sourceDocument(`${docs}/system-verification.md`)}`),
  part(4, 'AI assistance and Reflection', `${note('The nine selected prompts are recorded user requests. The Thai Reflection is an AI-written draft requested by the user; the student must read and adapt it before submission. This report does not assert personal understanding or testing by the student.')} ${sourceDocument(`${docs}/ai-use.md`)}`),
  part(5, 'Authentication', `<p>Real browser journeys cover login, mandatory password change and logout. Real API suites cover inactive users, session invalidation, role restrictions and direct access after logout. Component tests cover busy/error feedback. See the actual test mapping in Part 3; a screenshot alone does not prove authorization.</p>
    ${figures('Login, invalid credentials and safe failure', [['system-states/desktop-login-invalid.png', 'Desktop - invalid credentials'], ['system-states/desktop-login-failure-simulated.png', 'Desktop - simulated unavailable response']], 'Validation and failure feedback preserve a clear recovery path.')}
    ${figures('Authentication across smaller screens', [['system-states/tablet-login-ready.png', 'Tablet - ready'], ['system-states/mobile-change-password.png', 'Mobile - mandatory password change'], ['system-states/narrow-login-validation.png', '320px - validation']], 'The complete image index also includes ready, busy, invalid and validation states at all four widths.')}`),
  part(6, 'Queue and ticket lookup', `<p>The queue provides search, filtering, sort, ownership and pagination. API assertions verify query semantics; browser journeys verify interactions and responsive layouts. Controlled responses explicitly supply empty/failure presentation states.</p>
    ${figures('Staff queue - desktop', [['staff-workflow/1440-queue.png', '1440px - queue and filters']])}
    ${figures('Queue - tablet and mobile', [['staff-workflow/834-queue.png', '834px - queue'], ['staff-workflow/390-queue.png', '390px - queue']])}
    ${figures('Queue feedback', [['system-states/desktop-queue-no-results.png', 'No matching results'], ['system-states/desktop-queue-failure-simulated.png', 'Simulated failure and recovery']], 'The full index additionally includes the labelled simulated empty state and detail not-found.')}`),
  part(7, 'Ticket workflow, conversations and permissions', `<p>Staff browser/API coverage exercises claim, assignment, priority and state changes, public comments, private notes, downloads, closing/reopening and version conflict. Requester ownership, private-data exclusion, terminal writes and narrow Admin permissions are checked through direct API requests. Migration fixtures preserve synthetic attachment metadata and file hashes.</p>
    ${figures('Ticket operations and public conversation', [['system-states/desktop-staff-public.png', 'Staff - public conversation']])}
    ${figures('Private notes and restricted administration', [['system-states/mobile-staff-private.png', 'Mobile - private conversation'], ['system-states/tablet-admin-restricted-detail.png', 'Tablet - Admin restricted operations']])}
    ${figures('Requester public conversation and resolution indication', [['system-states/mobile-requester-public-attachment.png', 'Requester - public conversation'], ['system-states/mobile-requester-indication.png', 'Requester - resolution indication']], 'The linked full-page captures include the attachment controls above these excerpts.')}
    ${figures('Concurrent edit recovery', [['system-states/desktop-staff-conflict.png', 'Real version conflict']], 'The current server state must be reloaded and reviewed; the interface does not silently overwrite it.')}`),
  part(8, 'Administrator user management', `<p>Account lifecycle coverage includes create/edit/reset, exactly one role, activation, required password change and non-admin denial. Real API tests cover duplicates, stale edits, self-deactivation, concurrent last-admin removal and active-owner protection. Browser regressions retain dirty form data when navigation is cancelled.</p>
    ${figures('User directory - desktop', [['user-management/users-1440.png', 'Directory with role, activity and edit actions']])}
    ${figures('User editor and initial-password reset', [['user-management/editor-834.png', 'Tablet - editor and account safety'], ['user-management/reset-390.png', 'Mobile - reset dialog']])}
    ${figures('Account creation validation', [['system-states/desktop-admin-create-validation.png', 'Desktop - create validation'], ['system-states/mobile-admin-create.png', 'Mobile - create form']])}`),
  part(9, 'UI specification, responsive evidence and final inspection', `${note('Agent image inspection and automated geometry/keyboard checks are recorded in Part 3. The final HUMAN checklist, native browser zoom and final-main captures remain pending; unchecked boxes below are deliberate.')}
    <p>Selected figures in Parts 5-8 show desktop, tablet, mobile and narrow evidence. <a href="${link(`${images}/README.md`)}">Full image index</a> and <a href="${link(`${images}/manifest.json`)}">SHA-256 manifest</a> link all 109 images. Every digest was checked again when generating this draft. Text and links remain selectable. Simulated responses are labelled; all fixture identities are synthetic.</p>
    ${sourceDocument(`${docs}/ui-spec.md`)}
    <h2>Remaining release acceptance</h2>${sourceDocument(`${docs}/release.md`)}`),
];

const css = `
@page { size: A4; margin: 17mm 16mm 19mm; }
@page wide { size: A4 landscape; margin: 17mm 16mm 19mm; }
* { box-sizing: border-box; }
body { font-family: Tahoma, 'Noto Sans Thai', sans-serif; font-size: 9pt; line-height: 1.4; color: #25332d; margin: 0; }
h1, h2, h3, h4 { color: #154b37; break-after: avoid; }
h1 { font-size: 27pt; margin: 3mm 0 1mm; line-height: 1.15; }
h2 { font-size: 14pt; margin: 7mm 0 3mm; }
h3 { font-size: 11pt; margin: 5mm 0 2mm; }
h4 { font-size: 10pt; margin: 4mm 0 2mm; }
p { margin: 2.5mm 0; orphans: 3; widows: 3; }
a { color: #14624b; overflow-wrap: anywhere; text-decoration: underline; }
code { font-family: Consolas, monospace; font-size: 8pt; overflow-wrap: anywhere; }
pre { white-space: pre-wrap; overflow-wrap: anywhere; font-family: Consolas, monospace; font-size: 7.2pt; line-height: 1.4; background: #f1f5f2; padding: 3mm; border-left: 2px solid #8fbca3; }
.two-columns { columns: 2; }
table { border-collapse: collapse; width: 100%; margin: 3mm 0; font-size: 8pt; table-layout: auto; }
thead { display: table-header-group; } tr { break-inside: avoid; }
th, td { border: 0.3mm solid #d8e1da; padding: 1.6mm 2mm; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
th { background: #e6f0e9; font-weight: bold; } td code { font-size: 7.4pt; }
th:first-child, td:first-child { min-width: 11mm; }
.wide-table, .wide-page { page: wide; break-before: page; break-after: page; }
.wide-table th:first-child, .wide-table td:first-child, .wide-page th:first-child, .wide-page td:first-child { min-width: 18mm; }
.wide-page th, .wide-page td { padding: 1.25mm 2mm; }
ul { padding-left: 5mm; } li { margin-bottom: 1.5mm; }
.part { break-before: page; } .part:first-child { break-before: auto; }
.eyebrow { color: #64746c; font-size: 8pt; letter-spacing: 1pt; }
.subtitle { font-size: 14pt; color: #65766c; margin-bottom: 6mm; }
.notice { padding: 4mm; background: #fff5d9; border-left: 1mm solid #b18a30; margin: 4mm 0; }
.source-label { font-size: 8pt; color: #637166; margin: 5mm 0 2mm; padding-top: 2mm; border-top: 0.3mm solid #cbdacf; break-after: avoid; }
.figure-page { break-inside: avoid; margin-top: 6mm; }
.figures { display: flex; gap: 3mm; align-items: flex-start; justify-content: center; }
figure { margin: 0; text-align: center; min-width: 0; flex: 1; }
.image-window { position: relative; overflow: hidden; border: 0.25mm solid #d8e1da; width: 100%; }
.image-window img { width: 100%; height: auto; display: block; position: absolute; left: 0; }
figcaption { font-size: 8pt; margin-top: 2mm; }
.provenance { color: #66736b; font-size: 7pt; margin-top: 4mm; }
`;

(async () => {
  const out = path.join(root, 'output/pdf/lab-3-review-draft.pdf');
  const html = path.join(root, 'tmp/pdfs/lab-3-review-draft.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.mkdirSync(path.dirname(html), { recursive: true });
  fs.writeFileSync(html, `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>TokTickIT Lab 3 - Review Draft</title><style>${css}</style></head><body>${parts.join('\n')}</body></html>`);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.route(/^https?:\/\//, route => route.abort());
    await page.goto(pathToFileURL(html).href);
    await page.evaluate(() => document.fonts.ready);
    const broken = await page.locator('img').evaluateAll(imgs => imgs.filter(img => !img.complete || !img.naturalWidth).map(img => img.alt));
    if (broken.length) throw new Error(`Broken images: ${broken.join(', ')}`);
    await page.pdf({ path: out, printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: '<div style="font-size:8px;color:#65766c;width:100%;padding:0 16mm;display:flex;justify-content:space-between"><span>TOKTICKIT / LAB 03 / REVIEW DRAFT - final-main acceptance pending</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>' });
    console.log(`Generated review draft: ${out}\nVerified ${manifest.files.length} screenshot checksums; source HEAD ${head}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
