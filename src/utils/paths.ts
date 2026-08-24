const base = import.meta.env.BASE_URL || '/';

export function withBase(path = '/') {
  if (/^(https?:|mailto:|tel:)/i.test(path)) return path;

  const normalizedBase = base.endsWith('/') ? base : `${base}/`;

  if (path === '/') return normalizedBase;
  if (path.startsWith('#')) return `${normalizedBase}${path}`;
  if (path.startsWith(normalizedBase)) return path;

  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return `${normalizedBase}${normalizedPath}`;
}
