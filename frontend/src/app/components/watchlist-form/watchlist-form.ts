import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { INVALID_URL_MESSAGE, guestLimitKey } from '../../core/server-errors';
import { normalizeWebsite } from '../../core/url';
import { FieldErrors } from '../../models/api-error.model';
import { WATCH_PLANS, WatchItem, WatchItemInput, WatchPlan } from '../../models/watch-item.model';
import { ToastService } from '../../services/toast.service';
import { WatchlistService } from '../../services/watchlist.service';

type WatchField = 'company' | 'website' | 'careersUrl' | 'location' | 'plan' | 'note';

const FIELD_ORDER: readonly WatchField[] = [
  'company',
  'website',
  'careersUrl',
  'location',
  'plan',
  'note',
];

const API_FIELDS: Partial<Record<string, WatchField>> = {
  company: 'company',
  website: 'website',
  careers_url: 'careersUrl',
  location: 'location',
  plan: 'plan',
  note: 'note',
};

const REQUIRED_KEYS: Partial<Record<WatchField, string>> = {
  company: 'watchForm.errors.companyRequired',
  website: 'watchForm.errors.websiteRequired',
};

function requiredText(control: AbstractControl<string>): ValidationErrors | null {
  return control.value.trim() ? null : { required: true };
}

function websiteFormat(control: AbstractControl<string>): ValidationErrors | null {
  return !control.value.trim() || normalizeWebsite(control.value) ? null : { invalidUrl: true };
}

function serverMessageKey(message: string): string {
  if (/required|blank|null/i.test(message)) {
    return 'watchForm.errors.required';
  }
  if (INVALID_URL_MESSAGE.test(message)) {
    return 'common.invalidUrl';
  }
  return /no more than/i.test(message) ? 'watchForm.errors.tooLong' : 'watchForm.errors.checkField';
}

function fieldErrorsFrom(error: unknown): FieldErrors | null {
  if (!(error instanceof HttpErrorResponse) || error.status !== 400) {
    return null;
  }
  const body: unknown = error.error;
  return body && typeof body === 'object' ? (body as FieldErrors) : null;
}

@Component({
  selector: 'app-watchlist-form',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './watchlist-form.html',
  styleUrl: './watchlist-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WatchlistForm {
  private readonly watchlist = inject(WatchlistService);
  private readonly toast = inject(ToastService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly item = input<WatchItem | null>(null);
  readonly saved = output<WatchItem>();
  readonly cancelled = output<void>();

  readonly plans = WATCH_PLANS;
  readonly isEditing = computed(() => this.item() !== null);
  readonly isSaving = signal(false);
  readonly submitted = signal(false);
  readonly generalError = signal('');

  readonly form = inject(NonNullableFormBuilder).group({
    company: ['', [requiredText, Validators.maxLength(120)]],
    website: ['', [requiredText, websiteFormat, Validators.maxLength(500)]],
    careersUrl: ['', [websiteFormat, Validators.maxLength(500)]],
    location: ['', Validators.maxLength(120)],
    plan: ['apply' as WatchPlan],
    note: ['', Validators.maxLength(5000)],
  });

  constructor() {
    effect(() => {
      const item = this.item();
      untracked(() => (item ? this.startEditing(item) : this.resetForm()));
    });
  }

  showError(field: WatchField): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || this.submitted());
  }

  errorKey(field: WatchField): string {
    const errors = this.form.controls[field].errors ?? {};
    if (errors['required']) {
      return REQUIRED_KEYS[field] ?? 'watchForm.errors.required';
    }
    return errors['invalidUrl'] ? `watchForm.errors.${field}Invalid` : 'watchForm.errors.tooLong';
  }

  serverErrorKey(field: WatchField): string {
    const key: unknown = this.form.controls[field].errors?.['server'];
    return typeof key === 'string' ? key : '';
  }

  async submit(): Promise<void> {
    this.submitted.set(true);
    this.generalError.set('');
    if (this.form.invalid) {
      this.focusFirstInvalid();
      return;
    }
    this.isSaving.set(true);
    try {
      await this.save(this.toInput());
    } catch (error) {
      this.handleSaveError(error);
    } finally {
      this.isSaving.set(false);
    }
  }

  cancel(): void {
    this.resetForm();
    this.cancelled.emit();
  }

  private async save(input: WatchItemInput): Promise<void> {
    const current = this.item();
    const result = current
      ? await this.watchlist.update(current.id, input)
      : await this.watchlist.create(input);
    this.toast.show(current ? 'watchForm.updated' : 'watchForm.created', { company: result.company });
    this.resetForm();
    this.saved.emit(result);
  }

  private toInput(): WatchItemInput {
    const value = this.form.getRawValue();
    return {
      company: value.company.trim(),
      website: normalizeWebsite(value.website) ?? '',
      careers_url: normalizeWebsite(value.careersUrl) ?? '',
      location: value.location.trim(),
      plan: value.plan,
      note: value.note.trim(),
    };
  }

  private handleSaveError(error: unknown): void {
    const fieldErrors = fieldErrorsFrom(error);
    const applied = fieldErrors ? this.applyFieldErrors(fieldErrors) : false;
    if (!applied) {
      this.generalError.set(guestLimitKey(error, 'watchItems') ?? 'common.saveError');
      return;
    }
    this.focusFirstInvalid();
  }

  private applyFieldErrors(fieldErrors: FieldErrors): boolean {
    let applied = false;
    for (const [apiField, messages] of Object.entries(fieldErrors)) {
      const field = Object.hasOwn(API_FIELDS, apiField) ? API_FIELDS[apiField] : undefined;
      if (field && Array.isArray(messages) && typeof messages[0] === 'string') {
        this.form.controls[field].setErrors({ server: serverMessageKey(messages[0]) });
        applied = true;
      }
    }
    return applied;
  }

  private startEditing(item: WatchItem): void {
    this.submitted.set(false);
    this.generalError.set('');
    this.form.reset({
      company: item.company,
      website: item.website,
      careersUrl: item.careers_url,
      location: item.location,
      plan: item.plan,
      note: item.note,
    });
    this.host.nativeElement.scrollIntoView({ block: 'nearest' });
    this.fieldElement('company')?.focus({ preventScroll: true });
  }

  private resetForm(): void {
    this.submitted.set(false);
    this.generalError.set('');
    this.form.reset();
  }

  private focusFirstInvalid(): void {
    const field = FIELD_ORDER.find((name) => this.form.controls[name].invalid);
    this.fieldElement(field ?? 'company')?.focus();
  }

  private fieldElement(field: WatchField): HTMLElement | null {
    return this.host.nativeElement.querySelector<HTMLElement>(`#watch-${field}`);
  }
}
