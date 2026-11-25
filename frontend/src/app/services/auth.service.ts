import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CurrentUser } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly user = signal<CurrentUser | null>(null);
  private readonly version = signal(0);

  readonly currentUser = this.user.asReadonly();
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly sessionVersion = this.version.asReadonly();

  async restoreSession(): Promise<void> {
    try {
      await this.fetchCsrfCookie();
      this.setUser(await firstValueFrom(this.http.get<CurrentUser>('/api/auth/me/')));
    } catch (error) {
      this.setUser(null);
      if (!isAuthError(error)) {
        throw error;
      }
    }
  }

  async login(username: string, password: string): Promise<void> {
    await this.fetchCsrfCookie();
    const user = await firstValueFrom(
      this.http.post<CurrentUser>('/api/auth/login/', { username, password }),
    );
    this.setUser(user);
  }

  async loginAsGuest(): Promise<void> {
    await this.fetchCsrfCookie();
    this.setUser(await firstValueFrom(this.http.post<CurrentUser>('/api/auth/guest/', {})));
  }

  async logout(): Promise<void> {
    await firstValueFrom(this.http.post<void>('/api/auth/logout/', {}));
    this.clearSession();
  }

  clearSession(): void {
    this.setUser(null);
  }

  private setUser(user: CurrentUser | null): void {
    this.user.set(user);
    this.version.update((version) => version + 1);
  }

  private async fetchCsrfCookie(): Promise<void> {
    await firstValueFrom(this.http.get<void>('/api/auth/csrf/'));
  }
}

function isAuthError(error: unknown): boolean {
  return error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403);
}
