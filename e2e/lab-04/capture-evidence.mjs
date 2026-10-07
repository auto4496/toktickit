import { spawnSync, execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

// Routine runs write only ignored test-results. Publish only after the entire suite passes.
const result = spawnSync(process.execPath, [path.resolve('node_modules/@playwright/test/cli.js'), 'test', '--config', 'playwright.actions.config.ts'], { stdio: 'inherit', env: process.env });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

const source = path.resolve('test-results/lab-04/actions/screenshots');
const target = path.resolve('artifacts/lab-04/actions');
const images = [];
for (const scene of ['requester-read-only', 'staff-started', 'start-conflict']) {
  for (const width of [1440, 834, 390]) {
    const name = `${scene}-${width}.png`;
    const data = await readFile(path.join(source, name));
    if (data.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || data.readUInt32BE(16) !== width) throw new Error(`Invalid screenshot: ${name}`);
    images.push({ data, entry: { path: `screenshots/${name}`, width, height: data.readUInt32BE(20), bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') } });
  }
}
const manifest = {
  observedAt: new Date().toISOString(),
  browserChecks: 'Complete Actions suite passed before publication; see docs/lab-04/actions.md for the observed count.',
  baseCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  viewports: ['1440x900', '834x1112', '390x844'],
  files: images.map(image => image.entry),
};
await mkdir(path.join(target, 'screenshots'), { recursive: true });
for (const image of images) await writeFile(path.join(target, image.entry.path), image.data);
await writeFile(path.join(target, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Published ${images.length} Actions screenshots with refreshed SHA-256 manifest.`);
