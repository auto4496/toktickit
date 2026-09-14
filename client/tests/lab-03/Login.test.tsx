/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AuthForm from '../../src/AuthForm';
import { clearAuthState } from '../../src/auth-api';

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
beforeEach(() => { clearAuthState(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('Login UI', () => {
  it('validates fields before networking and allows showing a password', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    render(<AuthForm onSuccess={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByLabelText('Email address')).toHaveAttribute('aria-invalid', 'true');
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(screen.getByLabelText('Password', { exact: true })).toHaveAttribute('type', 'text');
  });
  it('performs CSRF bootstrap then credentialed login, shows busy and delivers the safe user', async () => {
    let complete!: (value: Response) => void;
    const fetchMock = vi.fn().mockResolvedValueOnce(response({ csrfToken: 'csrf-fixture' })).mockImplementationOnce(() => new Promise<Response>((resolve) => { complete = resolve; }));
    vi.stubGlobal('fetch', fetchMock); const onSuccess = vi.fn();
    render(<AuthForm onSuccess={onSuccess} />);
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'person@example.test' } });
    fireEvent.change(screen.getByLabelText('Password', { exact: true }), { target: { value: 'A very long password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('button', { name: 'Signing in…' })).toBeDisabled();
    expect(fetchMock.mock.calls[1][1].credentials).toBe('include');
    expect(fetchMock.mock.calls[1][1].headers.get('X-CSRF-Token')).toBe('csrf-fixture');
    complete(response({ user: { id: 'user', role: 'REQUESTER' }, csrfToken: 'next' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ id: 'user', role: 'REQUESTER' }));
  });
  it('shows safe login failure without exposing whether an account is inactive', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response({ csrfToken: 'token' })).mockResolvedValueOnce(response({ error: { message: 'Unable to sign in. Check your credentials or contact your administrator.' } }, 401)));
    render(<AuthForm onSuccess={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'person@example.test' } });
    fireEvent.change(screen.getByLabelText('Password', { exact: true }), { target: { value: 'A very long password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to sign in');
  });
});
