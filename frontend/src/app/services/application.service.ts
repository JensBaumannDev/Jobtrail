import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Application, ApplicationInput } from '../models/application.model';
import { AuthService } from './auth.service';
import { SessionScopedList } from './session-scoped-list';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class ApplicationService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly version = inject(AuthService).sessionVersion;
  private readonly list = new SessionScopedList<Application>(this.version);

  readonly applications = this.list.visible;
  readonly isLoaded = this.list.isLoaded;

  async load(): Promise<void> {
    const version = this.version();
    const items = await firstValueFrom(this.http.get<Application[]>('/api/applications/'));
    this.list.setAll(items, version);
  }

  async create(input: ApplicationInput): Promise<Application> {
    const version = this.version();
    const created = await firstValueFrom(
      this.http.post<Application>('/api/applications/', input),
    );
    this.list.prepend(created, version);
    return created;
  }

  async update(id: number, changes: Partial<ApplicationInput>): Promise<Application> {
    const version = this.version();
    const updated = await firstValueFrom(
      this.http.patch<Application>(`/api/applications/${id}/`, changes),
    );
    this.list.replace(updated, version);
    return updated;
  }

  deleteWithUndo(application: Application, afterUndo?: () => void): void {
    const version = this.version();
    this.list.setPending(application.id, true);
    this.toast.scheduleWithUndo({
      messageKey: 'list.deleted',
      messageParams: { company: application.company },
      commit: () => this.remove(application.id, version),
      undo: () => this.list.setPending(application.id, false),
      afterUndo,
    });
  }

  find(id: number): Application | undefined {
    return this.list.find(id);
  }

  replace(application: Application): void {
    this.list.replace(application, this.version());
  }

  add(application: Application): void {
    this.list.prepend(application, this.version());
  }

  reset(): void {
    this.list.reset();
  }

  private async remove(id: number, version: number): Promise<void> {
    if (version !== this.version()) {
      return;
    }
    await firstValueFrom(this.http.delete<void>(`/api/applications/${id}/`));
    this.list.remove(id, version);
  }
}
