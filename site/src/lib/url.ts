/* Project pages serve from a subpath (/namesync/), so an absolute link written
   as "/docs/install" would 404 there while working locally. Every internal
   link goes through here instead. BASE_URL is "/" in dev and "/namesync/" in
   the deployed build, and always has a trailing slash. */
export function url(pathname: string): string {
  const base = import.meta.env.BASE_URL;
  const clean = pathname.replace(/^\//, '');
  return base.endsWith('/') ? base + clean : base + '/' + clean;
}
