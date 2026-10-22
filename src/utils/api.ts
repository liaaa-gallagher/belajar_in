export async function apiFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const userStr = localStorage.getItem('belajarin_user');
  let userId = '';
  let sessionId = '';

  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      userId = user.id || '';
      sessionId = localStorage.getItem('belajarin_session_id') || '';
    } catch (e) {
      // ignore
    }
  }

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (userId) headers.set('x-user-id', userId);
  if (sessionId) headers.set('x-session-id', sessionId);

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Terjadi kesalahan pada server');
  }

  return data as T;
}
