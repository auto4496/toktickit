import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(new URL('../../src/styles.css', import.meta.url), 'utf8');

describe('Complete Lab 2 Zen Green responsive styles', () => {
  it('uses predictable border-box sizing without masking horizontal overflow', () => {
    expect(styles).toMatch(/\*,[\s\S]*?box-sizing:\s*border-box;/);
    expect(styles).not.toMatch(/overflow-x:\s*hidden/);
  });

  it('provides the contracted two-column tablet layouts', () => {
    expect(styles).toMatch(
      /@media \(min-width:\s*768px\) and \(max-width:\s*991px\)[\s\S]*?\.readonly-grid,[\s\S]*?\.detail-grid[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/,
    );
  });

  it('keeps Ticket Detail and Attachment actions touch friendly', () => {
    expect(styles).toMatch(
      /\.attachment-add,[\s\S]*?\.attachment-actions \.btn,[\s\S]*?\.back-link[\s\S]*?min-height:\s*44px;/,
    );
  });

  it('uses visible Zen Green focus and link states across the complete shell', () => {
    expect(styles).toMatch(/\.topbar a:focus-visible,[\s\S]*?\.attachment-add:focus-within[\s\S]*?outline:\s*3px solid #74b68d;/);
    expect(styles).toMatch(/\.back-link\s*\{[\s\S]*?color:\s*#246b45;/);
  });

  it('keeps the mobile dialog and attachment actions within the viewport', () => {
    expect(styles).toMatch(
      /@media \(max-width:\s*767px\)[\s\S]*?\.attachment-actions[\s\S]*?flex-wrap:\s*wrap;[\s\S]*?\.removal-dialog[\s\S]*?max-height:\s*calc\(100vh - 2rem\)/,
    );
  });
});
