import { auth } from '@/lib/firebase';

/**
 * Drop-in replacement for fetch() on our own API routes: attaches the current
 * user's Firebase ID token so the server can verify who is calling.
 */
export async function authedFetch(path, init = {}) {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;
  return fetch(path, {
    ...init,
    headers: {
      ...(init.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
