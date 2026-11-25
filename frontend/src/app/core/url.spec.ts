import { displayHost, normalizeWebsite, safeHttpUrl } from './url';

describe('normalizeWebsite', () => {
  it('adds https to a bare domain', () => {
    expect(normalizeWebsite('example.com')).toBe('https://example.com/');
  });

  it('keeps an http url', () => {
    expect(normalizeWebsite('http://example.com/jobs')).toBe('http://example.com/jobs');
  });

  it('rejects other protocols', () => {
    expect(normalizeWebsite('javascript:alert(1)')).toBeNull();
    expect(normalizeWebsite('data:text/html,hi')).toBeNull();
    expect(normalizeWebsite('ftp://example.com')).toBeNull();
  });

  it('rejects hosts without a dot and empty input', () => {
    expect(normalizeWebsite('localhost')).toBeNull();
    expect(normalizeWebsite('   ')).toBeNull();
  });

  it('rejects urls with credentials', () => {
    expect(normalizeWebsite('https://user:pass@example.com')).toBeNull();
  });
});

describe('safeHttpUrl', () => {
  it('returns null for unsafe or missing values', () => {
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull();
    expect(safeHttpUrl('JaVaScRiPt:alert(1)')).toBeNull();
    expect(safeHttpUrl('')).toBeNull();
    expect(safeHttpUrl(null)).toBeNull();
  });

  it('returns the url for http and https', () => {
    expect(safeHttpUrl('https://example.com/a')).toBe('https://example.com/a');
  });
});

describe('displayHost', () => {
  it('strips www', () => {
    expect(displayHost('https://www.example.com/jobs')).toBe('example.com');
  });

  it('returns an empty string for unsafe urls', () => {
    expect(displayHost('javascript:alert(1)')).toBe('');
  });
});
