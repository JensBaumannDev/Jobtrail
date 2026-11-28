import { TestBed } from '@angular/core/testing';
import { ConnectionService } from './connection.service';

function setNavigatorOnline(online: boolean): void {
  vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(online);
}

describe('ConnectionService', () => {
  afterEach(() => vi.restoreAllMocks());

  it('starts online when the browser is online', () => {
    setNavigatorOnline(true);
    expect(TestBed.inject(ConnectionService).isOnline()).toBe(true);
  });

  it('starts offline when the browser is offline', () => {
    setNavigatorOnline(false);
    expect(TestBed.inject(ConnectionService).isOnline()).toBe(false);
  });

  it('goes offline on the offline event', () => {
    setNavigatorOnline(true);
    const service = TestBed.inject(ConnectionService);
    window.dispatchEvent(new Event('offline'));
    expect(service.isOnline()).toBe(false);
  });

  it('comes back online on the online event', () => {
    setNavigatorOnline(false);
    const service = TestBed.inject(ConnectionService);
    window.dispatchEvent(new Event('online'));
    expect(service.isOnline()).toBe(true);
  });

  it('follows several changes in a row', () => {
    setNavigatorOnline(true);
    const service = TestBed.inject(ConnectionService);
    window.dispatchEvent(new Event('offline'));
    window.dispatchEvent(new Event('online'));
    window.dispatchEvent(new Event('offline'));
    expect(service.isOnline()).toBe(false);
  });
});
