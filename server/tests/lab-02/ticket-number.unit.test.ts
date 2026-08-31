import { describe, expect, it, vi } from 'vitest';
import {
  TicketNumberGenerationError,
  buildTicketNumber,
  insertWithUniqueTicketNumber,
} from '../../src/ticket-create.js';

describe('Lab 2 Ticket Number generation', () => {
  it('uses the UTC date and the first eight UUID hexadecimal characters', () => {
    expect(
      buildTicketNumber(
        new Date('2026-08-31T23:59:59.000Z'),
        'a1b2c3d4-1111-4111-8111-111111111111',
      ),
    ).toBe('TKT-20260831-A1B2C3D4');
  });

  it('retries a unique-constraint collision and returns the successful insert', async () => {
    const candidates = [
      'aaaaaaaa-1111-4111-8111-111111111111',
      'bbbbbbbb-2222-4222-8222-222222222222',
    ];
    const insert = vi
      .fn<(ticketNumber: string) => Promise<{ ticketNumber: string } | null>>()
      .mockResolvedValueOnce(null)
      .mockImplementationOnce(async (ticketNumber) => ({ ticketNumber }));

    const result = await insertWithUniqueTicketNumber(
      insert,
      new Date('2026-08-31T00:00:00.000Z'),
      () => candidates.shift()!,
    );

    expect(result.ticketNumber).toBe('TKT-20260831-BBBBBBBB');
    expect(insert).toHaveBeenCalledTimes(2);
  });

  it('fails safely after three collisions', async () => {
    const insert = vi.fn().mockResolvedValue(null);

    await expect(
      insertWithUniqueTicketNumber(
        insert,
        new Date('2026-08-31T00:00:00.000Z'),
        () => 'aaaaaaaa-1111-4111-8111-111111111111',
      ),
    ).rejects.toBeInstanceOf(TicketNumberGenerationError);
    expect(insert).toHaveBeenCalledTimes(3);
  });
});
