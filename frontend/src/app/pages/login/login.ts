import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { PageHero } from '../../components/page-hero/page-hero';
import { AuthService } from '../../services/auth.service';

const CREDENTIAL_ERROR_STATUSES = [400, 401];
const RATE_LIMIT_STATUS = 429;
const USERNAME_MAX_LENGTH = 150;
const PASSWORD_MAX_LENGTH = 128;

type LoginField = 'username' | 'password';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, TranslatePipe, PageHero],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly expired = input<string>();

  protected readonly usernameMaxLength = USERNAME_MAX_LENGTH;
  protected readonly passwordMaxLength = PASSWORD_MAX_LENGTH;
  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly errorKey = signal<string | null>(null);
  protected readonly showExpired = computed(() => this.expired() === '1' && !this.errorKey());
  protected readonly form = inject(FormBuilder).nonNullable.group({
    username: ['', [Validators.required, Validators.maxLength(USERNAME_MAX_LENGTH)]],
    password: ['', [Validators.required, Validators.maxLength(PASSWORD_MAX_LENGTH)]],
  });

  protected showRequired(field: LoginField): boolean {
    const control = this.form.controls[field];
    return control.hasError('required') && (control.touched || this.submitted());
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { username, password } = this.form.getRawValue();
    await this.authenticate(() => this.auth.login(username, password), 'login.credentialsError');
  }

  protected async loginAsGuest(): Promise<void> {
    await this.authenticate(() => this.auth.loginAsGuest(), 'login.genericError');
  }

  private async authenticate(action: () => Promise<void>, rejectedKey: string): Promise<void> {
    this.submitting.set(true);
    this.errorKey.set(null);
    try {
      await action();
      await this.router.navigate(['/applications']);
    } catch (error) {
      this.errorKey.set(errorKeyFor(error, rejectedKey));
    } finally {
      this.form.controls.password.reset();
      this.submitted.set(false);
      this.submitting.set(false);
    }
  }
}

function errorKeyFor(error: unknown, rejectedKey: string): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'login.genericError';
  }
  if (error.status === RATE_LIMIT_STATUS) {
    return 'login.rateLimitError';
  }
  return CREDENTIAL_ERROR_STATUSES.includes(error.status) ? rejectedKey : 'login.genericError';
}
