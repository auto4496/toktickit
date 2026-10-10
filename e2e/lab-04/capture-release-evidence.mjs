import { spawnSync, execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

// Complete integrated browser run first. Never publish partial/failed-run captures.
const result = spawnSync(process.execPath, [path.resolve('node_modules/@playwright/test/cli.js'), 'test', '--config', 'playwright.release.config.ts'], { stdio: 'inherit', env: process.env });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
const requested = [];
for (const width of [1440, 834, 390]) {
  for (const scene of ['requester-read-only', 'staff-started', 'start-conflict']) requested.push({ source: `test-results/lab-04/actions/screenshots/${scene}-${width}.png`, target: `actions/${scene}-${width}.png`, width });
  for (const scene of ['resolution-blocked', 'resolution-ready', 'resolution-closed', 'resolution-gate-rejected']) requested.push({ source: `test-results/lab-04/workflow/${scene}-${width}.png`, target: `workflow/${scene}-${width}.png`, width });
  for (const scene of ['requester', 'staff', 'admin', 'loading-simulated', 'failure-simulated', 'empty', 'forbidden-simulated']) requested.push({ source: `test-results/lab-04/dashboards/${scene}-${width}.png`, target: `dashboards/${scene}-${width}.png`, width });
  for (const scene of ['action-create', 'action-validation', 'action-edit']) requested.push({ source: `test-results/lab-04/release-forms/${scene}-${width}.png`, target: `forms/${scene}-${width}.png`, width });
  for (const scene of ['staff', 'requester']) requested.push({ source: `test-results/lab-04/actions-taken/${scene}-${width}.png`, target: `multiple-actions/${scene}-${width}.png`, width });
}
for (const [name, width] of [['desktop', 1440], ['tablet', 834], ['mobile', 390]]) {
  for (const scene of ['login-ready', 'staff-public', 'staff-private', 'staff-conflict', 'requester-public-attachment', 'admin-create-validation']) requested.push({ source: `test-results/lab-03/system-states/${name}-${scene}.png`, target: `regression/${name}-${scene}.png`, width });
}
// Read and validate the complete set before touching curated output.
const images = [];
for (const file of requested) {
  const data = await readFile(path.resolve(file.source));
  if (data.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || data.readUInt32BE(16) !== file.width) throw new Error(`Invalid capture: ${file.source}`);
  images.push({ data, entry: { path: `screenshots/${file.target}`, width: file.width, height: data.readUInt32BE(20), bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') } });
}
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const target = path.resolve('artifacts/lab-04/release');
const manifest = { observedAt: new Date().toISOString(), suite: 'playwright.release.config.ts: all Lab 2-4 browser specs passed', baseline: git('rev-parse', 'HEAD'), branch: git('branch', '--show-current'), workingTree: git('status', '--porcelain'), viewports: ['1440x900', '834x1112', '390x844', '320x900 overflow checks'], note: 'Author feature-branch evidence. Final-main evidence requires a fresh run after reviewed integration.', files: images.map(image => image.entry) };
for (const image of images) {
  await mkdir(path.dirname(path.join(target, image.entry.path)), { recursive: true });
  await writeFile(path.join(target, image.entry.path), image.data);
}
await writeFile(path.join(target, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Published ${images.length} integrated release screenshots with SHA-256 manifest.`);
