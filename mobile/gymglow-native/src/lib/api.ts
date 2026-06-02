import { config } from './config';
import { supabase } from './supabase';

function normalizePath(path: string) {
  if (path.startsWith('http')) return path;
  return `${config.apiBaseUrl}${path}`;
}

export async function getAuthHeaders() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const accessToken = data.session?.access_token;
  if (!accessToken) {
    throw new Error('Not authenticated');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(normalizePath(path), {
    ...init,
    headers: {
      ...headers,
      ...(init?.headers ?? {}),
    },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(readErrorMessage(text, res.statusText));
  }

  return text ? (JSON.parse(text) as T) : ({} as T);
}

function readErrorMessage(text: string, fallback: string) {
  if (!text) return fallback;

  try {
    const parsed = JSON.parse(text) as { error?: unknown; message?: unknown };
    const message = parsed.error ?? parsed.message;
    if (typeof message === 'string' && message.trim()) return message;
  } catch {
    // Fall through to plain text.
  }

  return text;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: 'PUT',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: 'PATCH',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export async function apiDelete(path: string, body?: unknown): Promise<void> {
  await apiFetch(path, {
    method: 'DELETE',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
