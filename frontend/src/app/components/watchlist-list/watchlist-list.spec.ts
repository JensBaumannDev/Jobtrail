import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { WatchItem } from '../../models/watch-item.model';
import { ToastService } from '../../services/toast.service';
import { WatchlistService } from '../../services/watchlist.service';
import { WatchlistList } from './watchlist-list';

const ITEM: WatchItem = {
  id: 3,
  company: 'Example GmbH',
  website: 'https://example.com/',
  careers_url: '',
  location: '',
  plan: 'apply',
  note: 'Ask about remote work',
  created_at: '2026-11-01T10:00:00Z',
  updated_at: '2026-11-01T10:00:00Z',
};

async function convertWith(error: HttpErrorResponse) {
  const show = vi.fn();
  TestBed.configureTestingModule({
    imports: [WatchlistList],
    providers: [
      provideRouter([]),
      provideTranslateService(),
      { provide: WatchlistService, useValue: { watchItems: signal([ITEM]), convert: () => Promise.reject(error) } },
      { provide: ToastService, useValue: { show } },
    ],
  });
  await TestBed.createComponent(WatchlistList).componentInstance.convert(ITEM);
  return show;
}

describe('WatchlistList convert errors', () => {
  it('shows the applications limit message when the demo limit is reached', async () => {
    const show = await convertWith(new HttpErrorResponse({ status: 429 }));
    expect(show).toHaveBeenCalledExactlyOnceWith('guestLimits.applications', { company: 'Example GmbH' });
  });

  it('shows the convert failed message for a server error', async () => {
    const show = await convertWith(new HttpErrorResponse({ status: 500 }));
    expect(show).toHaveBeenCalledExactlyOnceWith('watchlist.convertFailed', { company: 'Example GmbH' });
  });
});
