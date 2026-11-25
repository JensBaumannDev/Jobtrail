import { TestBed } from '@angular/core/testing';
import { ToastService, UNDO_WINDOW_MS, UndoRequest } from './toast.service';

function request(overrides: Partial<UndoRequest> = {}): UndoRequest {
  return {
    messageKey: 'list.deleted',
    messageParams: {},
    commit: vi.fn(() => Promise.resolve()),
    undo: vi.fn(),
    ...overrides,
  };
}

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = TestBed.inject(ToastService);
  });

  afterEach(() => vi.useRealTimers());

  it('commits after the undo window', async () => {
    const action = request();
    service.scheduleWithUndo(action);
    await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS);
    expect(action.commit).toHaveBeenCalledTimes(1);
    expect(service.currentUndo()).toBeNull();
  });

  it('undo restores and never commits', async () => {
    const afterUndo = vi.fn();
    const action = request({ afterUndo });
    service.scheduleWithUndo(action);
    service.undo();
    await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS);
    expect(action.undo).toHaveBeenCalledTimes(1);
    expect(afterUndo).toHaveBeenCalledTimes(1);
    expect(action.commit).not.toHaveBeenCalled();
  });

  it('does not commit while paused', async () => {
    const action = request();
    service.scheduleWithUndo(action);
    service.pause();
    await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS * 2);
    expect(action.commit).not.toHaveBeenCalled();
    service.resume();
    await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS);
    expect(action.commit).toHaveBeenCalledTimes(1);
  });

  it('discard drops a pending delete without committing', async () => {
    const action = request();
    service.scheduleWithUndo(action);
    service.discard();
    await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS);
    expect(action.commit).not.toHaveBeenCalled();
  });

  it('an info toast keeps the pending undo', () => {
    const action = request();
    service.scheduleWithUndo(action);
    service.show('notes.saved');
    expect(service.currentUndo()).not.toBeNull();
    expect(action.commit).not.toHaveBeenCalled();
  });

  it('a failed commit restores the item without touching the next delete', async () => {
    const failing = request({ commit: vi.fn(() => Promise.reject(new Error('fail'))) });
    service.scheduleWithUndo(failing);
    const next = request();
    service.scheduleWithUndo(next);
    await vi.advanceTimersByTimeAsync(0);
    expect(failing.undo).toHaveBeenCalledTimes(1);
    expect(next.commit).not.toHaveBeenCalled();
    expect(service.currentUndo()).not.toBeNull();
  });
});
