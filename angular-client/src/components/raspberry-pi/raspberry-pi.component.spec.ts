import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import Storage from 'src/services/storage.service';
import { topics } from 'src/utils/topic.utils';
import { DataValue } from 'src/utils/socket.utils';
import RasberryPiComponent from './raspberry-pi.component';
import RaspberryPiDesktopComponent from './raspberry-pi-desktop-content/raspberry-pi-desktop.component';
import RaspberryPiMobileComponent from './raspberry-pi-mobile-content/raspberry-pi-mobile.component';
import { By } from '@angular/platform-browser';
import { fakeViewport } from 'src/ui/layout/viewport.testing';

describe('RasberryPiComponent', () => {
  let fixture: ComponentFixture<RasberryPiComponent>;
  const streams = new Map<string, Subject<DataValue>>();
  const stream = (topic: string) => {
    if (!streams.has(topic)) streams.set(topic, new Subject<DataValue>());
    return streams.get(topic)!;
  };
  const emit = (topic: string, value: string) => stream(topic).next({ values: [value], time: '0', unit: '' } as DataValue);
  // Readings arrive outside change detection (the socket); the app re-renders on its next pass.
  const render = () => {
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges();
  };

  const setup = async (width: number) => {
    streams.clear();
    await TestBed.configureTestingModule({
      imports: [RasberryPiComponent],
      providers: [fakeViewport(width).provider, { provide: Storage, useValue: { get: (topic: string) => stream(topic) } }]
    }).compileComponents();
    fixture = TestBed.createComponent(RasberryPiComponent);
    fixture.detectChanges();
  };

  it('shows the CPU temperature on wide screens as well as on phones', async () => {
    await setup(1440);
    emit(topics.cpuTemp(), '42');
    render();

    const desktop = fixture.debugElement.query(By.directive(RaspberryPiDesktopComponent));
    expect(desktop).not.toBeNull();
    expect((desktop.componentInstance as RaspberryPiDesktopComponent).cpuTemp()).toBe(42);
    expect((desktop.nativeElement as HTMLElement).textContent).toContain('42°');
  });

  it('passes every reading to the phone layout', async () => {
    await setup(390);
    emit(topics.cpuTemp(), '41');
    emit(topics.cpuUsage(), '12');
    emit(topics.mcs(), '7');
    render();

    const mobile = fixture.debugElement.query(By.directive(RaspberryPiMobileComponent));
    const pi = mobile.componentInstance as RaspberryPiMobileComponent;
    expect([pi.cpuTemp(), pi.cpuUsage(), pi.mcs()]).toEqual([41, 12, 7]);
  });
});
