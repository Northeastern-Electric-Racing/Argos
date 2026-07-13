import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import Storage from 'src/services/storage.service';
import { DataValue } from 'src/utils/socket.utils';
import { EFUSE_TOPICS } from '../../efuses-page.topics';
import LvBatteryCardComponent, { LV_FAULT_COLOR, LV_NORMAL_COLOR } from './lv-battery-card.component';

const push = (storage: Storage, key: string, value: string): void => {
  storage.addValue(key, { values: [value], time: '0', unit: '' } as DataValue);
};

describe('LvBatteryCardComponent', () => {
  let fixture: ComponentFixture<LvBatteryCardComponent>;
  let component: LvBatteryCardComponent;
  let storage: Storage;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LvBatteryCardComponent],
      providers: [provideExperimentalZonelessChangeDetection(), Storage]
    }).compileComponents();

    storage = TestBed.inject(Storage);
    fixture = TestBed.createComponent(LvBatteryCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // ngOnInit → storage subscriptions
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the LV battery voltage published to VCU/LV/voltage', () => {
    // Storage delivers synchronously on push, so component state updates without a
    // further detectChanges; a per-push template re-render raises a spurious NG0100
    // under zoneless. The real DOM render is covered by the Playwright visual test.
    push(storage, EFUSE_TOPICS.VCU.LV.Voltage, '24.53');

    expect(component.voltage).toBeCloseTo(24.53);
  });

  it('turns the warning color when the LV low-voltage fault activates and clears when it resolves', () => {
    expect(component.getStatusColor()).toBe(LV_NORMAL_COLOR);

    push(storage, EFUSE_TOPICS.VCU.LV.LowVoltageFault, '1');
    expect(component.isFaulted).toBeTrue();
    expect(component.getStatusColor()).toBe(LV_FAULT_COLOR);

    push(storage, EFUSE_TOPICS.VCU.LV.LowVoltageFault, '0');
    expect(component.isFaulted).toBeFalse();
    expect(component.getStatusColor()).toBe(LV_NORMAL_COLOR);
  });

  it('drives the warning from the fault flag, not a hardcoded voltage threshold', () => {
    push(storage, EFUSE_TOPICS.VCU.LV.Voltage, '1.0'); // implausibly low, but no fault flag set

    expect(component.getStatusColor()).toBe(LV_NORMAL_COLOR);
  });
});
