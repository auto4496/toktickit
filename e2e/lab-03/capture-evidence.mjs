import { spawnSync, execFileSync } from 'node:child_process';
import { mkdir, readdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

// Capture only after the complete suite succeeds. Routine runs never replace evidence.
const result = spawnSync(process.execPath, [path.resolve('node_modules/@playwright/test/cli.js'), 'test', '--config', 'playwright.staff.config.ts'], { stdio: 'inherit', env: process.env });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
const source = path.resolve('test-results/lab-03');
const target = path.resolve('artifacts/lab-03/screenshots/system');
const files = [];
async function copy(directory, relative = '') {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const name = path.join(relative, item.name);
    if (item.isDirectory()) await copy(path.join(directory, item.name), name);
    else if (item.name.endsWith('.png')) {
      const destination = path.join(target, name);
      await mkdir(path.dirname(destination), { recursive: true });
      await copyFile(path.join(source, name), destination);
      files.push({ path: name.replaceAll('\\', '/'), sha256: createHash('sha256').update(await readFile(destination)).digest('hex') });
    }
  }
}
await copy(source);
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
await writeFile(path.join(target, 'manifest.json'), JSON.stringify({ capturedAt: new Date().toISOString(), baseCommit: git('rev-parse', 'HEAD'), workingTree: git('status', '--porcelain'), note: 'Integrated staging verification, not final-main or peer approval. Simulated UI errors are labelled in scene names. See system-verification.md.', files }, null, 2) + '\n');
console.log(`Captured ${files.length} Lab 3 screenshots with SHA-256 manifest.`);
