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

  it('stacks Create Ticket grids and actions on mobile without long-value overflow', () => {
    expect(styles).toMatch(
      /\.readonly-grid,[\s\S]*?\.classification-grid\s*\{\s*grid-template-columns:\s*1fr;/,
    );
    expect(styles).toContain('.form-actions { flex-direction: column-reverse; }');
    expect(styles).toMatch(
      /\.selected-files li,[\s\S]*?\.ticket-success p\s*\{\s*overflow-wrap:\s*anywhere;/,
    );
  });
});
