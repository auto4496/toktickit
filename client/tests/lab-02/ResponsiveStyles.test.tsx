import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(
  new URL('../../src/styles.css', import.meta.url),
  'utf8',
);

describe('Lab 2 responsive and touch-target styles', () => {
  it('uses the approved mobile breakpoint below 768px', () => {
    expect(styles).toContain('@media (max-width: 767px)');
    expect(styles).not.toContain('@media (max-width: 720px)');
  });

  it('defines 44px minimum targets for Retry and Change Requester controls', () => {
    expect(styles).toMatch(
      /\.state-panel button,[\s\S]*?\.requester-chip button[\s\S]*?min-width:\s*44px;[\s\S]*?min-height:\s*44px;/,
    );
  });
});
