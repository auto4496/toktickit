// Post-merge evidence builder: keeps the tested application checkout unchanged.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '../..');
const evidenceDir = path.join(root, 'output/lab-03-final');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/^\uFEFF/, '');
const evidence = JSON.parse(read('output/lab-03-final/results.json'));
const source = 'b3a65949f3fad3c84ffabbe01707db0d929686f0';
if (evidence.sourceCommit !== source || !['unit','browser','serverBuild','clientBuild'].every(k => evidence[k]?.exitCode === 0)) {
  throw new Error('Complete successful final-main runs are required before rendering.');
}
const reviewed = evidence.humanAcceptance?.reflection === true && evidence.humanAcceptance?.visual === true;
const repo = 'https://github.com/auto4496/toktickit';
const original = read('scripts/lab-03/build-review-report.cjs');
const selected = (text, start, end) => {
  const first = text.indexOf(start), last = end ? text.indexOf(end, first + start.length) : text.length;
  if (first < 0 || last < first) throw new Error(`Missing source section: ${start}`);
  return text.slice(first, last).trim();
};
const tests = read('docs/lab-03/tests.md');
const ai = read('docs/lab-03/ai-use.md');
const overrides = {
  'docs/lab-03/tests.md': '# Test plan and traceability\n\nCurrent execution results below supersede historical staging counts. The rendered plan includes its original scenarios and actual file mapping; earlier duplicate execution histories remain available in the linked source.\n\n' + selected(tests, '## 1. Test-first', '## 4. Verification commands'),
  'docs/lab-03/ai-use.md': '# AI use and Reflection\n\n' + selected(ai, '## Tool and role', '## Verification and limitations') + '\n\n' + selected(ai, '### ร่าง Reflection'),
};
let prefix = original.slice(0, original.indexOf('const graph ='))
  .replace("const images = 'artifacts/lab-03/screenshots/system';", "const images = 'output/lab-03-final/screenshots';")
  .replace("const read = name => fs.readFileSync(path.join(root, name), 'utf8');", "const read = name => overrides[name] ?? fs.readFileSync(path.join(root, name), 'utf8');")
  .replace('return `${repository}/${kind}/lab3-staging/${name.split(\'/\').map(encodeURIComponent).join(\'/\')}`;',
    'return name.startsWith("output/lab-03-final/") ? `${repository}/${kind}/codex/lab3-final-evidence/artifacts/lab-03/final/${name.slice("output/lab-03-final/".length).split("/").map(encodeURIComponent).join("/")}` : `${repository}/${kind}/' + source + '/${name.split("/").map(encodeURIComponent).join("/")}`;')
  .replaceAll('Staging capture', 'Final-main capture')
  .replaceAll('<div class="eyebrow">TOKTICKIT / LAB 03 / REVIEW COPY</div>', '');
