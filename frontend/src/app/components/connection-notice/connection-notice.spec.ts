import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { ConnectionService } from '../../services/connection.service';
import { ConnectionNotice } from './connection-notice';

function setup(online: boolean) {
  const isOnline = signal(online);
  TestBed.configureTestingModule({
    imports: [ConnectionNotice],
    providers: [provideTranslateService(), { provide: ConnectionService, useValue: { isOnline } }],
  });
  const fixture = TestBed.createComponent(ConnectionNotice);
  fixture.detectChanges();
  return { fixture, isOnline };
}

function noticeText(element: HTMLElement): string | undefined {
  return element.querySelector('.connection-notice')?.textContent?.trim();
}

describe('ConnectionNotice', () => {
  it('shows nothing while online', () => {
    const { fixture } = setup(true);
    expect(noticeText(fixture.nativeElement)).toBeUndefined();
  });

  it('shows the offline message while offline', () => {
    const { fixture } = setup(false);
    expect(noticeText(fixture.nativeElement)).toBe('connection.offline');
  });

  it('appears when the connection drops and goes away when it returns', () => {
    const { fixture, isOnline } = setup(true);
    isOnline.set(false);
    fixture.detectChanges();
    expect(noticeText(fixture.nativeElement)).toBe('connection.offline');
    isOnline.set(true);
    fixture.detectChanges();
    expect(noticeText(fixture.nativeElement)).toBeUndefined();
  });

  it('is a status region that exists before the message appears', () => {
    const { fixture } = setup(true);
    expect(fixture.nativeElement.getAttribute('role')).toBe('status');
  });

  it('shows the translated text for both languages', async () => {
    const { fixture } = setup(false);
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('de', { connection: { offline: 'Keine Internetverbindung.' } });
    translate.setTranslation('en', { connection: { offline: 'No internet connection.' } });
    await firstValueFrom(translate.use('de'));
    fixture.detectChanges();
    expect(noticeText(fixture.nativeElement)).toBe('Keine Internetverbindung.');
    await firstValueFrom(translate.use('en'));
    fixture.detectChanges();
    expect(noticeText(fixture.nativeElement)).toBe('No internet connection.');
  });
});
