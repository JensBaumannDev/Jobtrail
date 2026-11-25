import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Note, NoteInput } from '../models/application.model';
import { ApplicationService } from './application.service';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class NoteService {
  private readonly http = inject(HttpClient);
  private readonly applications = inject(ApplicationService);
  private readonly toast = inject(ToastService);
  private readonly version = inject(AuthService).sessionVersion;
  private readonly pendingIds = signal<ReadonlySet<number>>(new Set());

  readonly pendingNoteIds = this.pendingIds.asReadonly();

  async create(applicationId: number, input: NoteInput): Promise<Note> {
    const note = await firstValueFrom(
      this.http.post<Note>(`/api/applications/${applicationId}/notes/`, input),
    );
    this.updateNotes(applicationId, (notes) => [note, ...notes]);
    return note;
  }

  async update(applicationId: number, noteId: number, input: NoteInput): Promise<Note> {
    const note = await firstValueFrom(this.http.patch<Note>(`/api/notes/${noteId}/`, input));
    this.updateNotes(applicationId, (notes) => notes.map((item) => (item.id === noteId ? note : item)));
    return note;
  }

  deleteWithUndo(applicationId: number, noteId: number, afterUndo?: () => void): void {
    const version = this.version();
    this.setPending(noteId, true);
    this.toast.scheduleWithUndo({
      messageKey: 'notes.deleted',
      messageParams: {},
      commit: () => this.remove(applicationId, noteId, version),
      undo: () => this.setPending(noteId, false),
      afterUndo,
    });
  }

  reset(): void {
    this.pendingIds.set(new Set());
  }

  private async remove(applicationId: number, noteId: number, version: number): Promise<void> {
    if (version !== this.version()) {
      return;
    }
    await firstValueFrom(this.http.delete<void>(`/api/notes/${noteId}/`));
    this.updateNotes(applicationId, (notes) => notes.filter((item) => item.id !== noteId));
    this.setPending(noteId, false);
  }

  private setPending(noteId: number, pending: boolean): void {
    this.pendingIds.update((ids) => {
      const next = new Set(ids);
      if (pending) {
        next.add(noteId);
      } else {
        next.delete(noteId);
      }
      return next;
    });
  }

  private updateNotes(applicationId: number, change: (notes: Note[]) => Note[]): void {
    const application = this.applications.find(applicationId);
    if (application) {
      this.applications.replace({ ...application, notes: change(application.notes) });
    }
  }
}