const { markdown, part, esc, link } = new Function('require', '__dirname', 'overrides', prefix + '\nreturn {markdown,part,esc,link};')(require, __dirname, overrides);
function figures(title, scenes, description = '') {
 return `<div class="figure-page"><h3>${esc(title)}</h3><p>${esc(description)}</p><div class="figures">${scenes.map(([file,label])=>{
  const bytes=fs.readFileSync(path.join(evidenceDir,'screenshots',file));
  const w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20);
  const login=file.includes('login-') && w>700;
  const cw=login?Math.min(w,680):w,ch=Math.min(h,w<500?844:w<1000?1112:1000);
  const x=(w-cw)/2,y=/staff-private|requester-indication/.test(file)?Math.max(0,h-ch):0;
  const excerpt=cw<w||ch<h;
  const maxHeight=scenes.length===1?145:160;
  return `<figure><div class="image-window" style="aspect-ratio:${cw}/${ch};max-width:${maxHeight*cw/ch}mm;margin:auto"><img style="width:${100*w/cw}%;left:-${100*x/cw}%;top:-${100*y/ch}%;" src="data:image/png;base64,${bytes.toString('base64')}" alt="${esc(label)}"></div><figcaption>${esc(label)}${excerpt?'<br>Labelled detail excerpt':''}<br><a href="${artifact('screenshots/'+file)}">Full-size capture</a></figcaption></figure>`;
 }).join('')}</div><p class="provenance">Actual final-main capture ${esc(evidence.capture.capturedAt)}; source ${source.slice(0,12)}. Synthetic fixture data. ${scenes.some(([f])=>f.includes('simulated'))?'Labelled simulated responses.':''}</p></div>`;
}
const rendered = (file, scope) => `<div class="source-label">Rendered ${esc(scope)}. <a href="${link(file)}">Source document</a>.</div>${markdown(file)}`;
const notice = text => `<div class="notice">${text}</div>`;
const artifact = name => `${repo}/blob/codex/lab3-final-evidence/artifacts/lab-03/final/${name}`;
const graph = execFileSync('git', ['log','--graph','--oneline','--max-count=38',source], {cwd:root,encoding:'utf8'}).trim();
const snapshots = JSON.parse(read('output/lab-03-final/github-review-snapshot.json')).data.repository;
const reviewRows = Object.values(snapshots).filter(p => p && p.number && p.url && p.reviews).map(p => {
  const approval = p.reviews.nodes.filter(r => r.state === 'APPROVED').at(-1);
  if (!approval || !p.mergedAt) throw new Error(`Review not complete for PR ${p.number}`);
  return `<tr><td><a href="${p.url}">#${p.number}</a></td><td>${esc(p.title)}</td><td>${esc(approval.author.login)}<br>${esc(approval.submittedAt)}</td><td><code>${esc(p.mergeCommit.oid.slice(0,12))}</code></td></tr>`;
}).join('');
const passingLogs = ['unit.log','browser.log','server-build.log','client-build.log'].map(file => {
  const raw = read(`output/lab-03-final/${file}`).replace(/\x1b\[[0-9;]*[A-Za-z]/g,'').replace(/\r/g,'').replace(/\n(?:[ \t]*\n)+/g,'\n');
  return `<h3>${esc(file)}</h3><pre class="log">${esc(raw)}</pre>`;
}).join('');
const resultTable = `<table><thead><tr><th>Check</th><th>Actual result on main</th><th>Full output</th></tr></thead><tbody>${[
  ['Unit / API / UI / regression',evidence.unit.summary,'unit.log'],
  ['Browser journeys',evidence.browser.summary,'browser.log'],
  ['Server build','Passed; exit 0','server-build.log'],
  ['Client build','Passed; exit 0','client-build.log'],
].map(([name,result,file]) => `<tr><td>${name}</td><td>${esc(result)}</td><td><a href="${artifact(file)}">${file}</a></td></tr>`).join('')}</tbody></table>`;
const ui = read('docs/lab-03/ui-spec.md');
overrides['docs/lab-03/ui-spec.md'] = '# UI specification and visual inspection\n\nThe screen definitions below retain the reviewed design contract. Final-main image inspection and human acceptance are reported separately after the specification.\n\n' + selected(ui, '## 1. Visual direction', 'Final human visual checklist');
const parts = [
 part(1,'Repository and collaboration', `<p><strong>Phanuwit Butchari - 67070501070 (auto4496)</strong><br>Peer: Pitchai Chadchuangchot - 67070501068 (Datakung)</p>
 ${reviewed ? '' : notice('<strong>Student acceptance pending.</strong> Final-main technical evidence is complete. The student still needs to read/adapt the Reflection and confirm the final human visual checks before this copy is submitted. Issue #30 remains open until then.')}
 <p><a href="${repo}">Repository</a> | <a href="https://github.com/users/auto4496/projects/1">Project board</a> | <a href="${repo}/issues/30">Release acceptance #30</a></p>
 <p>Application source of truth: merged main <code>${source}</code>. Feature branches were reviewed into lab3-staging; PR #36 integrated staging into main on 2026-09-26. Final-main runs and screenshot metadata in this report identify this exact source, rather than relabelling staging results.</p>
 <h2>Rendered reviewer record - current completed reviews</h2><p>Condensed from <a href="${link('docs/lab-03/reviewer.md')}">reviewer.md</a> and the <a href="${artifact('github-review-snapshot.json')}">actual GitHub review records</a>. Dates below are UTC.</p><table><thead><tr><th>PR</th><th>Scope</th><th>Approval</th><th>Merge</th></tr></thead><tbody>${reviewRows}</tbody></table>
 <p>Real findings and responses: <a href="${repo}/pull/31">#31 board/document alignment</a>; <a href="${repo}/pull/32">#32 CSRF refresh and intended-route recovery</a>; <a href="${repo}/pull/33#discussion_r4023073618">#33 lost-response conversation recovery</a>; <a href="${repo}/pull/34#discussion_r4060222962">#34 dirty-navigation protection</a> and <a href="${repo}/pull/34#discussion_r4060222970">specific browser success assertions</a>. Corrections preceded the peer approvals above. Author responses to #34: <a href="${repo}/pull/34#discussion_r4072766062">navigation fix</a>, <a href="${repo}/pull/34#discussion_r4072767621">assertion fix</a>. PR #35 independently repeated all 389 tests, 17 browser journeys, both builds and 109 image checksum checks. PR #36 approved integration with a <a href="${repo}/pull/36#discussion_r4111152609">non-blocking migration-runbook suggestion</a>; the corrected post-merge runbook is linked in Part 3.</p>
 <h2>Repository history</h2><pre>${esc(graph)}</pre>
 <h2>Setup, ignore rules and structure</h2><p><a href="${link('README.md')}">README setup/build/test instructions</a> and <a href="${link('.gitignore')}">.gitignore</a> retain environment files, initial-password files, dependencies, uploads and generated temporary output outside version control. Only curated evidence is published. The main screenshot manifest is refreshed separately in the final evidence bundle.</p><pre>client/src, client/tests       - React screens and component tests
server/src, server/tests       - API, authorization and regression suites
server/prisma                 - schema, committed migrations and seed
e2e/lab-02, e2e/lab-03         - retained and new browser journeys
docs/lab-03                   - reviewed specifications and history
artifacts/lab-03              - curated visual and release evidence
.env.example, .env.test.example - local configuration templates</pre>
 <p>Work items #25-29 are complete. #30 tracks post-merge acceptance; its final status must match the actual student acceptance rather than the earlier automatic close on merge.</p>`),
 part(2,'Specification and acceptance contract', `<p>The contract was reviewed in PR #31 before feature implementation. <a href="${repo}/commit/b006797c3fb185a36f84992bb99cfd453bc90e60">Original contract commit</a>. The specification below is the complete reviewed source on main, including original planning and Definition of Done checkboxes. Current execution status is established by Parts 1, 3 and 9; original contract checkboxes are not a claim of a student action.</p>${rendered('docs/lab-03/specification.md','specification.md, complete contract')}<p>Companion <a href="${link('docs/lab-03/api-spec.md')}">API contract</a>.</p>`),
 part(3,'Test plan and final-main execution', `<p>All runs used application main <code>${source}</code>, isolated test databases and sequential execution. Unit/API database: <code>${esc(evidence.unit.database)}</code>. Browser database: <code>${esc(evidence.browser.database)}</code>. Full command timestamps, exit codes and starting source status are in <a href="${artifact('results.json')}">results.json</a>.</p>${resultTable}
 <p><a href="${artifact('test-database-runbook.md')}">Corrected fresh-database runbook</a>: generate Prisma, temporarily point DATABASE_URL at the guarded test database, run <code>prisma migrate deploy</code>, restore the original environment, and only then run <code>npm test</code>. Browser global setup applies its own migrations/seeds to the separate guarded target. <a href="${artifact('migration.log')}">Actual migration output</a> confirms all three committed migrations were applied. Docker/memory preparation interruptions are recorded separately and are not counted as application test failures or passes.</p>
 ${rendered('docs/lab-03/tests.md','current test-first plan, complete scenario/file matrix and ownership mapping; repeated staging execution history omitted')}
 <h2>Complete final-main passing command output</h2><p>Console styling and redundant blank lines are normalized for readability. The linked text logs retain the full original output. These are new main runs, not copied staging summaries.</p>${passingLogs}`),
 part(4,'AI use and Reflection', `${reviewed ? '' : notice('The Reflection below is an explicitly identified AI draft based on actual project events. Student reading/adaptation remains pending; no personal understanding or manual testing is inferred.')}${rendered('docs/lab-03/ai-use.md','tool identity, all nine selected real prompts, and Reflection draft; repeated implementation diary omitted')}`),
 part(5,'Authentication', `<p>Real browser and API tests cover valid/invalid/inactive credentials, first-login password change, role landing, logout and direct access after invalidation. Busy/failure presentation states use explicitly labelled controlled responses; API failure/authorization checks are separate evidence.</p>
 ${figures('Login validation',[['system-states/desktop-login-invalid.png','Desktop - invalid login']])}
 ${figures('Password change and recovery',[['system-states/tablet-login-failure-simulated.png','Tablet - simulated failure'],['system-states/mobile-change-password.png','Mobile - mandatory password change']])}`),
 part(6,'Queue and ticket lookup', `<p>Queue query semantics, page/sort/owner filters and authorization are verified by real API tests. Browser evidence checks filtering, results, empty/no-results/failure feedback and responsive geometry. Realistic synthetic tickets contain varied priority, owner and state values.</p>
 ${figures('Desktop queue',[['staff-workflow/1440-queue.png','Desktop - realistic queue']])}
 ${figures('Tablet and mobile queue',[['staff-workflow/834-queue.png','Tablet - ticket cards'],['staff-workflow/390-queue.png','Mobile - filters and queue']],'Empty/no-results and explicitly simulated failure captures are included in the full image index.')}`),
 part(7,'Ticket workflow and role protection', `<p>API/browser tests verify claim/reassignment, IT priority, all status edges, version conflicts, terminal restrictions, public/private separation, retained attachment access and Requester resolution indication. A real transaction rollback case verifies that a failed append leaves no persisted comment or ticket timestamp update.</p>
 ${figures('Staff ticket operations',[['system-states/desktop-staff-public.png','Desktop - ticket operations']])}
 ${figures('Private notes and Requester indication',[['system-states/mobile-staff-private.png','Mobile - private composer'],['system-states/mobile-requester-indication.png','Requester - public conversation and indication']], 'Full-size captures include attachment controls. The index additionally includes restricted Admin views. Direct API tests establish authorization.')}`),
 part(8,'Administrator user management', `<p>Account lifecycle tests cover directory/search, create/edit, normalized unique email, exactly one role, activity, initial-password reset and mandatory change. Concurrent API tests protect the last active Admin and active ticket owners. Dirty-navigation browser regressions cover menu and native Back/Forward cancellation.</p>
 ${figures('Directory and creation validation',[['system-states/desktop-admin-create-validation.png','Desktop - directory and creation validation']])}
 ${figures('Editor and password reset',[['user-management/editor-834.png','Tablet - account editor'],['user-management/reset-390.png','Mobile - reset dialog']])}`),
 part(9,'UI specification and final visual evidence', `<p>Capture source <code>${source}</code>; timestamp <code>${esc(evidence.capture.capturedAt)}</code>. All ${evidence.capture.files} screenshot hashes match. Viewports: 1440x900, 834x1112, 390x844 and 320x900. <a href="${artifact('screenshots/README.md')}">Complete image index</a> and <a href="${artifact('capture-provenance.json')}">final-main provenance</a>. Labelled excerpts preserve readability; original full-page PNGs remain linked.</p>
 ${rendered('docs/lab-03/ui-spec.md','complete screen/design/responsive specification, with current inspection recorded below')}
 <h2>Inspection and acceptance</h2>${markdown('output/lab-03-final/visual-inspection.md')}
 <p>${reviewed ? 'Student Reflection and human visual acceptance are recorded in results.json.' : 'Student Reflection reading/adaptation and final human visual acceptance remain pending. Do not mark Issue #30 Done or submit this copy until those steps are recorded.'}</p>`),
];
const css = original.split('const css = `')[1].split('`;')[0] + `
body { font-size:8.7pt; line-height:1.32; }
h2 { margin-top:5mm; } h3 { margin-top:3mm; }
table { font-size:7.7pt; } th,td {padding:1.2mm 1.6mm;}
.wide-page th,.wide-page td {padding:1.1mm 1.6mm;}
pre.log {font-size:7pt; line-height:1.25; white-space:pre-wrap;}
`;
(async () => {
 const html = path.join(root,'tmp/pdfs/lab-3-submission.html');
 const output = path.join(root,'output/pdf/lab-3-submission.pdf');
 fs.mkdirSync(path.dirname(html),{recursive:true});fs.mkdirSync(path.dirname(output),{recursive:true});
 fs.writeFileSync(html,`<!doctype html><html lang="en"><meta charset="utf-8"><title>TokTickIT Lab 3 - Final-main evidence</title><style>${css}</style><body>${parts.join('\n')}</body></html>`);
 const browser=await chromium.launch({headless:true});
 try {
  const page=await browser.newPage();await page.route(/^https?:\/\//,r=>r.abort());await page.goto(pathToFileURL(html).href);await page.evaluate(()=>document.fonts.ready);
  if(await page.locator('img').evaluateAll(imgs=>imgs.some(i=>!i.complete||!i.naturalWidth)))throw new Error('Broken image');
  await page.pdf({path:output,printBackground:true,preferCSSPageSize:true,displayHeaderFooter:true,headerTemplate:'<div></div>',footerTemplate:`<div style="font-size:8px;color:#65766c;width:100%;padding:0 16mm;display:flex;justify-content:flex-end"><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`});
  console.log(output);
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
