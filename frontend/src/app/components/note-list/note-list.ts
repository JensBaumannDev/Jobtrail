import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { guestLimitKey } from '../../core/server-errors';
import { Application, Note, NoteInput } from '../../models/application.model';
import { LanguageService } from '../../services/language.service';
import { NoteService } from '../../services/note.service';
import { ToastService } from '../../services/toast.service';

let nextNoteListId = 1;

function isFilled(value: unknown): boolean {
  return typeof value === 'string' && value.trim() !== '';
}

function noteHasContent(control: AbstractControl): ValidationErrors | null {
  const title: unknown = control.get('title')?.value;
  const text: unknown = control.get('text')?.value;
  return isFilled(title) || isFilled(text) ? null : { empty: true };
}

function newestFirst(first: Note, second: Note): number {
  return Date.parse(second.updated_at) - Date.parse(first.updated_at) || second.id - first.id;
}

@Component({
  selector: 'app-note-list',
  imports: [ReactiveFormsModule, TranslatePipe, NgTemplateOutlet],
  templateUrl: './note-list.html',
  styleUrl: './note-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'note-list' },
})
export class NoteList {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly noteService = inject(NoteService);
  private readonly toastService = inject(ToastService);
  private readonly language = inject(LanguageService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  readonly application = input.required<Application>();

  readonly idPrefix = `note-list-${nextNoteListId++}`;
  readonly editingId = signal<number | null>(null);
  readonly saving = signal(false);
  readonly errorKey = signal<string | null>(null);
  readonly notes = computed(() => {
    const hidden = this.noteService.pendingNoteIds();
    return this.application()
      .notes.filter((note) => !hidden.has(note.id))
      .sort(newestFirst);
  });

  readonly form = this.formBuilder.group(
    {
      title: ['', Validators.maxLength(120)],
      text: ['', Validators.maxLength(5000)],
    },
    { validators: noteHasContent },
  );

  formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const locale = this.language.current() === 'en' ? 'en-GB' : 'de-DE';
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
  }

  startEdit(note: Note): void {
    this.editingId.set(note.id);
    this.errorKey.set(null);
    this.form.reset({ title: note.title, text: note.text });
    this.focusTitle();
  }

  cancelEdit(): void {
    this.resetForm();
    this.focusTitle();
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.errorKey.set(this.form.hasError('empty') ? 'notes.emptyError' : 'notes.tooLong');
      this.focusTitle();
      return;
    }
    await this.save(this.toInput());
  }

  editButtonId(noteId: number): string {
    return `${this.idPrefix}-edit-${noteId}`;
  }

  remove(note: Note): void {
    const nextNote = this.neighbourOf(note.id);
    this.stopEditing(note.id);
    this.noteService.deleteWithUndo(this.application().id, note.id, () =>
      this.focusAfterRender(`#${this.editButtonId(note.id)}`),
    );
    this.focusAfterRender(nextNote ? `#${this.editButtonId(nextNote.id)}` : `#${this.idPrefix}-heading`);
  }

  private async save(input: NoteInput): Promise<void> {
    const editingId = this.editingId();
    this.saving.set(true);
    this.errorKey.set(null);
    try {
      await this.persist(editingId, input);
      this.finishSave(editingId);
    } catch (error) {
      this.errorKey.set(guestLimitKey(error, 'notes') ?? 'common.saveError');
    } finally {
      this.saving.set(false);
    }
  }

  private persist(editingId: number | null, input: NoteInput): Promise<Note> {
    const applicationId = this.application().id;
    return editingId === null
      ? this.noteService.create(applicationId, input)
      : this.noteService.update(applicationId, editingId, input);
  }

  private finishSave(editingId: number | null): void {
    this.toastService.show(editingId === null ? 'notes.saved' : 'notes.updated');
    this.resetForm();
    this.focusTitle();
  }

  private stopEditing(noteId: number): void {
    if (this.editingId() === noteId) {
      this.resetForm();
    }
  }

  private toInput(): NoteInput {
    const value = this.form.getRawValue();
    return { title: value.title.trim(), text: value.text.trim() };
  }

  private resetForm(): void {
    this.editingId.set(null);
    this.errorKey.set(null);
    this.form.reset();
  }

  private neighbourOf(noteId: number): Note | undefined {
    const notes = this.notes();
    const index = notes.findIndex((note) => note.id === noteId);
    return notes[index + 1] ?? notes[index - 1];
  }

  private focusTitle(): void {
    this.focusAfterRender(`#${this.idPrefix}-title`);
  }

  private focusAfterRender(selector: string): void {
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus(), {
      injector: this.injector,
    });
  }
}
