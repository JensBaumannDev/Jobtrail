import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Application } from '../models/application.model';
import { WatchItem, WatchItemInput } from '../models/watch-item.model';
import { ApplicationService } from './application.service';
import { AuthService } from './auth.service';
import { SessionScopedList } from './session-scoped-list';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class WatchlistService {
  private readonly http = inject(HttpClient);
  private readonly applications = inject(ApplicationService);
  private readonly toast = inject(ToastService);
  private readonly version = inject(AuthService).sessionVersion;
  private readonly list = new SessionScopedList<WatchItem>(this.version);

  readonly watchItems = this.list.visible;
  readonly isLoaded = this.list.isLoaded;

  async load(): Promise<void> {
    const version = this.version();
    const items = await firstValueFrom(this.http.get<WatchItem[]>('/api/watchlist/'));
    this.list.setAll(items, version);
  }

  async create(input: WatchItemInput): Promise<WatchItem> {
    const version = this.version();
    const created = await firstValueFrom(this.http.post<WatchItem>('/api/watchlist/', input));
    this.list.prepend(created, version);
    return created;
  }

  async update(id: number, changes: Partial<WatchItemInput>): Promise<WatchItem> {
    const version = this.version();
    const updated = await firstValueFrom(
      this.http.patch<WatchItem>(`/api/watchlist/${id}/`, changes),
    );
    this.list.replace(updated, version);
    return updated;
  }

  deleteWithUndo(item: WatchItem, afterUndo?: () => void): void {
    const version = this.version();
    this.list.setPending(item.id, true);
    this.toast.scheduleWithUndo({
      messageKey: 'watchlist.removed',
      messageParams: { company: item.company },
      commit: () => this.remove(item.id, version),
      undo: () => this.list.setPending(item.id, false),
      afterUndo,
    });
  }

  async convert(id: number): Promise<Application> {
    const version = this.version();
    const application = await firstValueFrom(
      this.http.post<Application>(`/api/watchlist/${id}/convert/`, {}),
    );
    this.list.remove(id, version);
    if (version === this.version()) {
      this.applications.add(application);
    }
    return application;
  }

  reset(): void {
    this.list.reset();
  }

  private async remove(id: number, version: number): Promise<void> {
    if (version !== this.version()) {
      return;
    }
    await firstValueFrom(this.http.delete<void>(`/api/watchlist/${id}/`));
    this.list.remove(id, version);
  }
}
