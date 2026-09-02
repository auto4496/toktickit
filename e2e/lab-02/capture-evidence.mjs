import { spawnSync } from 'node:child_process';
import path from 'node:path';

const playwrightCli = path.resolve('node_modules', '@playwright', 'test', 'cli.js');
const result = spawnSync(
  process.execPath,
  [playwrightCli, 'test', 'e2e/lab-02/responsive-visual.spec.ts', '--grep', 'VIS-01'],
  {
    stdio: 'inherit',
    env: { ...process.env, LAB2_CAPTURE_EVIDENCE: '1' },
  },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
