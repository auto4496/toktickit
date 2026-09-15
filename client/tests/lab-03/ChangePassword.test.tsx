/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import AuthForm from '../../src/AuthForm';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('rejects mismatched passwords locally and exposes no skip action', () => {
  const network = vi.fn(); vi.stubGlobal('fetch', network);
  render(<AuthForm change onSuccess={vi.fn()} onLogout={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'My initial password' } });
  fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'My next long password' } });
  fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'Does not match' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save password and continue' }));
  expect(screen.getByText('Passwords must match.')).toBeVisible();
  expect(network).not.toHaveBeenCalled();
  expect(screen.queryByText('Skip')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Sign out' })).toBeVisible();
});
