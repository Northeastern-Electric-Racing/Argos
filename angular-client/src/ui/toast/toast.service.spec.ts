import { LiveAnnouncer } from '@angular/cdk/a11y';
import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;
  let announce: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    announce = vi.fn();
    TestBed.configureTestingModule({ providers: [{ provide: LiveAnnouncer, useValue: { announce } }] });
    service = TestBed.inject(ToastService);
  });

  afterEach(() => vi.useRealTimers());

  it('shows a toast with info severity by default and hides it after 3 s', () => {
    service.add({ summary: 'Saved' });
    expect(service.toasts()).toEqual([expect.objectContaining({ summary: 'Saved', severity: 'info' })]);
    vi.advanceTimersByTime(2999);
    expect(service.toasts().length).toBe(1);
    vi.advanceTimersByTime(1);
    expect(service.toasts()).toEqual([]);
  });

  it('honours a custom life, and keeps sticky toasts until removed', () => {
    service.add({ summary: 'Quick', life: 500 });
    service.add({ summary: 'Sticky', sticky: true });
    vi.advanceTimersByTime(10_000);
    expect(service.toasts().map((t) => t.summary)).toEqual(['Sticky']);
    service.remove(service.toasts()[0].id);
    expect(service.toasts()).toEqual([]);
  });

  it('cancels the timer of a toast closed early, so it cannot remove a later one', () => {
    service.add({ summary: 'First' });
    service.remove(service.toasts()[0].id);
    service.add({ summary: 'Second', life: 5000 });
    vi.advanceTimersByTime(3000);
    expect(service.toasts().map((t) => t.summary)).toEqual(['Second']);
  });

  it('clear() drops every toast and its timer', () => {
    service.add({ summary: 'A' });
    service.add({ summary: 'B' });
    service.clear();
    expect(service.toasts()).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('announces summary and detail, assertively for errors only', () => {
    service.add({ severity: 'error', summary: 'Failed', detail: 'Network error' });
    service.add({ severity: 'success', summary: 'Done' });
    expect(announce).toHaveBeenNthCalledWith(1, 'Failed: Network error', 'assertive');
    expect(announce).toHaveBeenNthCalledWith(2, 'Done', 'polite');
  });
});
