import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';

const PUBLIC_AUTH_PATHS = ['/api/auth/me/', '/api/auth/login/', '/api/auth/guest/', '/api/auth/csrf/'];

export const sessionExpiredInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const session = inject(SessionService);
  const version = auth.sessionVersion();
  return next(request).pipe(
    catchError((error: unknown) => {
      const sameSession = auth.sessionVersion() === version;
      if (sameSession && auth.isAuthenticated() && isSessionExpired(error, request)) {
        void session.endExpiredSession();
      }
      return throwError(() => error);
    }),
  );
};

function isSessionExpired(error: unknown, request: HttpRequest<unknown>): boolean {
  if (!(error instanceof HttpErrorResponse) || PUBLIC_AUTH_PATHS.includes(request.url)) {
    return false;
  }
  return error.status === 401 || (error.status === 403 && isNotAuthenticated(error));
}

function isNotAuthenticated(error: HttpErrorResponse): boolean {
  const body: unknown = error.error;
  if (typeof body !== 'object' || body === null || !('detail' in body)) {
    return false;
  }
  return String(body.detail).toLowerCase().includes('authentication credentials');
}
