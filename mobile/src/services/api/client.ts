import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL;
const defaultApiUrl = Platform.OS === 'android'
  ? 'http://10.0.2.2:5000/api'
  : 'http://localhost:5000/api';
export const API_BASE_URL = (configuredApiUrl || defaultApiUrl).replace(/\/$/, '');
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

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const method = (init.method || 'GET').toUpperCase();

  if (method !== 'GET' && method !== 'HEAD') {
    const csrfToken = await getCsrfToken();
    if (csrfToken) headers.set('X-CSRF-Token', csrfToken);
  }

  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      credentials: 'include',
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check the API address and network connection.', 0);
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.error || payload.message || 'The request could not be completed.';
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

export function imageUrl(path: string | null | undefined) {
  if (!path) return null;
  const root = API_BASE_URL.replace(/\/api\/?$/, '');
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  return `${root}/uploads/${encodedPath}`;
}