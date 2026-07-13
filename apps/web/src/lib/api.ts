import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

// Auth rides in httpOnly cookies (set by the API) — no tokens in localStorage.
const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise: Promise<void> | null = null;

async function refreshSession(): Promise<void> {
  // Deduplicate concurrent refreshes
  refreshPromise ??= axios
    .post('/api/auth/refresh', null, { withCredentials: true })
    .then(() => undefined)
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const url = config?.url ?? '';

    // On an expired access token, refresh once and replay the request.
    // Auth endpoints are excluded so a failed login/refresh can't loop.
    if (
      error.response?.status === 401 &&
      config &&
      !config._retried &&
      !url.startsWith('/auth/')
    ) {
      config._retried = true;
      try {
        await refreshSession();
        return api(config);
      } catch {
        // fall through to the original 401
      }
    }
    return Promise.reject(error);
  }
);

// Extract a human-readable message from an API error without leaking `any` everywhere
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { error?: { message?: string }; message?: string }
      | undefined;
    const message = data?.error?.message ?? data?.message;
    if (message) return message;
  }
  return fallback;
}

/** The API's error code (e.g. EMAIL_NOT_VERIFIED), if present. */
export function getApiErrorCode(error: unknown): string | null {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: { code?: string } } | undefined;
    return data?.error?.code ?? null;
  }
  return null;
}

export default api;
