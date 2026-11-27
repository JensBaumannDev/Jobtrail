import { HttpErrorResponse } from '@angular/common/http';

const GUEST_LIMIT_STATUS = 429;

export const INVALID_URL_MESSAGE = /valid url|valid http or https address/i;

export type GuestLimitResource = 'applications' | 'notes' | 'watchItems';

export function guestLimitKey(error: unknown, resource: GuestLimitResource): string | null {
  const isLimit = error instanceof HttpErrorResponse && error.status === GUEST_LIMIT_STATUS;
  return isLimit ? `guestLimits.${resource}` : null;
}
