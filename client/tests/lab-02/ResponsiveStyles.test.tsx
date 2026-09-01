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

  it('styles the visible required indicator with the approved error color', () => {
    expect(styles).toMatch(/:root\s*\{[\s\S]*?--color-error:\s*#B42318;/);
    expect(styles).toMatch(
      /\.required-indicator\s*\{[\s\S]*?color:\s*var\(--color-error\);[\s\S]*?\}/,
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

  it('uses the approved pale-green token for the New status badge', () => {
    expect(styles).toMatch(/:root\s*\{[\s\S]*?--color-pale-green:\s*#EAF6EF;/);
    expect(styles).toMatch(
      /\.status-new\s*\{[\s\S]*?background:\s*var\(--color-pale-green\);[\s\S]*?\}/,
    );
  });

  it('uses a desktop table and mobile cards with safe wrapping and touch targets', () => {
    expect(styles).toMatch(/\.ticket-card-list\s*\{\s*display:\s*none;/);
    expect(styles).toMatch(
      /@media \(max-width:\s*767px\)[\s\S]*?\.ticket-table-wrap\s*\{\s*display:\s*none;[\s\S]*?\.ticket-card-list\s*\{\s*display:\s*grid;/,
    );
    expect(styles).toMatch(
      /\.ticket-card-number,[\s\S]*?\.ticket-list-card h3\s*\{\s*overflow-wrap:\s*anywhere;/,
    );
    expect(styles).toMatch(
      /\.ticket-pagination button,[\s\S]*?\.ticket-view-action\s*\{[\s\S]*?min-height:\s*44px;/,
    );
  });
});
