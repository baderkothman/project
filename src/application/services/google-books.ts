import { API_URL } from '@/src/shared/config/environment';
import type { GoogleBook } from '@/src/domain/models';

interface GoogleBooksResponse {
  items?: GoogleBook[];
  totalItems?: number;
}

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error?.message ?? 'Google Books request failed');
  }
  return body as T;
}

export async function searchGoogleBooks(
  query: string,
  options: {
    filter?: string;
    maxResults?: number;
    orderBy?: 'relevance' | 'newest';
  } = {},
) {
  const params = new URLSearchParams({
    q: query,
    maxResults: String(options.maxResults ?? 20),
  });
  if (options.filter) params.set('filter', options.filter);
  if (options.orderBy) params.set('orderBy', options.orderBy);
  return readJson<GoogleBooksResponse>(
    await fetch(`${API_URL}/api/google-books/search?${params.toString()}`),
  );
}

export async function getGoogleBook(id: string) {
  return readJson<GoogleBook>(
    await fetch(`${API_URL}/api/google-books/${encodeURIComponent(id)}`),
  );
}
