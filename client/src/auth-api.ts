export type AuthUser = { id: string; name: string; email: string; role: 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR'; mustChangePassword: boolean };
let csrfToken: string | undefined;
let bootstrap: Promise<string> | undefined;
let generation = 0;
export const AUTH_EVENT = 'toktickit:auth-lost';
const base = () => import.meta.env.VITE_API_URL ?? '';
export function clearAuthState() {
  resetCsrf();
  localStorage.removeItem('toktickit.requester');
  for (const key of Object.keys(sessionStorage)) if (key.startsWith('toktickit.')) sessionStorage.removeItem(key);
}
export function resetCsrf() { generation++; csrfToken = undefined; bootstrap = undefined; }
export function acceptCsrf(token: string) { csrfToken = token; }
async function csrf() {
  if (csrfToken) return csrfToken;
  if (!bootstrap) {
    const started = generation;
    bootstrap = fetch(`${base()}/api/auth/csrf`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error('Unable to prepare sign in. Try again.');
        const data = await res.json();
        if (started !== generation) throw new Error('Your session changed. Please try again.');
        csrfToken = data.csrfToken; return data.csrfToken as string;
      }).finally(() => { if (started === generation) bootstrap = undefined; });
  }
  return bootstrap;
}
export async function apiFetch(input: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.delete('X-Requester-Id');
  if (!['GET', 'HEAD'].includes((init.method ?? 'GET').toUpperCase())) headers.set('X-CSRF-Token', await csrf());
  const response = await fetch(input, { ...init, headers, credentials: 'include' });
  if (response.status === 401 && !input.endsWith('/auth/login')) {
    clearAuthState(); window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: 'expired' }));
  } else if (response.status === 403) {
    const data = await response.clone().json().catch(() => null);
    if (data?.error?.code === 'PASSWORD_CHANGE_REQUIRED') window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: 'password' }));
  }
  return response;
}
export async function authRequest(path: string, body?: Record<string, string>) {
  const response = await apiFetch(`${base()}/api/auth/${path}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
  const data = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) {
    const failure = new Error(data.error?.message ?? 'Unable to connect. Please try again.') as Error & { fields?: Record<string, string> };
    failure.fields = data.error?.code === 'CURRENT_PASSWORD_INVALID' ? { currentPassword: failure.message } : data.error?.fieldErrors;
    if (response.status === 429) {
      const seconds = Number(response.headers.get('Retry-After'));
      if (Number.isSafeInteger(seconds) && seconds > 0) failure.message += ` Try again in ${seconds} seconds.`;
    }
    throw failure;
  }
  if (data.csrfToken) acceptCsrf(data.csrfToken);
  return data;
}
