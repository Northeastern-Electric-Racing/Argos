import { TestBed } from '@angular/core/testing';
import { ShutdownSelectionStore } from './shutdown-selection.store';

describe('ShutdownSelectionStore', () => {
  let store: ShutdownSelectionStore;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ShutdownSelectionStore] });
    store = TestBed.inject(ShutdownSelectionStore);
  });

  it('starts with nothing selected or previewed', () => {
    expect(store.selectedId()).toBeNull();
    expect(store.previewId()).toBeNull();
    expect(store.activeId()).toBeNull();
  });

  it('makes the previewed loop node active over the pinned one, and falls back when the preview ends', () => {
    store.select('tsms');
    expect(store.activeId()).toBe('tsms');
    store.preview('hvd');
    expect(store.activeId()).toBe('hvd');
    expect(store.selectedId()).toBe('tsms');
    store.preview(null);
    expect(store.activeId()).toBe('tsms');
  });

  it('clears the preview when it pins, so the chosen loop node shows at once', () => {
    store.preview('hvd');
    store.select('bots');
    expect(store.previewId()).toBeNull();
    expect(store.activeId()).toBe('bots');
  });

  it('clears the preview when it unpins too', () => {
    store.select('bots');
    store.preview('hvd');
    store.select(null);
    expect(store.selectedId()).toBeNull();
    expect(store.previewId()).toBeNull();
    expect(store.activeId()).toBeNull();
  });

  it('is idempotent', () => {
    store.select('bots');
    store.select('bots');
    expect(store.selectedId()).toBe('bots');
    expect(store.previewId()).toBeNull();
  });
});
