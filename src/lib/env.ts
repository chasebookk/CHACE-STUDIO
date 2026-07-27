// Dynamic env access that works in `astro dev` (import.meta.env from .env)
// and on Vercel (process.env). Indexed access so Vite can't inline secrets.
export function env(name: string): string | undefined {
  const meta = (import.meta as any).env ?? {};
  return meta[name] ?? process.env[name];
}

export function requireEnv(name: string): string {
  const v = env(name);
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

export function siteUrl(): string {
  return (env('PUBLIC_SITE_URL') ?? 'http://localhost:4321').replace(/\/$/, '');
}
