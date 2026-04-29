import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { GeneralButtonsComponent, MAX_RANGE_MINUTES, RangePreset } from './general-buttons.component';

describe('GeneralButtonsComponent — custom range validation', () => {
  let fixture: ComponentFixture<GeneralButtonsComponent>;
  let component: GeneralButtonsComponent;
  let toastSpy: jasmine.SpyObj<MessageService>;
  let onSelectPresetSpy: jasmine.Spy;
  let onApplyCustomLastXSpy: jasmine.Spy;
  let onApplyCustomDateRangeSpy: jasmine.Spy;
  let onRunSelectedSpy: jasmine.Spy;
  let onClearDataTypeSpy: jasmine.Spy;
  let onSetRealTimeSpy: jasmine.Spy;

  const presets: RangePreset[] = [
    { label: '1 minute', minutes: 1 },
    { label: '5 minutes', minutes: 5 }
  ];

  beforeEach(async () => {
    toastSpy = jasmine.createSpyObj<MessageService>('MessageService', ['add']);
    onSelectPresetSpy = jasmine.createSpy('onSelectPreset');
    onApplyCustomLastXSpy = jasmine.createSpy('onApplyCustomLastX');
    onApplyCustomDateRangeSpy = jasmine.createSpy('onApplyCustomDateRange');
    onRunSelectedSpy = jasmine.createSpy('onRunSelected');
    onClearDataTypeSpy = jasmine.createSpy('onClearDataType');
    onSetRealTimeSpy = jasmine.createSpy('onSetRealTime');

    await TestBed.configureTestingModule({
      imports: [GeneralButtonsComponent],
      providers: [{ provide: MessageService, useValue: toastSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(GeneralButtonsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('presets', presets);
    fixture.componentRef.setInput('onSelectPreset', onSelectPresetSpy);
    fixture.componentRef.setInput('onApplyCustomLastX', onApplyCustomLastXSpy);
    fixture.componentRef.setInput('onApplyCustomDateRange', onApplyCustomDateRangeSpy);
    fixture.componentRef.setInput('onRunSelected', onRunSelectedSpy);
    fixture.componentRef.setInput('onClearDataType', onClearDataTypeSpy);
    fixture.componentRef.setInput('onSetRealTime', onSetRealTimeSpy);
    fixture.detectChanges();
  });

  describe('applyCustomLastX', () => {
    it('rejects 0 hours / 0 minutes with a toast and no callback', () => {
      component.customHours.set(0);
      component.customMinutes.set(0);
      component.applyCustomLastX();
      expect(onApplyCustomLastXSpy).not.toHaveBeenCalled();
      expect(toastSpy.add).toHaveBeenCalledOnceWith(
        jasmine.objectContaining({ severity: 'warn', summary: 'Invalid Range' })
      );
    });

    it('rejects total exceeding MAX_RANGE_MINUTES with a toast', () => {
      component.customHours.set(MAX_RANGE_MINUTES / 60 + 1); // 8 days in hours
      component.customMinutes.set(0);
      component.applyCustomLastX();
      expect(onApplyCustomLastXSpy).not.toHaveBeenCalled();
      expect(toastSpy.add).toHaveBeenCalledOnceWith(jasmine.objectContaining({ summary: 'Range Too Large' }));
    });

    it('emits the total minutes when valid', () => {
      component.customHours.set(2);
      component.customMinutes.set(15);
      component.applyCustomLastX();
      expect(onApplyCustomLastXSpy).toHaveBeenCalledOnceWith(135);
      expect(toastSpy.add).not.toHaveBeenCalled();
    });

    it('treats null inputs as zero', () => {
      component.customHours.set(null);
      component.customMinutes.set(null);
      component.applyCustomLastX();
      expect(onApplyCustomLastXSpy).not.toHaveBeenCalled();
      expect(toastSpy.add).toHaveBeenCalledOnceWith(jasmine.objectContaining({ summary: 'Invalid Range' }));
    });
  });

  describe('applyCustomDateRange', () => {
    const now = Date.now();

    it('rejects from >= to with a toast', () => {
      component.customFromDate.set(new Date(now - 60 * 1000));
      component.customToDate.set(new Date(now - 60 * 1000));
      component.applyCustomDateRange();
      expect(onApplyCustomDateRangeSpy).not.toHaveBeenCalled();
      expect(toastSpy.add).toHaveBeenCalledOnceWith(jasmine.objectContaining({ summary: 'Invalid Range' }));
    });

    it('rejects an end time more than 1 minute in the future', () => {
      component.customFromDate.set(new Date(now - 60 * 60 * 1000));
      component.customToDate.set(new Date(now + 5 * 60 * 1000));
      component.applyCustomDateRange();
      expect(onApplyCustomDateRangeSpy).not.toHaveBeenCalled();
      expect(toastSpy.add).toHaveBeenCalledOnceWith(jasmine.objectContaining({ summary: 'Invalid Range' }));
    });

    it('rejects a span exceeding MAX_RANGE_MINUTES', () => {
      const oneMinuteMs = 60 * 1000;
      component.customFromDate.set(new Date(now - (MAX_RANGE_MINUTES + 5) * oneMinuteMs));
      component.customToDate.set(new Date(now - oneMinuteMs));
      component.applyCustomDateRange();
      expect(onApplyCustomDateRangeSpy).not.toHaveBeenCalled();
      expect(toastSpy.add).toHaveBeenCalledOnceWith(jasmine.objectContaining({ summary: 'Range Too Large' }));
    });

    it('emits start and end ms when valid', () => {
      const start = new Date(now - 30 * 60 * 1000);
      const end = new Date(now - 60 * 1000);
      component.customFromDate.set(start);
      component.customToDate.set(end);
      component.applyCustomDateRange();
      expect(onApplyCustomDateRangeSpy).toHaveBeenCalledOnceWith(start.getTime(), end.getTime());
      expect(toastSpy.add).not.toHaveBeenCalled();
    });
  });

  describe('onCustomPopoverShow', () => {
    it('seeds Last X mode + hours/minutes when activeLastXMinutes is set', () => {
      fixture.componentRef.setInput('activeLastXMinutes', 135);
      fixture.detectChanges();
      component.onCustomPopoverShow();
      expect(component.customMode()).toBe('last-x');
      expect(component.customHours()).toBe(2);
      expect(component.customMinutes()).toBe(15);
    });

    it('seeds Date Range mode + From/To when activeDateRange is set', () => {
      const range = { startMs: 1_700_000_000_000, endMs: 1_700_000_900_000 };
      fixture.componentRef.setInput('activeDateRange', range);
      fixture.detectChanges();
      component.onCustomPopoverShow();
      expect(component.customMode()).toBe('date-range');
      expect(component.customFromDate().getTime()).toBe(range.startMs);
      expect(component.customToDate().getTime()).toBe(range.endMs);
    });

    it('resets to fresh defaults when nothing active', () => {
      const before = Date.now();
      component.onCustomPopoverShow();
      const after = Date.now();
      expect(component.customHours()).toBe(0);
      expect(component.customMinutes()).toBe(30);
      // From defaults to ~now − 30m, To to ~now (allow a small jitter for execution time)
      const toMs = component.customToDate().getTime();
      const fromMs = component.customFromDate().getTime();
      expect(toMs).toBeGreaterThanOrEqual(before);
      expect(toMs).toBeLessThanOrEqual(after + 50);
      expect(toMs - fromMs).toBe(30 * 60 * 1000);
      // maxDate also refreshed
      expect(component.maxDate().getTime()).toBeGreaterThanOrEqual(before);
    });
  });
});
