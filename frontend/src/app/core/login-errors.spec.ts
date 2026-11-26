import { HttpErrorResponse } from '@angular/common/http';
import { loginErrorKey } from './login-errors';

function httpError(status: number): HttpErrorResponse {
  return new HttpErrorResponse({ status });
}

describe('loginErrorKey', () => {
  it('uses the rejected key for wrong credentials', () => {
    expect(loginErrorKey(httpError(400), 'login.credentialsError')).toBe('login.credentialsError');
    expect(loginErrorKey(httpError(401), 'login.credentialsError')).toBe('login.credentialsError');
  });

  it('shows the rate limit message for 429', () => {
    expect(loginErrorKey(httpError(429), 'login.credentialsError')).toBe('login.rateLimitError');
  });

  it('shows the demo busy message for 503', () => {
    expect(loginErrorKey(httpError(503), 'login.genericError')).toBe('login.demoBusyError');
  });

  it('falls back to the generic message for other statuses', () => {
    for (const status of [0, 403, 404, 500, 502]) {
      expect(loginErrorKey(httpError(status), 'login.credentialsError')).toBe('login.genericError');
    }
  });

  it('falls back to the generic message for errors that are not http errors', () => {
    expect(loginErrorKey(new Error('offline'), 'login.credentialsError')).toBe('login.genericError');
    expect(loginErrorKey('unexpected', 'login.credentialsError')).toBe('login.genericError');
  });
});
