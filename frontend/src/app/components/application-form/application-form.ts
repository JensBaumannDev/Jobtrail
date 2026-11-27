import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { guestLimitKey } from '../../core/server-errors';
import { normalizeWebsite } from '../../core/url';
import { FieldErrors } from '../../models/api-error.model';
import {
  APPLICATION_STATUSES,
  Application,
  ApplicationInput,
  ApplicationStatus,
  WORK_MODES,
  WorkMode,
} from '../../models/application.model';
import { ApplicationService } from '../../services/application.service';
import { serverErrorKeys } from './server-error-key';

type FieldName = keyof ApplicationInput;
type FieldKind = 'text' | 'url' | 'date' | 'workMode' | 'status';
type TextFieldName = 'company' | 'role' | 'location' | 'next_step' | 'contact' | 'salary_expectation';

interface FieldConfig {
  name: FieldName;
  kind: FieldKind;
  maxLength: number;
  required: boolean;
  wide: boolean;
}

const DEFAULT_ROLE = 'Fullstack Developer';
const DEFAULT_STATUS: ApplicationStatus = 'awaiting_response';

const FIELDS: readonly FieldConfig[] = [
  { name: 'company', kind: 'text', maxLength: 120, required: true, wide: false },
  { name: 'website', kind: 'url', maxLength: 500, required: true, wide: false },
  { name: 'role', kind: 'text', maxLength: 120, required: false, wide: false },
  { name: 'location', kind: 'text', maxLength: 120, required: false, wide: false },
  { name: 'work_mode', kind: 'workMode', maxLength: 0, required: false, wide: false },
  { name: 'status', kind: 'status', maxLength: 0, required: false, wide: false },
  { name: 'next_step', kind: 'text', maxLength: 200, required: false, wide: false },
  { name: 'next_step_on', kind: 'date', maxLength: 0, required: false, wide: false },
  { name: 'job_ad_url', kind: 'url', maxLength: 500, required: false, wide: true },
  { name: 'contact', kind: 'text', maxLength: 120, required: false, wide: false },
  { name: 'salary_expectation', kind: 'text', maxLength: 60, required: false, wide: false },
];

const PLACEHOLDER_FIELDS: ReadonlySet<FieldName> = new Set([
  'website',
  'location',
  'next_step',
  'job_ad_url',
  'contact',
  'salary_expectation',
]);

let nextFormId = 1;

function requiredText(control: AbstractControl<string>): ValidationErrors | null {
  return control.value.trim() ? null : { required: true };
}

function websiteFormat(control: AbstractControl<string>): ValidationErrors | null {
  const value = control.value.trim();
  return !value || normalizeWebsite(value) ? null : { url: true };
}

function validatorsFor(name: FieldName): ValidatorFn[] {
  const field = FIELDS.find((item) => item.name === name);
  if (!field) {
    return [];
  }
  return [
    ...(field.required ? [requiredText] : []),
    ...(field.kind === 'url' ? [websiteFormat] : []),
    ...(field.maxLength > 0 ? [Validators.maxLength(field.maxLength)] : []),
  ];
}

function serverMessages(errors: FieldErrors, name: FieldName): string[] {
  return Object.hasOwn(errors, name) ? errors[name] : [];
}

function isFieldErrors(value: unknown): value is FieldErrors {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return Object.values(value).every(
    (messages) => Array.isArray(messages) && messages.every((message) => typeof message === 'string'),
  );
}

