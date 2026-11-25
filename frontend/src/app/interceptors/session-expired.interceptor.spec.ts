import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';
import { sessionExpiredInterceptor } from './session-expired.interceptor';

describe('sessionExpiredInterceptor', () => {
  const endExpiredSession = vi.fn(() => Promise.resolve());
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    endExpiredSession.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([sessionExpiredInterceptor])),
        provideHttpClientTesting(),
        { provide: SessionService, useValue: { endExpiredSession } },
        { provide: AuthService, useValue: { isAuthenticated: () => true, sessionVersion: () => 1 } },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  async function respond(url: string, status: number, body: object): Promise<void> {
    const result = firstValueFrom(http.get(url)).catch(() => undefined);
    controller.expectOne(url).flush(body, { status, statusText: 'Error' });
    await result;
  }

  it('ends the session on 401', async () => {
    await respond('/api/applications/', 401, {});
    expect(endExpiredSession).toHaveBeenCalledTimes(1);
  });

  it('ends the session on a not-authenticated 403', async () => {
    await respond('/api/applications/', 403, {
      detail: 'Authentication credentials were not provided.',
    });
    expect(endExpiredSession).toHaveBeenCalledTimes(1);
  });

  it('keeps the session on a CSRF 403', async () => {
    await respond('/api/applications/', 403, { detail: 'CSRF Failed: CSRF token missing.' });
    expect(endExpiredSession).not.toHaveBeenCalled();
  });

  it('ignores the public auth endpoints', async () => {
    await respond('/api/auth/me/', 401, {});
    expect(endExpiredSession).not.toHaveBeenCalled();
  });
});
