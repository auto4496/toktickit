import { describe, expect, it } from 'vitest';
import { validateTicketInput } from '../../src/ticket-create.js';

const validInput = {
  categoryId: 1,
  relatedSystemId: 2,
  summary: '  VPN disconnects after sign-in  ',
  requestedPriority: 'HIGH',
  description: '  The VPN disconnects after approximately one minute.\r\nPlease investigate.  ',
};

describe('Lab 2 Ticket validation and normalization', () => {
  it('normalizes accepted values without collapsing internal whitespace', () => {
    const result = validateTicketInput(validInput);

    expect(result).toEqual({
      success: true,
      value: {
        categoryId: 1,
        relatedSystemId: 2,
        summary: 'VPN disconnects after sign-in',
        requestedPriority: 'HIGH',
        description:
          'The VPN disconnects after approximately one minute.\nPlease investigate.',
      },
    });
  });

  it('normalizes Unicode text to NFC', () => {
    const result = validateTicketInput({
      ...validInput,
      summary: 'Cafe\u0301 access issue',
      description: 'Please restore Cafe\u0301 account access.',
    });

    expect(result.success && result.value.summary).toBe('Café access issue');
    expect(result.success && result.value.description).toBe(
      'Please restore Café account access.',
    );
  });

  it.each([
    ['categoryId', { categoryId: 0 }],
    ['categoryId', { categoryId: 1.5 }],
    ['categoryId', { categoryId: 2_147_483_648 }],
    ['relatedSystemId', { relatedSystemId: '2' }],
    ['relatedSystemId', { relatedSystemId: Number.MAX_SAFE_INTEGER }],
    ['requestedPriority', { requestedPriority: 'URGENT' }],
    ['summary', { summary: '    ' }],
    ['summary', { summary: '1234' }],
    ['summary', { summary: 'x'.repeat(121) }],
    ['description', { description: 'short' }],
    ['description', { description: 'x'.repeat(2001) }],
  ])('rejects an invalid %s boundary', (field, override) => {
    const result = validateTicketInput({ ...validInput, ...override });

    expect(result.success).toBe(false);
    expect(!result.success && result.fieldErrors).toHaveProperty(field);
  });

  it('returns all relevant field errors for an empty body', () => {
    const result = validateTicketInput({});

    expect(result).toEqual({
      success: false,
      fieldErrors: {
        categoryId: expect.any(String),
        relatedSystemId: expect.any(String),
        summary: expect.any(String),
        requestedPriority: expect.any(String),
        description: expect.any(String),
      },
    });
  });
});
