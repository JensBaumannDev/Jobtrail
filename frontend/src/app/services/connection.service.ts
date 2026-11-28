import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ConnectionService {
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly online = signal(this.window?.navigator.onLine ?? true);

  readonly isOnline = this.online.asReadonly();

  constructor() {
    this.window?.addEventListener('online', () => this.online.set(true));
    this.window?.addEventListener('offline', () => this.online.set(false));
  }
}
