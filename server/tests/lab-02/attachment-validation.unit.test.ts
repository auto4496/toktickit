import { describe, expect, it } from 'vitest';
import {
  MAX_ATTACHMENT_BYTES,
  sanitizeAttachmentName,
  validateAttachmentFile,
  validateRemovalReason,
} from '../../src/attachment-validation.js';

const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('Attachment validation', () => {
  it.each([
    ['photo.JPG', 'image/jpeg', Buffer.from([0xff, 0xd8, 0xff])],
    ['photo.png', 'image/png', pngBytes],
    ['photo.webp', 'image/webp', Buffer.from('RIFFxxxxWEBP')],
    ['report.PDF', 'application/pdf', Buffer.from('%PDF-1.7')],
  ])('accepts the approved %s extension, MIME type, and signature together', (name, mimeType, bytes) => {
    expect(validateAttachmentFile({ originalName: name, mimeType, bytes })).toEqual({
      success: true,
      value: expect.objectContaining({ originalName: name, mimeType }),
    });
  });

  it('derives a safe NFC basename and canonical extension without exposing a path', () => {
    expect(sanitizeAttachmentName('C:\\fakepath/ Cafe\u0301.PNG ')).toEqual({
      success: true,
      value: { originalName: 'Café.PNG', extension: 'png' },
    });
  });

  it.each([
    ['missing basename', '.png', 'image/png', pngBytes],
    ['unapproved extension', 'archive.zip', 'application/zip', Buffer.from('PK')],
    ['MIME mismatch', 'photo.png', 'image/jpeg', pngBytes],
    ['signature mismatch', 'photo.png', 'image/png', Buffer.from('not a PNG')],
  ])('rejects %s safely', (_label, originalName, mimeType, bytes) => {
    const result = validateAttachmentFile({ originalName, mimeType, bytes });
    expect(result.success).toBe(false);
  });

  it('strips path segments and controls before validating the safe basename', () => {
    expect(validateAttachmentFile({ originalName: '../private.png', mimeType: 'image/png', bytes: pngBytes })).toEqual({
      success: true,
      value: expect.objectContaining({ originalName: 'private.png' }),
    });
    expect(validateAttachmentFile({ originalName: 'bad\u0000.png', mimeType: 'image/png', bytes: pngBytes })).toEqual({
      success: true,
      value: expect.objectContaining({ originalName: 'bad.png' }),
    });
  });

  it('enforces the exact five MiB boundary', () => {
    const exact = Buffer.alloc(MAX_ATTACHMENT_BYTES, 0);
    pngBytes.copy(exact);
    const oversized = Buffer.alloc(MAX_ATTACHMENT_BYTES + 1, 0);
    pngBytes.copy(oversized);

    expect(validateAttachmentFile({ originalName: 'exact.png', mimeType: 'image/png', bytes: exact }).success).toBe(true);
    expect(validateAttachmentFile({ originalName: 'large.png', mimeType: 'image/png', bytes: oversized })).toEqual({
      success: false,
      code: 'ATTACHMENT_TOO_LARGE',
      message: expect.any(String),
    });
  });

  it.each(['  valid removal reason  ', 'x'.repeat(200)])('accepts a removal reason in range', (reason) => {
    expect(validateRemovalReason(reason)).toEqual({ success: true, value: reason.trim() });
  });

  it.each(['    ', 'tiny', 'x'.repeat(201), null])('rejects an invalid removal reason', (reason) => {
    expect(validateRemovalReason(reason).success).toBe(false);
  });
});
