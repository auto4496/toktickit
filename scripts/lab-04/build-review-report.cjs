/* LAB4 report: main runtime evidence is distinct from report-source/student acceptance. */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '../..');
const repository = 'https://github.com/auto4496/toktickit';
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const head = git('rev-parse', 'HEAD');
const branch = git('branch', '--show-current');
const esc = value => String(value).replace(/[\u2010-\u2015\u2212]/g, '-').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const localLinks = new Set();
const link = name => {
  name = name.split('#')[0];
  const local = path.resolve(root, name);
  if (!local.startsWith(root + path.sep) || !fs.existsSync(local)) throw new Error(`Missing/unsafe repository link: ${name}`);
  localLinks.add(name);
  return `${repository}/${fs.statSync(local).isDirectory() ? 'tree' : 'blob'}/${branch}/${name.split('/').map(encodeURIComponent).join('/')}`;
};
const evidence = 'artifacts/lab-04/final-main';
const manifest = JSON.parse(read(`${evidence}/manifest.json`));
const mainVerification = JSON.parse(read(`${evidence}/verification.json`));
if (manifest.baseline !== mainVerification.mainMerge || mainVerification.runs.some(run => run.exitCode !== 0 || run.source !== manifest.baseline)) throw new Error('Invalid main evidence provenance');
for (const entry of manifest.files) {
  const file = path.resolve(root, evidence, entry.path);
  if (!file.startsWith(path.resolve(root, evidence) + path.sep)) throw new Error('Unsafe capture path');
  const data = fs.readFileSync(file);
  if (data.length !== entry.bytes || createHash('sha256').update(data).digest('hex') !== entry.sha256) throw new Error(`Capture checksum mismatch: ${entry.path}`);
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
    if (/^\d+\. /.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) items.push(`<li>${inline(lines[i++].replace(/^\d+\. /, ''), source)}</li>`);
      out.push(`<ol>${items.join('')}</ol>`); continue;
    }
    const paragraph = [line]; i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,6} |\||```|\s*[-*] )/.test(lines[i])) paragraph.push(lines[i++]);
    out.push(`<p>${inline(paragraph.join(' '), source)}</p>`);
  }
  return out.join('\n').replace(/(<h[2-4]>[^<]*Planned tests<\/h[2-4]>\s*<p>[\s\S]*?<\/p>\s*)(<table class="wide-table">[\s\S]*?<\/table>)/g,
    (_, introduction, table) => `<div class="wide-page">${introduction}${table.replace('class="wide-table"', '')}</div>`);
}


const source = (name, html = markdown(name)) => `<p class="source-label">Rendered repository source: <a href="${link(name)}">${esc(name)}</a></p>${html}`;
const part = (number, title, content) => `<section class="part"><p class="eyebrow">TOKTICKIT / LAB 04 / REVIEW DRAFT</p><h1>Answer Part ${number}</h1><h2>${esc(title)}</h2>${content}</section>`;
const notice = text => `<div class="notice">${text}</div>`;
function figure(file, caption, { crop = 900, bottom = false, x = 0, y, regionWidth, maxHeight } = {}) {
  const item = manifest.files.find(entry => entry.path === `screenshots/${file}`);
  if (!item) throw new Error(`Missing selected capture: ${file}`);
  const bytes = fs.readFileSync(path.join(root, evidence, item.path));
  const visible = Math.min(item.height, crop);
  const offset = y ?? (bottom ? item.height - visible : 0);
  const width = regionWidth ?? item.width;
  if (x < 0 || offset < 0 || x + width > item.width || offset + visible > item.height) throw new Error(`Invalid report excerpt: ${file}`);
  const excerpt = visible < item.height || width < item.width;
  return `<figure style="--image-ratio:${width / visible}${maxHeight ? `;--image-height:${maxHeight}mm` : ''}"><div class="image-window" style="aspect-ratio:${width}/${visible}"><img style="left:-${x / width * 100}%;top:-${offset / visible * 100}%;width:${item.width / width * 100}%" src="data:image/png;base64,${bytes.toString('base64')}" alt="${esc(caption)}"></div><figcaption>${esc(caption)}${excerpt ? ` - ${y !== undefined || regionWidth ? 'focused' : bottom ? 'bottom' : 'top'} excerpt` : ''}. <a href="${link(`${evidence}/${item.path}`)}">Full-size capture</a></figcaption></figure>`;
}
const plate = (title, content, landscape = false) => `<div class="plate${landscape ? ' landscape' : ''}"><h3>${esc(title)}</h3>${content}<p class="provenance">Captured ${esc(manifest.observedAt)}; ${esc(manifest.baseline.slice(0, 12))}. Synthetic fixture accounts/data. Files labelled simulated use controlled browser responses.</p></div>`;
const columns = (...items) => `<div class="figures">${items.join('')}</div>`;
const doc = name => `docs/lab-04/${name}.md`;
const status = notice('All six increments and the staging-to-main release are peer-approved and merged. Fresh runtime evidence comes from actual main merge 7a697d2. This report contains edited technical prompt summaries and verified model IDs. Student final review/demonstration/native zoom and the all-Issues-Done closeout remain pending; this is a review draft.');
const graph = git('log', '--graph', '--oneline', '--first-parent', '-10', 'HEAD');
const directory = `client/src/{Dashboard,ActionsTaken,StaffTicketDetail}.tsx\nclient/tests/lab-04/\nserver/src/{actions-taken,dashboards,workflow-rules}.ts\nserver/prisma/{schema.prisma,migrations/}\nserver/tests/lab-04/\ne2e/lab-04/\ndocs/lab-04/\nartifacts/lab-04/{actions,workflow,dashboards,release,final-main}/\nscripts/lab-04/build-review-report.cjs`;
const reviewHtml = markdown(doc('reviewer'));
const reviewTables = [...reviewHtml.matchAll(/<table[\s\S]*?<\/table>/g)];
const reviewExcerpt = reviewHtml.split('<h3>Author document check')[0] + '<p>Selected current record; historical findings and correction replies are retained in the linked full source.</p><div class="review-record">' + reviewTables.at(-1)[0] + '</div>';
const testsHtml = markdown(doc('tests')).split('<h3>INT-02 isolated migration recovery scenario</h3>')[0];
const parts = [
  part(1, 'Git Use with Engineering Workflow', `<p>Phanuwit Butchari - 67070501070 - auto4496<br>Peer: Pitchai Chadchuangchot - 67070501068 - Datakung</p>${status}<p><a href="${repository}">Repository</a> | <a href="https://github.com/users/auto4496/projects/1">Project board</a> | <a href="${link(doc('issue-plan'))}">Six work items</a> | <a href="${link(doc('release'))}">Remaining release gates</a></p>${source(doc('reviewer'), reviewExcerpt)}<h3>Actual commit history through reviewed main integration</h3><pre>${esc(graph)}</pre><h3>README, ignore rules and directory structure</h3><p><a href="${link('README.md')}">Current README</a> documents LAB4 setup, data-preserving upgrade, guarded tests, all-suite capture and the six-step demo. <a href="${link('.gitignore')}">.gitignore</a> excludes credentials, dependencies, builds, temporary files, generated test-results and local report output. Curated evidence is explicitly published after successful verification.</p><pre>${esc(directory)}</pre>`),
  part(2, 'Spec DD', `<p>The engineering contract existed in commit dd34049 and was independently approved through <a href="${repository}/pull/39">PR #39</a> before foundation and feature completion. Later implementation/review corrections remain identifiable in Git history.</p>${source(doc('specification'))}`),
  part(3, 'Test DD and Traceability', `${notice('Complete fresh results below were run from clean main merge 7a697d24120977cfdabc7470c41f88d44fdf2f30. Report preparation changes documents only; command/source-state provenance remains attached to the tested main source.')}<p><strong>484 tests / 48 files; 32 complete browser cases; both builds passed.</strong> Source commits and command history: <a href="${link(doc('main-verification'))}">observed verification</a>.</p>${source(doc('tests'), testsHtml)}<h3>Complete unit/API/integration/component output</h3><pre>${esc(read(`${evidence}/vitest-output.txt`))}</pre><h3>Complete integrated browser output</h3><pre>${esc(read(`${evidence}/browser-output.txt`))}</pre><h3>Production build output</h3><pre>${esc(read(`${evidence}/build-server-output.txt`) + '\n' + read(`${evidence}/build-client-output.txt`))}</pre><h3>Scale and recovery evidence</h3><p>5,000 Tickets / 10,000 Actions: Requester 40.12ms / 1,312 bytes; Staff 31.93ms / 1,568 bytes, five recent rows each. Metrics match independent DB queries; SELECT counts stay five/six. These are single local smoke observations, not production performance guarantees. <a href="${link(`${evidence}/dashboard-smoke.json`)}">Six natural EXPLAIN ANALYZE/BUFFERS plans and counts</a>. Full aggregates may correctly scan the fixture.</p><p>The full suite repeats real pg_dump/pg_restore recovery, complete record/constraint preservation, attachment hashes, authenticated download and removed-file 404. <a href="${link(`${evidence}/recovery.json`)}">Current credential-free recovery evidence</a>.</p>`),
  part(4, 'AI Use with Reflection', source(doc('ai-use'))),
  part(5, 'Working IT Staff Dashboard UI', `<p>Three operational cards, all status/IT Priority counts and at most five recent Tickets are computed by the backend in one repeatable-read snapshot. Follow-ups count assigned unfinished Actions on open Tickets; the drill-down contains distinct Tickets. API/browser tests compare metrics and query intersections. Admin retains Users and its own follow-up scope.</p>${plate('Staff dashboard - desktop', figure('dashboards/staff-1440.png', 'Authoritative counts and concise operational links', { crop: 900 }), true)}${plate('Staff/Admin - tablet and mobile', columns(figure('dashboards/staff-834.png', 'Staff tablet', { crop: 1112 }), figure('dashboards/admin-390.png', 'Admin mobile: same operational dashboard', { crop: 1000 })))}${plate('Dashboard feedback: real empty data and simulated response states', columns(figure('dashboards/empty-390.png', 'Real empty Requester account'), figure('dashboards/loading-simulated-390.png', 'Delayed response: loading'), figure('dashboards/failure-simulated-390.png', 'Simulated 503: safe retry'), figure('dashboards/forbidden-simulated-390.png', 'Simulated 403: role feedback')), true)}`),
  part(6, 'Working Actions Taken UI', `<p>Two Staff and Admin record different Actions under one Ticket. Assignee and authenticated performer are distinct. Real APIs enforce active assignees, validation, roles, stale versions, idempotency and atomic append-only revisions. Start/busy/keyboard, completion, cancel and both response-loss recovery paths pass. Requesters see shared fields without mutation/history controls.</p>${plate('Create Action - tablet form', figure('forms/action-create-834.png', 'Date, description, Result, assignee, follow-up and Attachment Notes', { crop: 1050, bottom: true }))}${plate('Edit and required-field validation - mobile', columns(figure('forms/action-edit-390.png', 'Edit preserves values; CREATED and EDITED verified', { crop: 1000, bottom: true }), figure('forms/action-validation-390.png', 'Missing required follow-up note focuses the field and retains draft', { crop: 1000, bottom: true })))}${plate('Multiple Actions and Requester read-only visibility', columns(figure('multiple-actions/staff-834.png', 'Two Staff and Admin: multiple retained Actions', { crop: 1000, bottom: true }), figure('actions/requester-read-only-390.png', 'Requester Action detail: mutation controls absent', { crop: 900, bottom: true })))}${plate('Start and real competing-version recovery - desktop', columns(figure('actions/staff-started-1440.png', 'Started state with actor/revision', { x: 190, regionWidth: 1060, crop: 650, bottom: true }), figure('actions/start-conflict-1440.png', 'Real stale version; Reload latest', { x: 190, regionWidth: 1060, crop: 650, bottom: true })), true)}`),
  part(7, 'Working Ticket Workflow', `<p>All 64 Ticket status edges are verified. Formal Resolve requires at least one COMPLETED Action with a nonblank Result and no unfinished Actions, checked under the same Ticket lock as Action writes. Requester indication is advisory. Admin's Action privileges do not grant Ticket status permission. Closing/reopening retains Action history and stable ordering.</p>${plate('Resolution ready - desktop', figure('workflow/resolution-ready-1440.png', 'Server readiness and Staff status controls', { x: 900, y: 365, regionWidth: 350, crop: 800, maxHeight: 140 }))}${plate('Blocked and competing-write feedback - tablet/mobile', columns(figure('workflow/resolution-blocked-834.png', 'Blocked: no documented completed work', { y: 700, crop: 1000 }), figure('workflow/resolution-gate-rejected-390.png', 'A real competing unfinished Action invalidates readiness', { y: 1100, crop: 1000 })))}<p><a href="${link(`${evidence}/screenshots/workflow/resolution-closed-1440.png`)}">Closed-state capture</a>; the complete real-browser journey also checks reopening and preserved Action history.</p>`),
  part(8, 'Working Requester Dashboard and Final Regression UI', `<p>Requester metrics/recent rows are strictly owned; open/waiting cards and recent details lead to real matching screens. Tests verify direct other-user denial, inclusive UTC boundaries, deterministic ordering and one concurrent snapshot. Full retained browser cases cover authentication, My Tickets, files, public/private conversations, Staff and account management.</p>${plate('Requester dashboard - desktop', figure('dashboards/requester-1440.png', 'Owned counts and recent/attention-required Tickets', { crop: 900 }), true)}${plate('Requester dashboard - tablet/mobile', columns(figure('dashboards/requester-834.png', 'Tablet card wrapping and keyboard focus', { crop: 1112 }), figure('dashboards/requester-390.png', 'Mobile stacked cards and owned recent rows', { crop: 1000 })))}${plate('Representative retained regression - mobile', columns(figure('regression/mobile-login-ready.png', 'Real login screen'), figure('regression/mobile-requester-public-attachment.png', 'Requester attachment/public conversation', { y: 750, crop: 1000 }), figure('regression/mobile-admin-create-validation.png', 'Administrator validation placement', { crop: 1000 })), true)}<p><a href="${link(`${evidence}/screenshots/regression/desktop-staff-private.png`)}">Private Staff note capture</a> and <a href="${link(`${evidence}/screenshots/regression/desktop-staff-conflict.png`)}">real Staff conflict capture</a>. The browser output includes all retained responsive cases. The fresh main run includes these retained journeys; complete output is in Answer Part 3.</p>`),
  part(9, 'Zen Green UI, Responsive, Accessibility and Final Polish', `${source(doc('ui-spec'))}${source(doc('visual-accessibility'))}<p><a href="${link(`${evidence}/manifest.json`)}">All 75 captures and checksums</a>; <a href="${link(doc('release'))}">final release checklist</a>. Model IDs are verified and the technical prompt/Reflection section is updated. Student final review, demonstration and native zoom, followed by final Issue/Project closeout, remain before submission.</p>`),
];
const css = `
@page{size:A4;margin:15mm 16mm 18mm} @page wide{size:A4 landscape;margin:14mm 16mm 17mm}
*{box-sizing:border-box}body{font-family:Tahoma,'Noto Sans Thai',sans-serif;font-size:9pt;line-height:1.4;color:#25372e;margin:0}
h1,h2,h3,h4{color:#17573d;break-after:avoid}h1{font-size:22pt;line-height:1.2;margin:2mm 0}h2{font-size:14pt;margin:2mm 0 5mm}h3{font-size:11pt;margin:5mm 0 3mm}h4{font-size:10pt}
p{margin:2.5mm 0;orphans:3;widows:3}a{color:#006b3c;overflow-wrap:anywhere}code{font-family:Consolas,monospace;font-size:8pt}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:7.5pt/1.35 Consolas,monospace;background:#f2f6f3;padding:3mm;border-left:1mm solid #b2cdbd}
.review-record th:nth-child(1){width:25mm}.review-record th:nth-child(2){width:20mm}.review-record th:nth-child(3){width:9mm}.review-record th:last-child{width:34mm}table{border-collapse:collapse;width:100%;font-size:8pt;margin:3mm 0}th,td{border:.25mm solid #cbd9d0;padding:1.5mm;vertical-align:top;overflow-wrap:anywhere}th{background:#e7f0e9}thead{display:table-header-group}tr{break-inside:avoid}ul{padding-left:5mm}li{margin:1mm 0}
.part{margin-top:7mm}.part:first-child{margin-top:0}.eyebrow{font-size:7.5pt;letter-spacing:1pt;color:#63786b}.notice{padding:3mm;background:#fff5d9;border-left:1mm solid #b28e31;margin:4mm 0}.source-label{font-size:7.5pt;color:#657a6b;margin-top:4mm;border-top:.25mm solid #cbd9d0;padding-top:2mm;break-after:avoid}
.wide-table{page:wide;break-before:page;break-after:page;font-size:7.7pt}.wide-table td{padding:1.3mm}.wide-table{table-layout:fixed}.wide-table th:nth-child(1){width:12mm}.wide-table th:nth-child(2){width:20mm}.wide-table th:nth-child(3){width:15mm}.wide-table th:nth-child(4){width:58mm}.wide-table th:nth-child(5){width:36mm}.wide-table th:nth-child(6){width:60mm}.wide-table th:nth-child(7){width:63mm}.plate{break-inside:avoid;margin-top:6mm;--image-height:170mm;--image-width:177mm}.landscape{page:wide;--image-height:125mm;--image-width:264mm}.plate h3{margin-top:0}.figures{display:flex;gap:4mm;align-items:flex-start;justify-content:center}.figures figure{flex:0 1 auto;min-width:0}
figure{margin:0 auto;width:min(var(--image-width),calc(var(--image-height) * var(--image-ratio)))}.image-window{position:relative;overflow:hidden;border:.25mm solid #ccd8d2;width:100%}.image-window img{position:absolute;left:0;width:100%;height:auto}figcaption{font-size:8pt;margin-top:2mm}.provenance{font-size:7pt;color:#607566;margin-top:3mm}
`;
(async () => {
  const out = path.join(root, 'output/pdf/lab-4-review-draft.pdf');
  const html = path.join(root, 'tmp/pdfs/lab-4-review-draft.html');
  fs.mkdirSync(path.dirname(out), { recursive: true }); fs.mkdirSync(path.dirname(html), { recursive: true });
  fs.writeFileSync(html, `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>TokTickIT LAB4 Review Draft</title><style>${css}</style></head><body>${parts.join('\n')}</body></html>`);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.route(/^https?:\/\//, route => route.abort());
    await page.goto(pathToFileURL(html).href); await page.evaluate(() => document.fonts.ready);
    const broken = await page.locator('img').evaluateAll(imgs => imgs.filter(img => !img.complete || !img.naturalWidth).map(img => img.alt));
    if (broken.length) throw new Error(`Broken PDF images: ${broken.join(', ')}`);
    await page.pdf({ path: out, printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true, headerTemplate: '<div></div>', footerTemplate: '<div style="font:8px Tahoma;color:#607566;width:100%;padding:0 16mm;display:flex;justify-content:space-between"><span>TOKTICKIT / LAB 04 / REVIEW DRAFT - student acceptance pending</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>' });
    fs.writeFileSync(path.join(root, 'tmp/pdfs/report-provenance.json'), JSON.stringify({ generatedAt: new Date().toISOString(), head, branch, workingTree: git('status', '--porcelain'), mainRuntimeSource: manifest.baseline, captures: manifest.files.length, localLinksChecked: [...localLinks].sort(), reportSha256: createHash('sha256').update(fs.readFileSync(out)).digest('hex') }, null, 2) + '\n');
    console.log(`Review PDF generated; ${manifest.files.length} capture hashes and ${localLinks.size} repository targets verified. Source ${head}.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
