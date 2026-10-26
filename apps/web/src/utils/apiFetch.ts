// Calls a world node endpoint (battles, shops, guild, quests, equipment,
// stage) with the signed-in staff token. These endpoints require STAFF or
// ADMIN, so a missing or expired token sends the operator back to /login.
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = localStorage.getItem('token');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(input, { ...init, headers });
  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`);
  }
  return res;
}
