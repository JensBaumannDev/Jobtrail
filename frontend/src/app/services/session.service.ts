import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ApplicationService } from './application.service';
import { AuthService } from './auth.service';
import { NoteService } from './note.service';
import { ToastService } from './toast.service';
import { WatchlistService } from './watchlist.service';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly applications = inject(ApplicationService);
  private readonly watchlist = inject(WatchlistService);
  private readonly notes = inject(NoteService);

  async logout(): Promise<void> {
    await this.toast.flush();
    if (this.auth.isAuthenticated()) {
      await this.logoutOnServer();
    }
    this.toast.discard();
    this.clearLocalData();
    await this.router.navigate(['/login']);
  }

  async endExpiredSession(): Promise<void> {
    this.toast.discard();
    this.auth.clearSession();
    this.clearLocalData();
    await this.router.navigate(['/login'], { queryParams: { expired: 1 } });
  }

  private async logoutOnServer(): Promise<void> {
    try {
      await this.auth.logout();
    } catch (error) {
      if (!isAlreadyLoggedOut(error)) {
        throw error;
      }
      this.auth.clearSession();
    }
  }

  private clearLocalData(): void {
    this.applications.reset();
    this.watchlist.reset();
    this.notes.reset();
  }
}

function isAlreadyLoggedOut(error: unknown): boolean {
  return error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403);
}
