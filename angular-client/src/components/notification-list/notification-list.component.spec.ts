import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { NotificationLogService } from 'src/services/notification-log.service';
import { NotificationListComponent } from './notification-list.component';

const entry = (id: number, read: boolean) => ({
  id,
  read,
  notification: {
    id: `rule-${id}`,
    topic: 'BMS/Pack/Voltage',
    time: new Date(Date.UTC(2026, 0, 15, 12, 0, id)).toISOString(),
    values: [401, 402]
  }
});

describe('NotificationListComponent', () => {
  const setup = async (entries: ReturnType<typeof entry>[], variant: 'popover' | 'stream' = 'popover') => {
    const service = {
      notifications: signal(entries),
      recentNotifications: signal(entries.slice(0, 1)),
      clearAll: vi.fn(),
      dismissEntry: vi.fn(),
      markAllRead: vi.fn()
    };
    await TestBed.configureTestingModule({
      imports: [NotificationListComponent],
      providers: [provideRouter([]), { provide: NotificationLogService, useValue: service }]
    }).compileComponents();
    const fixture = TestBed.createComponent(NotificationListComponent);
    fixture.componentRef.setInput('variant', variant);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, el, service };
  };

  it('shows an empty state with a hint when there are no notifications, and no Clear button', async () => {
    const { el } = await setup([]);
    expect(el.textContent).toContain('No notifications yet');
    expect(el.textContent).toContain('Triggered rules will appear here');
    expect(el.querySelector('[aria-label="Clear all notifications"]')).toBeNull();
    expect(el.querySelector('[role="list"]')).toBeNull();
  });

  it('lists the recent entries in the popover, marks unread ones, and counts them all', async () => {
    const { el } = await setup([entry(1, false), entry(2, true)]);
    const items = el.querySelectorAll('[role="list"] > li');
    expect(items.length).toBe(1);
    expect((items[0] as HTMLElement).dataset['unread']).toBe('true');
    expect(items[0].querySelector('time')?.textContent).toMatch(/^\d\d:\d\d:\d\d$/);
    expect(el.querySelector('header')?.textContent).toContain('2');
  });

  it('lists every entry in the stream, without the View all footer', async () => {
    const { el } = await setup([entry(1, false), entry(2, true)], 'stream');
    expect(el.querySelectorAll('[role="list"] > li').length).toBe(2);
    expect(el.querySelector('[aria-label="View all notifications"]')).toBeNull();
  });

  it('dismisses one entry, clears all, and opens the log from View all', async () => {
    const { el, service } = await setup([entry(1, false)]);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    el.querySelector<HTMLButtonElement>('[aria-label="Dismiss notification rule-1"]')!.click();
    expect(service.dismissEntry).toHaveBeenCalledWith(1);
    el.querySelector<HTMLButtonElement>('[aria-label="Clear all notifications"]')!.click();
    expect(service.clearAll).toHaveBeenCalled();
    el.querySelector<HTMLButtonElement>('[aria-label="View all notifications"]')!.click();
    expect(service.markAllRead).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalled();
  });

  describe('focus after dismiss and Clear, as on the log page', () => {
    const setupLive = async (variant: 'popover' | 'stream') => {
      await TestBed.configureTestingModule({
        imports: [NotificationListComponent],
        providers: [provideRouter([])]
      }).compileComponents();
      const log = TestBed.inject(NotificationLogService);
      for (const id of ['cold', 'warm', 'hot'])
        log.addNotification({ id, topic: 'BMS/Pack/Voltage', values: [1, 2], time: new Date(0).toISOString() });
      const fixture = TestBed.createComponent(NotificationListComponent);
      fixture.componentRef.setInput('variant', variant);
      fixture.autoDetectChanges();
      await fixture.whenStable();
      const el = fixture.nativeElement as HTMLElement;
      const dismiss = (id: string) => el.querySelector<HTMLButtonElement>(`[aria-label="Dismiss notification ${id}"]`);
      const press = async (button: HTMLButtonElement) => {
        button.focus();
        button.click();
        await fixture.whenStable();
      };
      return { el, dismiss, press };
    };

    for (const variant of ['popover', 'stream'] as const) {
      it(`moves focus to the next entry after a dismiss, then the one above after the last (${variant})`, async () => {
        const { dismiss, press } = await setupLive(variant);
        await press(dismiss('warm')!);
        expect(dismiss('warm')).toBeNull();
        expect(document.activeElement).toBe(dismiss('cold'));
        await press(dismiss('cold')!);
        expect(document.activeElement).toBe(dismiss('hot'));
      });

      it(`moves focus to the empty state after the last dismiss and after Clear (${variant})`, async () => {
        const first = await setupLive(variant);
        for (const id of ['hot', 'warm', 'cold']) await first.press(first.dismiss(id)!);
        expect(first.el.textContent).toContain('No notifications yet');
        expect(first.el.contains(document.activeElement)).toBe(true);
        TestBed.resetTestingModule();

        const { el, press } = await setupLive(variant);
        await press(el.querySelector<HTMLButtonElement>('[aria-label="Clear all notifications"]')!);
        expect(el.textContent).toContain('No notifications yet');
        expect(el.contains(document.activeElement)).toBe(true);
      });
    }
  });
});
