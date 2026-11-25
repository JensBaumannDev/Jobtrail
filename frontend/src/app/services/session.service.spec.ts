import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ApplicationService } from './application.service';
import { AuthService } from './auth.service';
import { NoteService } from './note.service';
import { SessionService } from './session.service';
import { ToastService } from './toast.service';
import { WatchlistService } from './watchlist.service';

function setup(logout: () => Promise<void>) {
  const resets = { applications: vi.fn(), watchlist: vi.fn(), notes: vi.fn() };
  const toast = { flush: vi.fn(() => Promise.resolve()), discard: vi.fn() };
  const navigate = vi.fn(() => Promise.resolve(true));
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthService, useValue: { isAuthenticated: () => true, logout, clearSession: vi.fn() } },
      { provide: ToastService, useValue: toast },
      { provide: Router, useValue: { navigate } },
      { provide: ApplicationService, useValue: { reset: resets.applications } },
      { provide: WatchlistService, useValue: { reset: resets.watchlist } },
      { provide: NoteService, useValue: { reset: resets.notes } },
    ],
  });
  return { service: TestBed.inject(SessionService), resets, toast, navigate };
}

describe('SessionService.logout', () => {
  it('clears local data and pending deletes after the server confirms', async () => {
    const { service, resets, toast, navigate } = setup(() => Promise.resolve());
    await service.logout();
    expect(toast.discard).toHaveBeenCalled();
    expect(resets.applications).toHaveBeenCalled();
    expect(resets.notes).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('keeps everything when the server logout fails', async () => {
    const failure = new HttpErrorResponse({ status: 500 });
    const { service, resets, navigate } = setup(() => Promise.reject(failure));
    await expect(service.logout()).rejects.toBe(failure);
    expect(resets.applications).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('treats an expired session as already logged out', async () => {
    const expired = new HttpErrorResponse({ status: 403 });
    const { service, resets } = setup(() => Promise.reject(expired));
    await service.logout();
    expect(resets.watchlist).toHaveBeenCalled();
  });
});
