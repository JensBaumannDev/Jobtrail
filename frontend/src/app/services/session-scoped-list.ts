import { Signal, computed, signal } from '@angular/core';

export interface Identifiable {
  id: number;
}

export class SessionScopedList<T extends Identifiable> {
  private readonly items = signal<T[]>([]);
  private readonly loadedVersion = signal<number | null>(null);
  private readonly pendingIds = signal<ReadonlySet<number>>(new Set());

  readonly isLoaded = computed(() => this.loadedVersion() === this.version());
  readonly visible = computed(() =>
    this.isLoaded() ? this.items().filter((item) => !this.pendingIds().has(item.id)) : [],
  );

  constructor(private readonly version: Signal<number>) {}

  find(id: number): T | undefined {
    return this.isLoaded() ? this.items().find((item) => item.id === id) : undefined;
  }

  setAll(items: T[], version: number): void {
    if (version === this.version()) {
      this.items.set(items);
      this.loadedVersion.set(version);
    }
  }

  prepend(item: T, version: number): void {
    this.change(version, (items) => [item, ...items.filter((entry) => entry.id !== item.id)]);
  }

  replace(item: T, version: number): void {
    this.change(version, (items) => items.map((entry) => (entry.id === item.id ? item : entry)));
  }

  remove(id: number, version: number): void {
    this.change(version, (items) => items.filter((entry) => entry.id !== id));
    this.setPending(id, false);
  }

  setPending(id: number, pending: boolean): void {
    this.pendingIds.update((ids) => {
      const next = new Set(ids);
      if (pending) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  reset(): void {
    this.items.set([]);
    this.loadedVersion.set(null);
    this.pendingIds.set(new Set());
  }

  private change(version: number, update: (items: T[]) => T[]): void {
    if (version === this.version() && this.isLoaded()) {
      this.items.update(update);
    }
  }
}
