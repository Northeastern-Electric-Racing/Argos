import { ToastService } from 'src/ui/toast/toast.service';
import type { Mock } from 'vitest';
import { TabsHarness } from '@angular/aria/tabs/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { numberInputClass } from 'src/ui/recipes/number-input';
import { GeneralButtonsComponent, MAX_RANGE_MINUTES, RangePreset } from './general-buttons.component';

describe('GeneralButtonsComponent — custom range validation', () => {
  let fixture: ComponentFixture<GeneralButtonsComponent>;
  let component: GeneralButtonsComponent;
  let toastSpy: { add: Mock<ToastService['add']> };
  let onSelectPresetSpy: Mock;
  let onApplyCustomLastXSpy: Mock;
  let onApplyCustomDateRangeSpy: Mock;
  let onRunSelectedSpy: Mock;
  let onClearDataTypeSpy: Mock;
  let onSetRealTimeSpy: Mock;

  const presets: RangePreset[] = [
    { label: '1 minute', minutes: 1 },
    { label: '5 minutes', minutes: 5 }
  ];

  beforeEach(async () => {
    // The run selector inside fetches the run list on init. Under Karma that request was still in
    // flight when these specs finished; Node's fetch rejects at once, and its error toast would land
    // in these assertions. Keep it pending, as it effectively was in the browser.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {}))
    );
    toastSpy = { add: vi.fn().mockName('ToastService.add') };
    onSelectPresetSpy = vi.fn().mockName('onSelectPreset');
    onApplyCustomLastXSpy = vi.fn().mockName('onApplyCustomLastX');
    onApplyCustomDateRangeSpy = vi.fn().mockName('onApplyCustomDateRange');
    onRunSelectedSpy = vi.fn().mockName('onRunSelected');
    onClearDataTypeSpy = vi.fn().mockName('onClearDataType');
    onSetRealTimeSpy = vi.fn().mockName('onSetRealTime');

    await TestBed.configureTestingModule({
      imports: [GeneralButtonsComponent],
      providers: [{ provide: ToastService, useValue: toastSpy }]
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

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('applyCustomLastX', () => {
    it('rejects 0 hours / 0 minutes with a toast and no callback', () => {
      component.customHours.set(0);
      component.customMinutes.set(0);
      component.applyCustomLastX();
      expect(onApplyCustomLastXSpy).not.toHaveBeenCalled();
      expect(toastSpy.add).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ severity: 'warn', summary: 'Invalid Range' })
      );
    });

    it('rejects total exceeding MAX_RANGE_MINUTES with a toast', () => {
      component.customHours.set(MAX_RANGE_MINUTES / 60 + 1); // 8 days in hours
      component.customMinutes.set(0);
      component.applyCustomLastX();
      expect(onApplyCustomLastXSpy).not.toHaveBeenCalled();
      expect(toastSpy.add).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ summary: 'Range Too Large' }));
    });

    it('emits the total minutes when valid', () => {
      component.customHours.set(2);
      component.customMinutes.set(15);
      component.applyCustomLastX();
      expect(onApplyCustomLastXSpy).toHaveBeenCalledExactlyOnceWith(135);
      expect(toastSpy.add).not.toHaveBeenCalled();
    });

    it('treats null inputs as zero', () => {
      component.customHours.set(null);
      component.customMinutes.set(null);
      component.applyCustomLastX();
      expect(onApplyCustomLastXSpy).not.toHaveBeenCalled();
      expect(toastSpy.add).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ summary: 'Invalid Range' }));
    });
  });

  describe('applyCustomDateRange', () => {
    const now = Date.now();

    it('rejects from >= to with a toast', () => {
      component.customFromDate.set(new Date(now - 60 * 1000));
      component.customToDate.set(new Date(now - 60 * 1000));
      component.applyCustomDateRange();
      expect(onApplyCustomDateRangeSpy).not.toHaveBeenCalled();
      expect(toastSpy.add).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ summary: 'Invalid Range' }));
    });

    it('rejects an end time more than 1 minute in the future', () => {
      component.customFromDate.set(new Date(now - 60 * 60 * 1000));
      component.customToDate.set(new Date(now + 5 * 60 * 1000));
      component.applyCustomDateRange();
      expect(onApplyCustomDateRangeSpy).not.toHaveBeenCalled();
      expect(toastSpy.add).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ summary: 'Invalid Range' }));
    });

    it('rejects a span exceeding MAX_RANGE_MINUTES', () => {
      const oneMinuteMs = 60 * 1000;
      component.customFromDate.set(new Date(now - (MAX_RANGE_MINUTES + 5) * oneMinuteMs));
      component.customToDate.set(new Date(now - oneMinuteMs));
      component.applyCustomDateRange();
      expect(onApplyCustomDateRangeSpy).not.toHaveBeenCalled();
      expect(toastSpy.add).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ summary: 'Range Too Large' }));
    });

    it('emits start and end ms when valid', () => {
      const start = new Date(now - 30 * 60 * 1000);
      const end = new Date(now - 60 * 1000);
      component.customFromDate.set(start);
      component.customToDate.set(end);
      component.applyCustomDateRange();
      expect(onApplyCustomDateRangeSpy).toHaveBeenCalledExactlyOnceWith(start.getTime(), end.getTime());
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

  describe('custom range tabs', () => {
    const openPopover = async () => {
      const trigger = [...fixture.nativeElement.querySelectorAll('button')].find(
        (b: HTMLButtonElement) => b.textContent?.trim() === 'Custom'
      ) as HTMLButtonElement;
      trigger.click();
      fixture.detectChanges();
      await fixture.whenStable();
      return trigger;
    };
    /** The custom range popover is in an overlay, so its tabs are found from the document root. */
    const tabs = () => TestbedHarnessEnvironment.documentRootLoader(fixture).getHarness(TabsHarness);

    it('marks the Custom trigger as a dialog popup and reports when it is open', async () => {
      const trigger = await openPopover();
      expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
    });

    it('switches between Last X and Date Range through the Aria tabs', async () => {
      await openPopover();
      const harness = await tabs();
      expect(await Promise.all((await harness.getTabs()).map((t) => t.getTitle()))).toEqual(['Last X', 'Date Range']);
      expect(await (await harness.getSelectedTab())?.getTitle()).toBe('Last X');
      expect(document.getElementById('custom-hours')).not.toBeNull();

      await harness.selectTab({ title: 'Date Range' });
      await fixture.whenStable();

      expect(component.customMode()).toBe('date-range');
      expect(await (await harness.getSelectedTab())?.getTitle()).toBe('Date Range');
      expect(document.getElementById('custom-from')).not.toBeNull();
    });

    it('keeps one panel live: the unselected one is inert, so inert:hidden takes it out of the layout', async () => {
      await openPopover();
      await (await tabs()).selectTab({ title: 'Date Range' });
      await fixture.whenStable();
      const panels = [...document.querySelectorAll<HTMLElement>('[role="tabpanel"]')];
      expect(panels.length).toBe(2);
      const inert = panels.filter((p) => p.hasAttribute('inert'));
      expect(inert.length).toBe(1);
      expect(inert[0].querySelector('#custom-hours')).toBeNull();
      expect(panels.find((p) => !p.hasAttribute('inert'))!.querySelector('#custom-from')).not.toBeNull();
    });

    it('labels every custom range field', async () => {
      await openPopover();
      for (const id of ['custom-hours', 'custom-minutes']) {
        expect(document.querySelector(`label[for="${id}"]`)?.textContent?.trim()).toBeTruthy();
      }
      const hours = document.getElementById('custom-hours') as HTMLInputElement;
      expect(hours.type).toBe('number');
      expect(hours.min).toBe('0');
      expect(hours.step).toBe('1');
    });

    describe('Hours and Minutes', () => {
      const type = async (field: HTMLInputElement, value: string) => {
        field.value = value;
        field.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        await fixture.whenStable();
      };
      const fields = {
        hours: { id: 'custom-hours', value: () => component.customHours() },
        minutes: { id: 'custom-minutes', value: () => component.customMinutes() }
      };

      for (const [name, { id, value }] of Object.entries(fields)) {
        it.each(['-1', '-30'])(
          `clamps ${name} %s up to 0, in the field too, as develop's p-inputnumber [min]="0" did`,
          async (typed) => {
            await openPopover();
            const field = document.getElementById(id) as HTMLInputElement;
            await type(field, typed);
            expect(field.value).toBe('0');
            expect(value()).toBe(0);
          }
        );

        it(`leaves ${name} valid when clamped again at its limit`, async () => {
          await openPopover();
          const field = document.getElementById(id) as HTMLInputElement;
          await type(field, '-1');
          await type(field, '-5');
          expect(field.value).toBe('0');
          expect(value()).toBe(0);
          expect(field.classList).toContain('ng-valid');
        });

        it(`keeps ${name} of 0 or more as typed, and an empty field empty`, async () => {
          await openPopover();
          const field = document.getElementById(id) as HTMLInputElement;
          await type(field, '45');
          expect(field.value).toBe('45');
          expect(value()).toBe(45);
          await type(field, '');
          expect(field.value).toBe('');
          expect(value()).toBeNull();
        });

        it(`sizes ${name} with the number input recipe`, async () => {
          await openPopover();
          const field = document.getElementById(id) as HTMLInputElement;
          expect([...field.classList]).toEqual(expect.arrayContaining(numberInputClass('fill').split(/\s+/)));
        });
      }
    });

    it('ignores tab values that are not a custom mode', () => {
      component.setCustomMode(undefined);
      component.setCustomMode('something-else');
      expect(component.customMode()).toBe('last-x');
    });
  });
});
