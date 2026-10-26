import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL;
const defaultApiUrl = Platform.OS === 'android'
  ? 'http://10.0.2.2:5000/api'
  : 'http://localhost:5000/api';
export const API_BASE_URL = (configuredApiUrl?.trim() || defaultApiUrl).replace(/\/$/, '');
const CSRF_STORAGE_KEY = 'gapangita.csrf';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function getCsrfToken() {
  if (Platform.OS === 'web') {
    return typeof globalThis.sessionStorage === 'undefined'
      ? null
      : globalThis.sessionStorage.getItem(CSRF_STORAGE_KEY);
  }
  return SecureStore.getItemAsync(CSRF_STORAGE_KEY);
}

export async function saveCsrfToken(token: string) {
  if (Platform.OS === 'web') {
    globalThis.sessionStorage?.setItem(CSRF_STORAGE_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(CSRF_STORAGE_KEY, token);
}

export async function clearCsrfToken() {
  if (Platform.OS === 'web') {
    globalThis.sessionStorage?.removeItem(CSRF_STORAGE_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(CSRF_STORAGE_KEY);
}

export async function request<T>(path: string, init: RequestInit = {}, responseType: 'json' | 'blob' = 'json'): Promise<T> {
  const headers = new Headers(init.headers);
  const method = (init.method || 'GET').toUpperCase();

  if (method !== 'GET' && method !== 'HEAD') {
    const csrfToken = await getCsrfToken();
    if (csrfToken) headers.set('X-CSRF-Token', csrfToken);
  }

  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const safeRead = method === 'GET' || method === 'HEAD';
  const attempts = safeRead ? 3 : 1;
  const timeoutMs = init.body instanceof FormData ? 60000 : 10000;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController();
    let timedOut = false;
    const cancel = () => controller.abort();
    init.signal?.addEventListener('abort', cancel, { once: true });
    if (init.signal?.aborted) controller.abort();
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    let retry = false;
    try {
      const response = await fetch(API_BASE_URL + path, {
        ...init, headers, credentials: 'include', signal: controller.signal,
      });
      if (safeRead && [502, 503, 504].includes(response.status) && attempt < attempts - 1) {
        retry = true;
      } else {
        let payload;
        try {
          payload = responseType === 'blob' && response.ok
            ? await response.blob()
            : await response.json();
        } catch (reason) {
          if (controller.signal.aborted) throw reason;
          throw new ApiError(response.status === 413 ? 'The upload is too large. Choose a photo or evidence file no larger than 5 MB.' : 'The server returned an invalid response. Please retry.', response.status);
        }
        if (!response.ok) {
          const message = typeof payload === 'object' && payload && ('error' in payload || 'message' in payload)
            ? String(payload.error || payload.message)
            : 'The request could not be completed.';
          throw new ApiError(message, response.status);
        }
        return payload as T;
      }
    } catch (reason) {
      if (init.signal?.aborted) throw new ApiError('Request cancelled.', 0);
      if (reason instanceof ApiError) throw reason;
      if (!safeRead || attempt === attempts - 1) {
        const message = timedOut ? 'The server took too long to respond.' : 'Cannot reach the server. Check the API address and network connection.';
        throw new ApiError(message + (safeRead ? ' Please retry.' : ' The action may not have completed. Check its status before submitting again.'), 0);
      }
      retry = true;
    } finally {
      clearTimeout(timer);
      init.signal?.removeEventListener('abort', cancel);
    }
    if (retry) await new Promise<void>((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    if (init.signal?.aborted) throw new ApiError('Request cancelled.', 0);
  }
  throw new ApiError('Unable to complete the request. Please retry.', 0);
}

export function imageUrl(path: string | null | undefined) {
  if (!path) return null;
  const root = API_BASE_URL.replace(/\/api\/?$/, '');
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  return `${root}/uploads/${encodedPath}`;
}