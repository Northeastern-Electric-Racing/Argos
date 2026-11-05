import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationLogService } from 'src/services/notification-log.service';
import NotificationLogPageComponent from './notification-log-page.component';

describe('NotificationLogPageComponent', () => {
  let fixture: ComponentFixture<NotificationLogPageComponent>;
  let log: NotificationLogService;
  const el = () => fixture.nativeElement as HTMLElement;
  const dismiss = (id: string) => el().querySelector<HTMLButtonElement>(`button[aria-label="Dismiss notification ${id}"]`);
  const render = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [NotificationLogPageComponent] }).compileComponents();
    log = TestBed.inject(NotificationLogService);
    for (const id of ['cold', 'warm', 'hot'])
      log.addNotification({ id, topic: 'BMS/Pack/Voltage', values: [1, 2], time: new Date(0).toISOString() });
    fixture = TestBed.createComponent(NotificationLogPageComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
  });

  it('lists the newest entry first, with its count', () => {
    const rules = Array.from(el().querySelectorAll('tbody tr')).map((r) => r.querySelector('td')?.textContent?.trim());
    expect(rules).toEqual(['hot', 'warm', 'cold']);
    expect(el().textContent).toContain('3 entries');
  });

  it('moves focus to the next row after a dismiss, and to the row above after the last', async () => {
    dismiss('warm')!.focus();
    dismiss('warm')!.click();
    await render();
    expect(dismiss('warm')).toBeNull();
    expect(document.activeElement).toBe(dismiss('cold'));

    dismiss('cold')!.click();
    await render();
    expect(document.activeElement).toBe(dismiss('hot'));
  });

  it('shows the empty state after Clear All, with focus on it rather than the body', async () => {
    const clear = el().querySelector<HTMLButtonElement>('button[aria-label="Clear all notifications"]')!;
    clear.focus();
    clear.click();
    await render();

    expect(el().querySelector('table')).toBeNull();
    expect(el().textContent).toContain('No notifications have been triggered yet');
    expect(document.activeElement).not.toBe(document.body);
    expect(el().contains(document.activeElement)).toBe(true);
  });
});
