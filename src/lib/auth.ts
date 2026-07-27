import { env } from './env';

/** HTTP Basic Auth against ADMIN_PASSWORD (any username). */
export function checkAdminAuth(request: Request): boolean {
  const password = env('ADMIN_PASSWORD');
  if (!password) return false; // unset password = admin disabled

  const header = request.headers.get('authorization') ?? '';
  if (!header.startsWith('Basic ')) return false;
  try {
    const decoded = atob(header.slice(6));
    const supplied = decoded.slice(decoded.indexOf(':') + 1);
    return supplied === password;
  } catch {
    return false;
  }
}

export function unauthorized(): Response {
  return new Response('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="CHACE STUDIOS admin"' },
  });
}
