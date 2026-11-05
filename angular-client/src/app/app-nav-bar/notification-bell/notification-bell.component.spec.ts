import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NotificationLogService } from 'src/services/notification-log.service';
import { NotificationBellComponent } from './notification-bell.component';

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

describe('NotificationBellComponent', () => {
  const setup = async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(NotificationBellComponent);
    document.body.appendChild(fixture.nativeElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const log = TestBed.inject(NotificationLogService);
    const notify = (n: number) => {
      for (let i = 0; i < n; i++)
        log.addNotification({ id: `rule-${i}`, topic: 'BMS/Pack/Voltage', values: [1], time: '0' });
    };
    const bell = () => fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    const badge = () => fixture.nativeElement.querySelector('[data-badge]') as HTMLElement | null;
    return { fixture, log, notify, bell, badge };
  };

  afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = '')));

  it('hides the badge while nothing is unread', async () => {
    const { bell, badge } = await setup();
    expect(badge()).toBeNull();
    expect(bell().getAttribute('aria-label')).toBe('Notifications, 0 unread');
  });

  it('shows the unread count, and names it on the bell ("N unread")', async () => {
    const { fixture, notify, bell, badge } = await setup();
    notify(3);
    await fixture.whenStable();
    expect(badge()?.textContent?.trim()).toBe('3');
    expect(badge()?.getAttribute('aria-hidden')).toBe('true');
    expect(bell().getAttribute('aria-label')).toBe('Notifications, 3 unread');
  });

  it('opens the notifications dialog from the bell and marks every entry read', async () => {
    const { fixture, notify, bell, badge, log } = await setup();
    notify(2);
    await fixture.whenStable();
    expect(bell().getAttribute('aria-haspopup')).toBe('dialog');
    bell().click();
    await fixture.whenStable();
    await settle();
    expect(document.querySelector('[role="dialog"][aria-label="Notifications"]')).not.toBeNull();
    expect(bell().getAttribute('aria-expanded')).toBe('true');
    expect(log.unreadCount()).toBe(0);
    expect(badge()).toBeNull();
  });

  it('closes on Escape and returns focus to the bell', async () => {
    const { fixture, bell } = await setup();
    bell().focus();
    bell().click();
    await fixture.whenStable();
    await settle();
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
    await fixture.whenStable();
    await settle();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(bell());
  });
});
