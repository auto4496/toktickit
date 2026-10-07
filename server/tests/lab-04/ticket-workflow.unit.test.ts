import { describe, expect, it } from 'vitest';
import { statusTransitions, needsConfirmation, needsOwner, canIndicate } from '../../src/workflow-rules.js';
import { resolutionReady } from '../../src/resolution-gate.js';

describe('UNIT-02 approved Ticket workflow contract', () => {
  it('retains the complete independent eight-status matrix', () => {
    expect(statusTransitions).toEqual({ NEW: ['OPEN', 'CANCELLED'], OPEN: ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'CANCELLED'], IN_PROGRESS: ['WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'], WAITING_FOR_REQUESTER: ['IN_PROGRESS', 'RESOLVED', 'CANCELLED'], RESOLVED: ['CLOSED', 'REOPENED'], CLOSED: ['REOPENED'], REOPENED: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'CANCELLED'], CANCELLED: [] });
    expect(Object.keys(statusTransitions).filter(status => needsConfirmation(status as keyof typeof statusTransitions))).toEqual(['RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED']);
    expect(Object.keys(statusTransitions).filter(status => needsOwner(status as keyof typeof statusTransitions))).toEqual(['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED']);
    expect(Object.keys(statusTransitions).filter(status => canIndicate(status as keyof typeof statusTransitions))).toEqual(['OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED']);
  });
  it.each([[0, 0, false], [1, 0, false], [0, 1, true], [1, 1, false], [2, 3, false], [0, 3, true]] as const)('requires zero unfinished and at least one documented completion (%i/%i)', (unfinished, completed, ready) => {
    expect(resolutionReady(unfinished, completed)).toBe(ready);
  });
});
