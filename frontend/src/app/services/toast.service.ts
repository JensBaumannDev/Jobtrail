import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

export const INFO_DURATION_MS = 6000;
export const UNDO_WINDOW_MS = 10000;

export interface ToastMessage {
  id: number;
  messageKey: string;
  messageParams: Record<string, string>;
}

export interface UndoRequest {
  messageKey: string;
  messageParams: Record<string, string>;
  commit: () => Promise<void>;
  undo: () => void;
  afterUndo?: () => void;
}

interface PendingAction {
  request: UndoRequest;
  message: ToastMessage;
  timer: ReturnType<typeof setTimeout> | null;
  remainingMs: number;
  startedAt: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly document = inject(DOCUMENT);
  private readonly info = signal<ToastMessage | null>(null);
  private readonly undoMessage = signal<ToastMessage | null>(null);
  private pending: PendingAction | null = null;
  private nextId = 1;

  readonly current = this.info.asReadonly();
  readonly currentUndo = this.undoMessage.asReadonly();

  constructor() {
    this.document.addEventListener('visibilitychange', () => {
      if (this.document.visibilityState === 'hidden') {
        void this.flush();
      }
    });
  }

  show(messageKey: string, messageParams: Record<string, string> = {}): void {
    const message = { id: this.nextId++, messageKey, messageParams };
    this.info.set(message);
    setTimeout(() => this.dismissInfo(message.id), INFO_DURATION_MS);
  }

  scheduleWithUndo(request: UndoRequest): void {
    void this.flush();
    const message = { id: this.nextId++, messageKey: request.messageKey, messageParams: request.messageParams };
    this.pending = { request, message, timer: null, remainingMs: UNDO_WINDOW_MS, startedAt: 0 };
    this.undoMessage.set(message);
    this.resume();
  }

  pause(): void {
    const pending = this.pending;
    if (pending?.timer) {
      clearTimeout(pending.timer);
      pending.timer = null;
      pending.remainingMs -= Date.now() - pending.startedAt;
    }
  }

  resume(): void {
    const pending = this.pending;
    if (pending && !pending.timer) {
      pending.startedAt = Date.now();
      pending.timer = setTimeout(() => void this.flush(), Math.max(pending.remainingMs, 0));
    }
  }

  undo(): void {
    const pending = this.take();
    if (pending) {
      pending.request.undo();
      pending.request.afterUndo?.();
    }
  }

  discard(): void {
    this.take();
    this.info.set(null);
  }

  async flush(): Promise<void> {
    const pending = this.take();
    if (!pending) {
      return;
    }
    try {
      await pending.request.commit();
    } catch {
      pending.request.undo();
      this.show('toast.deleteFailed');
    }
  }

  private take(): PendingAction | null {
    const pending = this.pending;
    if (pending?.timer) {
      clearTimeout(pending.timer);
    }
    this.pending = null;
    this.undoMessage.set(null);
    return pending;
  }

  private dismissInfo(id: number): void {
    if (this.info()?.id === id) {
      this.info.set(null);
    }
  }
}