@Component({
  selector: 'app-application-form',
  imports: [ReactiveFormsModule, TranslatePipe, NgTemplateOutlet],
  templateUrl: './application-form.html',
  styleUrl: './application-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'application-form' },
})
export class ApplicationForm {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly applicationService = inject(ApplicationService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private prefilledId: number | null = null;

  readonly application = input<Application | null>(null);
  readonly headingLevel = computed(() => (this.application() ? 4 : 3));
  readonly saved = output<Application>();
  readonly cancelled = output<void>();

  readonly fields = FIELDS;
  readonly workModes = WORK_MODES;
  readonly statuses = APPLICATION_STATUSES;
  readonly idPrefix = `application-form-${nextFormId++}`;
  readonly isEditing = computed(() => this.application() !== null);
  readonly saving = signal(false);
  readonly saveErrorKey = signal<string | null>(null);
  readonly submitted = signal(false);

  readonly form = this.formBuilder.group({
    company: ['', validatorsFor('company')],
    website: ['', validatorsFor('website')],
    role: [DEFAULT_ROLE, validatorsFor('role')],
    location: ['', validatorsFor('location')],
    work_mode: this.formBuilder.control<WorkMode>('remote'),
    status: this.formBuilder.control<ApplicationStatus>(DEFAULT_STATUS),
    next_step: ['', validatorsFor('next_step')],
    next_step_on: [''],
    job_ad_url: ['', validatorsFor('job_ad_url')],
    contact: ['', validatorsFor('contact')],
    salary_expectation: ['', validatorsFor('salary_expectation')],
  });

  constructor() {
    effect(() => {
      const application = this.application();
      untracked(() => this.prefill(application));
    });
  }

  fieldId(name: FieldName): string {
    return `${this.idPrefix}-${name}`;
  }

  placeholderKey(name: FieldName): string | null {
    return PLACEHOLDER_FIELDS.has(name) ? `applicationForm.placeholders.${name}` : null;
  }

  errorId(name: FieldName): string {
    return `${this.fieldId(name)}-error`;
  }

  hasError(name: FieldName): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted());
  }

  clientErrorKey(name: FieldName): string | null {
    const errors = this.form.controls[name].errors;
    if (errors?.['required']) {
      return 'applicationForm.errors.required';
    }
    if (errors?.['url']) {
      return 'common.invalidUrl';
    }
    return errors?.['maxlength'] ? 'applicationForm.errors.tooLong' : null;
  }

  serverErrors(name: FieldName): string[] {
    const messages: unknown = this.form.controls[name].errors?.['server'];
    return Array.isArray(messages) ? messages.filter((message) => typeof message === 'string') : [];
  }

  async submit(): Promise<void> {
    this.submitted.set(true);
    this.saveErrorKey.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.focusFirstInvalid();
      return;
    }
    await this.save();
  }

  cancel(): void {
    this.cancelled.emit();
  }

  private async save(): Promise<void> {
    this.saving.set(true);
    try {
      this.saved.emit(await this.persist(this.toInput()));
    } catch (error) {
      this.handleError(error);
    } finally {
      this.saving.set(false);
    }
  }

  private prefill(application: Application | null): void {
    const id = application?.id ?? null;
    if (id !== null && id === this.prefilledId) {
      return;
    }
    this.prefilledId = id;
    this.submitted.set(false);
    this.saveErrorKey.set(null);
    this.form.reset(application ? this.valuesFrom(application) : {});
  }

  private valuesFrom(application: Application): Partial<ApplicationInput> & { next_step_on: string } {
    const { next_step_on, ...rest } = application;
    return { ...rest, next_step_on: next_step_on ?? '' };
  }

  private toInput(): ApplicationInput {
    const value = this.form.getRawValue();
    return {
      ...value,
      ...this.trimmedTexts(value),
      website: normalizeWebsite(value.website) ?? '',
      next_step_on: value.next_step_on || null,
      job_ad_url: normalizeWebsite(value.job_ad_url) ?? '',
    };
  }

  private trimmedTexts(value: Pick<ApplicationInput, TextFieldName>): Pick<ApplicationInput, TextFieldName> {
    return {
      company: value.company.trim(),
      role: value.role.trim(),
      location: value.location.trim(),
      next_step: value.next_step.trim(),
      contact: value.contact.trim(),
      salary_expectation: value.salary_expectation.trim(),
    };
  }

  private persist(input: ApplicationInput): Promise<Application> {
    const application = this.application();
    return application
      ? this.applicationService.update(application.id, input)
      : this.applicationService.create(input);
  }

  private handleError(error: unknown): void {
    const body: unknown = error instanceof HttpErrorResponse && error.status === 400 ? error.error : null;
    if (isFieldErrors(body) && this.applyFieldErrors(body)) {
      afterNextRender(() => this.focusFirstInvalid(), { injector: this.injector });
      return;
    }
    this.saveErrorKey.set(guestLimitKey(error, 'applications') ?? 'common.saveError');
  }

  private applyFieldErrors(errors: FieldErrors): boolean {
    let applied = false;
    for (const field of this.fields) {
      const messages = serverMessages(errors, field.name);
      if (messages.length) {
        this.form.controls[field.name].setErrors({ server: serverErrorKeys(messages) });
        applied = true;
      }
    }
    return applied;
  }

  private focusFirstInvalid(): void {
    const field = this.fields.find((item) => this.form.controls[item.name].invalid);
    if (field) {
      this.host.nativeElement.querySelector<HTMLElement>(`#${this.fieldId(field.name)}`)?.focus();
    }
  }
}
