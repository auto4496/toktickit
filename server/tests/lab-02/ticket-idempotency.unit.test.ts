import { describe, expect, it } from 'vitest';
import {
  canonicalizeTicketRequest,
  hashCanonicalTicketRequest,
} from '../../src/ticket-create.js';

const requesterId = 'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA';
const input = {
  categoryId: 4,
  relatedSystemId: 3,
  summary: 'VPN disconnects after sign-in',
  requestedPriority: 'HIGH' as const,
  description: 'The VPN disconnects after one minute.\nPlease investigate.',
};

describe('Lab 2 canonical Ticket request hash', () => {
  it('uses the approved fixed key order and canonical requester casing', () => {
    expect(canonicalizeTicketRequest(requesterId, input)).toBe(
      '{"requesterId":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","categoryId":4,"relatedSystemId":3,"summary":"VPN disconnects after sign-in","requestedPriority":"HIGH","description":"The VPN disconnects after one minute.\\nPlease investigate."}',
    );
  });

  it('produces the same SHA-256 for equivalent Unicode, trimming, and CRLF', () => {
    const equivalent = {
      ...input,
      summary: '  Cafe\u0301 access issue  ',
      description: '  First line\r\nSecond line  ',
    };
    const normalized = {
      ...input,
      summary: 'Café access issue',
      description: 'First line\nSecond line',
    };

    expect(hashCanonicalTicketRequest(requesterId, equivalent)).toBe(
      hashCanonicalTicketRequest(requesterId.toLowerCase(), normalized),
    );
    expect(hashCanonicalTicketRequest(requesterId, equivalent)).toMatch(
      /^[0-9a-f]{64}$/,
    );
  });

  it('changes the hash when meaningful internal whitespace changes', () => {
    expect(hashCanonicalTicketRequest(requesterId, input)).not.toBe(
      hashCanonicalTicketRequest(requesterId, {
        ...input,
        description: 'The VPN  disconnects after one minute.\nPlease investigate.',
      }),
    );
  });
});
