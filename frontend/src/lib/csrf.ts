const CSRF_HEADER = 'X-CSRF-Token';
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

let csrfToken: string | null = null;
let tokenPromise: Promise<string | null> | null = null;

function apiBaseForCsrf() {
  if (import.meta.env.DEV) return '/api';
  const envBase = import.meta.env.VITE_API_URL;
  if (!envBase) return '/api';
  return envBase.endsWith('/api') ? envBase : `${envBase.replace(/\/+$/, '')}/api`;
}

export async function getCsrfToken(): Promise<string | null> {
  if (csrfToken) return csrfToken;
  if (!tokenPromise) {
    tokenPromise = fetch(`${apiBaseForCsrf()}/csrf-token`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const payload = await response.json();
        csrfToken = payload?.data?.token || null;
        return csrfToken;
      })
      .catch(() => null)
      .finally(() => {
        tokenPromise = null;
      });
  }
  return tokenPromise;
}

export async function applyCsrfHeader(headers: Headers, method = 'GET') {
  if (!MUTATION_METHODS.has(method.toUpperCase())) return;
  const token = await getCsrfToken();
  if (token) headers.set(CSRF_HEADER, token);
}

export function installCsrfFetch() {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const method = (init.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    if (MUTATION_METHODS.has(method)) {
      const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
      await applyCsrfHeader(headers, method);
      init = { credentials: init.credentials || 'include', ...init, headers };
    }
    return nativeFetch(input, init);
  };
}
