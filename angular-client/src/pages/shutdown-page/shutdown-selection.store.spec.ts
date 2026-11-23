import { TestBed } from '@angular/core/testing';
import { rovingIndex, ShutdownSelectionStore } from './shutdown-selection.store';

describe('ShutdownSelectionStore', () => {
  let store: ShutdownSelectionStore;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ShutdownSelectionStore] });
    store = TestBed.inject(ShutdownSelectionStore);
  });

  it('starts with nothing selected', () => {
    expect(store.selectedId()).toBeNull();
    expect(store.previewId()).toBeNull();
    expect(store.activeId()).toBeNull();
  });

  it('highlights the hovered node over the selected one, and falls back when hover ends', () => {
    store.select('tsms');
    expect(store.activeId()).toBe('tsms');
    store.preview('hvd');
    expect(store.activeId()).toBe('hvd');
    expect(store.selectedId()).toBe('tsms');
    store.preview(null);
    expect(store.activeId()).toBe('tsms');
  });

  it('clears the selection', () => {
    store.select('tsms');
    store.select(null);
    expect(store.activeId()).toBeNull();
  });
});

describe('rovingIndex', () => {
  it.each([
    ['ArrowRight', 3, 4],
    ['ArrowDown', 3, 4],
    ['ArrowLeft', 3, 2],
    ['ArrowUp', 3, 2],
    ['Home', 3, 0],
    ['End', 3, 18],
    ['ArrowRight', 18, 18],
    ['ArrowLeft', 0, 0]
  ])('%s from %i → %i', (key, from, to) => expect(rovingIndex(key, from, 19)).toBe(to));

  it('ignores other keys', () => {
    expect(rovingIndex('a', 3, 19)).toBeUndefined();
    expect(rovingIndex('Enter', 3, 19)).toBeUndefined();
  });
});
