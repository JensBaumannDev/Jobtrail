import { HttpErrorResponse } from '@angular/common/http';

const CREDENTIAL_ERROR_STATUSES = [400, 401];
const RATE_LIMIT_STATUS = 429;
const DEMO_BUSY_STATUS = 503;

export function loginErrorKey(
  error: unknown,
  rejectedKey: string,
  rateLimitKey = 'login.rateLimitError',
): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'login.genericError';
  }
  if (error.status === RATE_LIMIT_STATUS) {
    return rateLimitKey;
  }
  if (error.status === DEMO_BUSY_STATUS) {
    return 'login.demoBusyError';
  }
  return CREDENTIAL_ERROR_STATUSES.includes(error.status) ? rejectedKey : 'login.genericError';
}
