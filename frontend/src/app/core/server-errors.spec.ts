import { HttpErrorResponse } from '@angular/common/http';
import { INVALID_URL_MESSAGE, guestLimitKey } from './server-errors';

function httpError(status: number): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: { detail: 'The demo limit is reached. Delete something first.' } });
}

describe('guestLimitKey', () => {
  it('returns the limit message of the resource for 429', () => {
    expect(guestLimitKey(httpError(429), 'applications')).toBe('guestLimits.applications');
    expect(guestLimitKey(httpError(429), 'notes')).toBe('guestLimits.notes');
    expect(guestLimitKey(httpError(429), 'watchItems')).toBe('guestLimits.watchItems');
  });

  it('returns null for other statuses', () => {
    for (const status of [0, 400, 401, 403, 404, 500, 503]) {
      expect(guestLimitKey(httpError(status), 'applications')).toBeNull();
    }
  });

  it('returns null for errors that are not http errors', () => {
    expect(guestLimitKey(new Error('offline'), 'notes')).toBeNull();
    expect(guestLimitKey('unexpected', 'notes')).toBeNull();
  });
});

describe('INVALID_URL_MESSAGE', () => {
  it('matches the backend message for an invalid website', () => {
    expect(INVALID_URL_MESSAGE.test('Enter a valid http or https address.')).toBe(true);
  });

  it('matches the default Django message for an invalid url', () => {
    expect(INVALID_URL_MESSAGE.test('Enter a valid URL.')).toBe(true);
  });

  it('does not match other messages', () => {
    expect(INVALID_URL_MESSAGE.test('This field may not be blank.')).toBe(false);
    expect(INVALID_URL_MESSAGE.test('Must be text.')).toBe(false);
  });
});
