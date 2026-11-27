import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { Login } from './login';

function setup(status: number): ComponentFixture<Login> {
  const failure = () => Promise.reject(new HttpErrorResponse({ status }));
  TestBed.configureTestingModule({
    imports: [Login],
    providers: [
      provideTranslateService(),
      { provide: AuthService, useValue: { login: failure, loginAsGuest: failure } },
      { provide: Router, useValue: { navigate: vi.fn() } },
    ],
  });
  const fixture = TestBed.createComponent(Login);
  fixture.detectChanges();
  return fixture;
}

function typeInto(fixture: ComponentFixture<Login>, selector: string, value: string): void {
  const input: HTMLInputElement = fixture.nativeElement.querySelector(selector);
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

async function shownError(fixture: ComponentFixture<Login>, trigger: () => void): Promise<string | undefined> {
  trigger();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture.nativeElement.querySelector('[role="alert"]')?.textContent?.trim();
}

function clickGuestButton(fixture: ComponentFixture<Login>): void {
  fixture.nativeElement.querySelector('[aria-labelledby="login-guest-title"] button').click();
}

describe('Login errors', () => {
  it('shows the guest network limit message when guest logins from one network are used up', async () => {
    const fixture = setup(429);
    expect(await shownError(fixture, () => clickGuestButton(fixture))).toBe('login.guestRateLimitError');
  });

  it('shows the demo busy message when the demo is full', async () => {
    const fixture = setup(503);
    expect(await shownError(fixture, () => clickGuestButton(fixture))).toBe('login.demoBusyError');
  });

  it('keeps the general rate limit message for my own login', async () => {
    const fixture = setup(429);
    typeInto(fixture, '#login-username', 'owner');
    typeInto(fixture, '#login-password', 'test-password');
    const submit = () => fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    expect(await shownError(fixture, submit)).toBe('login.rateLimitError');
  });
});
