import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { ApplicationService } from '../../services/application.service';
import { ApplicationForm } from './application-form';

function setup(create: () => Promise<unknown>) {
  TestBed.configureTestingModule({
    imports: [ApplicationForm],
    providers: [provideTranslateService(), { provide: ApplicationService, useValue: { create } }],
  });
  const fixture = TestBed.createComponent(ApplicationForm);
  fixture.detectChanges();
  fixture.componentInstance.form.patchValue({ company: 'Example GmbH', website: 'example.com' });
  return fixture;
}

async function submitAndRender(create: () => Promise<unknown>): Promise<HTMLElement> {
  const fixture = setup(create);
  await fixture.componentInstance.submit();
  fixture.detectChanges();
  return fixture.nativeElement;
}

function rejectWith(status: number, error: unknown = null): () => Promise<unknown> {
  return () => Promise.reject(new HttpErrorResponse({ status, error }));
}

describe('ApplicationForm save errors', () => {
  it('shows the applications limit message when the demo limit is reached', async () => {
    const element = await submitAndRender(rejectWith(429));
    expect(element.querySelector('[role="alert"]')?.textContent?.trim()).toBe('guestLimits.applications');
  });

  it('shows the general save error for a server error', async () => {
    const element = await submitAndRender(rejectWith(500));
    expect(element.querySelector('[role="alert"]')?.textContent?.trim()).toBe('common.saveError');
  });

  it('shows the invalid url message under the website for the backend message', async () => {
    const element = await submitAndRender(rejectWith(400, { website: ['Enter a valid http or https address.'] }));
    const errors = [...element.querySelectorAll('.application-form__error-text')].map((node) => node.textContent?.trim());
    expect(errors).toEqual(['common.invalidUrl']);
    expect(element.querySelector('[role="alert"]')?.textContent?.trim()).toBe('');
  });

  it('clears the limit message on the next submit attempt', async () => {
    const fixture = setup(rejectWith(429));
    await fixture.componentInstance.submit();
    fixture.componentInstance.form.controls.company.setValue('');
    await fixture.componentInstance.submit();
    expect(fixture.componentInstance.saveErrorKey()).toBeNull();
  });
});
