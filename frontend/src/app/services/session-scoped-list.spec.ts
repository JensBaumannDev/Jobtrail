import { signal } from '@angular/core';
import { SessionScopedList } from './session-scoped-list';

interface Item {
  id: number;
  name: string;
}

function setup() {
  const version = signal(1);
  const list = new SessionScopedList<Item>(version);
  return { version, list };
}

describe('SessionScopedList', () => {
  it('ignores data loaded for an older session', () => {
    const { version, list } = setup();
    version.set(2);
    list.setAll([{ id: 1, name: 'old' }], 1);
    expect(list.isLoaded()).toBe(false);
    expect(list.visible()).toEqual([]);
  });

  it('hides data as soon as the session changes', () => {
    const { version, list } = setup();
    list.setAll([{ id: 1, name: 'a' }], 1);
    version.set(2);
    expect(list.visible()).toEqual([]);
    expect(list.find(1)).toBeUndefined();
  });

  it('hides pending items and shows them again', () => {
    const { list } = setup();
    list.setAll([{ id: 1, name: 'a' }, { id: 2, name: 'b' }], 1);
    list.setPending(1, true);
    expect(list.visible().map((item) => item.id)).toEqual([2]);
    list.setPending(1, false);
    expect(list.visible().map((item) => item.id)).toEqual([1, 2]);
  });

  it('does not apply changes from an older session', () => {
    const { version, list } = setup();
    list.setAll([{ id: 1, name: 'a' }], 1);
    version.set(2);
    list.setAll([], 2);
    list.prepend({ id: 9, name: 'late' }, 1);
    expect(list.visible()).toEqual([]);
  });
});
