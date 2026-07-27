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

/**
 * Explicit CSRF guard for admin form posts.
 *
 * Astro's built-in checkOrigin compares the Origin header against the origin
 * it derives from the incoming request, which on Vercel is the immutable
 * deployment host — so requests through the public alias were always
 * rejected. We compare against PUBLIC_SITE_URL instead, which is the origin
 * the admin page is actually served from.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const allowed = (env('PUBLIC_SITE_URL') ?? '').replace(/\/$/, '');
  return allowed !== '' && origin.replace(/\/$/, '') === allowed;
}

export function forbidden(): Response {
  return new Response('Cross-site request blocked', { status: 403 });
}

export function unauthorized(): Response {
  return new Response('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="CHACE STUDIOS admin"' },
  });
}
