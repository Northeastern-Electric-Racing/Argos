import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NotificationLogService } from 'src/services/notification-log.service';
import NotificationLogPageComponent from './notification-log-page.component';

describe('NotificationLogPageComponent: phone layout', () => {
  const render = (phone: boolean) => {
    TestBed.configureTestingModule({
      imports: [NotificationLogPageComponent],
      providers: [
        {
          provide: BreakpointObserver,
          useValue: { observe: () => of({ matches: phone, breakpoints: {} } as BreakpointState) }
        }
      ]
    });
    TestBed.inject(NotificationLogService).addNotification({
      id: 'pack-overtemp',
      topic: 'BMS/Status/Temp_Average',
      values: [61.5],
      time: new Date().toISOString()
    });
    const fixture = TestBed.createComponent(NotificationLogPageComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  // At 390px the Values column must stay in view next to Rule ID and Topic
  it('uses the small table density and lets long topics break after slashes on phones', () => {
    const el = render(true);

    expect(el.querySelector('.p-datatable-sm')).toBeTruthy();
    const topic = el.querySelector<HTMLElement>('tbody td.col-topic')!;
    expect(topic.textContent!.trim()).toBe('BMS/Status/Temp_Average');
    expect(topic.querySelectorAll('wbr').length).toBe(3);
  });

  it('keeps the default density on desktop', () => {
    const el = render(false);

    expect(el.querySelector('.p-datatable-sm')).toBeNull();
  });
});
