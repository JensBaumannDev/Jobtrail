import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { buildApplication } from '../../core/testing/application.factory';
import { LanguageService } from '../../services/language.service';
import { NoteService } from '../../services/note.service';
import { ToastService } from '../../services/toast.service';
import { NoteList } from './note-list';

function setup(create: () => Promise<unknown>) {
  TestBed.configureTestingModule({
    imports: [NoteList],
    providers: [
      provideTranslateService(),
      { provide: NoteService, useValue: { create, pendingNoteIds: signal(new Set<number>()) } },
      { provide: ToastService, useValue: { show: vi.fn() } },
      { provide: LanguageService, useValue: { current: signal('de') } },
    ],
  });
  const fixture = TestBed.createComponent(NoteList);
  fixture.componentRef.setInput('application', buildApplication());
  fixture.componentInstance.form.patchValue({ title: 'Questions' });
  fixture.detectChanges();
  return fixture;
}

async function errorAfterSubmit(create: () => Promise<unknown>): Promise<string | undefined> {
  const fixture = setup(create);
  await fixture.componentInstance.submit();
  fixture.detectChanges();
  return fixture.nativeElement.querySelector('[role="alert"]')?.textContent?.trim();
}

describe('NoteList save errors', () => {
  it('shows the notes limit message when the demo limit is reached', async () => {
    const create = () => Promise.reject(new HttpErrorResponse({ status: 429 }));
    expect(await errorAfterSubmit(create)).toBe('guestLimits.notes');
  });

  it('shows the general save error for a server error', async () => {
    const create = () => Promise.reject(new HttpErrorResponse({ status: 500 }));
    expect(await errorAfterSubmit(create)).toBe('common.saveError');
  });

  it('shows the general save error when the network is down', async () => {
    const create = () => Promise.reject(new HttpErrorResponse({ status: 0 }));
    expect(await errorAfterSubmit(create)).toBe('common.saveError');
  });
});
