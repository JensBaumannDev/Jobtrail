const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

export function normalizeWebsite(raw: string): string | null {
  const value = raw.trim();
  if (!value) {
    return null;
  }
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  return parseHttpUrl(candidate);
}

export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return parseHttpUrl(value.trim());
}

export function displayHost(value: string): string {
  const url = safeHttpUrl(value);
  return url ? new URL(url).hostname.replace(/^www\./, '') : '';
}

function parseHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (!ALLOWED_PROTOCOLS.has(url.protocol) || !url.hostname.includes('.')) {
      return null;
    }
    if (url.username || url.password) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}
