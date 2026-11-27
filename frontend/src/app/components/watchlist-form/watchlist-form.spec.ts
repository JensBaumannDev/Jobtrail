import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { ToastService } from '../../services/toast.service';
import { WatchlistService } from '../../services/watchlist.service';
import { WatchlistForm } from './watchlist-form';

async function submitWith(error: HttpErrorResponse) {
  TestBed.configureTestingModule({
    imports: [WatchlistForm],
    providers: [
      provideTranslateService(),
      { provide: WatchlistService, useValue: { create: () => Promise.reject(error) } },
      { provide: ToastService, useValue: { show: vi.fn() } },
    ],
  });
  const fixture = TestBed.createComponent(WatchlistForm);
  fixture.detectChanges();
  fixture.componentInstance.form.patchValue({ company: 'Example GmbH', website: 'example.com' });
  await fixture.componentInstance.submit();
  fixture.detectChanges();
  return fixture;
}

describe('WatchlistForm save errors', () => {
  it('shows the watchlist limit message when the demo limit is reached', async () => {
    const fixture = await submitWith(new HttpErrorResponse({ status: 429 }));
    expect(fixture.componentInstance.generalError()).toBe('guestLimits.watchItems');
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent?.trim()).toBe('guestLimits.watchItems');
  });

  it('shows the general save error for a server error', async () => {
    const fixture = await submitWith(new HttpErrorResponse({ status: 500 }));
    expect(fixture.componentInstance.generalError()).toBe('common.saveError');
  });

  it('maps the backend website message to the invalid url key', async () => {
    const error = new HttpErrorResponse({ status: 400, error: { website: ['Enter a valid http or https address.'] } });
    const fixture = await submitWith(error);
    expect(fixture.componentInstance.serverErrorKey('website')).toBe('common.invalidUrl');
    expect(fixture.componentInstance.generalError()).toBe('');
  });
});
