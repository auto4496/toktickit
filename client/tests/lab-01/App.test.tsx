/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';

const healthResponse = {
  status: 'ok',
  service: 'TokTickIT API',
};

const categories = [
  { id: 1, name: 'Account and Access' },
  { id: 2, name: 'Hardware' },
  { id: 3, name: 'Software' },
  { id: 4, name: 'Network' },
];

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('TokTickIT system check', () => {
  it('renders the TokTickIT heading', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /TokTickIT IT Service Desk/i,
      }),
    ).toBeInTheDocument();
  });

  it('changes from loading to the category list returned by the API', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(healthResponse))
      .mockResolvedValueOnce(jsonResponse(categories));
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Check System' }));

    expect(screen.getByRole('button')).toHaveTextContent('Loading...');
    expect(screen.getByRole('status')).toHaveTextContent('Loading...');

    expect(await screen.findByText('Account and Access')).toBeInTheDocument();
    expect(screen.getByText('Hardware')).toBeInTheDocument();
    expect(screen.getByText('Software')).toBeInTheDocument();
    expect(screen.getByText('Network')).toBeInTheDocument();
    expect(screen.getByText('System Status: Online')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/health$/);
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/api\/categories$/);
  });

  it('shows a useful error when a request fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(healthResponse))
      .mockResolvedValueOnce(jsonResponse({ error: 'Database unavailable' }, 500));
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Check System' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('System Status: Offline');
    expect(alert).toHaveTextContent('Unable to connect to TokTickIT API');
  });
});
