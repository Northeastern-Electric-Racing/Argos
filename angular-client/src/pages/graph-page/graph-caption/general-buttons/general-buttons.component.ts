import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { ToastService } from 'src/services/toast.service';
import { FormsModule } from '@angular/forms';
import { TuiActiveZone, TuiDay, TuiTime } from '@taiga-ui/cdk';
import { TuiCalendar, tuiDateFormatProvider, TuiDropdown, TuiTextfield } from '@taiga-ui/core';
import { TuiInputDateTime, TuiInputNumber } from '@taiga-ui/kit';
import { SelectorConfig } from 'src/components/select-dropdown/select-dropdown.component';
import { Run } from 'src/utils/types.utils';

import { RunSelectorComponent } from '../run-selector/run-selector.component';
import { ButtonComponent } from '../../../../components/argos-button/argos-button.component';
import { SelectDropdownComponent } from '../../../../components/select-dropdown/select-dropdown.component';

export interface RangePreset {
  label: string;
  minutes: number;
}

/**
 * Cap custom ranges at 7 days.
 *
 * The backend has no server-side limit on time-range queries — a multi-week query at
 * 1k Hz telemetry would download tens of millions of rows and tank both the API and the
 * browser. 7 days covers race-day debugging windows and any reasonable post-race review;
 * anything longer should be a run-based query, not a time-based one.
 */
export const MAX_RANGE_MINUTES = 7 * 24 * 60;

type CustomMode = 'last-x' | 'date-range';

/** The [day, time] pair Taiga's date-time input works with */
export type DayTime = [TuiDay, TuiTime];

export function toDayTime(date: Date): DayTime {
  return [TuiDay.fromLocalNativeDate(date), TuiTime.fromLocalNativeDate(date)];
}

export function fromDayTime([day, time]: readonly [TuiDay, TuiTime?]): Date {
  const date = day.toLocalNativeDate();
  if (time) date.setHours(time.hours, time.minutes, time.seconds, time.ms);
  return date;
}

@Component({
  selector: 'general-buttons',
  templateUrl: './general-buttons.component.html',
  styleUrl: './general-buttons.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Same yyyy-mm-dd dates the PrimeNG date picker showed
  providers: [tuiDateFormatProvider({ mode: 'yyyy/mm/dd', separator: '-' })],
  imports: [
    RunSelectorComponent,
    ButtonComponent,
    SelectDropdownComponent,
    TuiActiveZone,
    TuiCalendar,
    TuiDropdown,
    TuiInputDateTime,
    TuiInputNumber,
    TuiTextfield,
    FormsModule
  ]
})
export class GeneralButtonsComponent {
  private toasts = inject(ToastService);

  historicalOn = input<boolean>(false);
  onRunSelected = input.required<(run: Run) => void>();
  onClearDataType = input.required<() => void>();
  onSetRealTime = input.required<() => void>();

  presets = input.required<RangePreset[]>();
  selectedPresetMinutes = input<number | undefined>(undefined);
  // Whether a custom range is currently applied (drives the Custom button highlight + caption).
  customActive = input<boolean>(false);
  // Caption shown beneath the Custom button when a custom range is applied (e.g. "Last 1h 30m").
  // Owned by the parent so the formatting/source-of-truth lives next to the state itself.
  customCaption = input<string | null>(null);
  // Active custom range — used by the popover to seed itself on open so users can adjust
  // the applied values rather than re-entering them.
  activeLastXMinutes = input<number | undefined>(undefined);
  activeDateRange = input<{ startMs: number; endMs: number } | undefined>(undefined);
  onSelectPreset = input.required<(minutes: number) => void>();
  onApplyCustomLastX = input.required<(totalMinutes: number) => void>();
  onApplyCustomDateRange = input.required<(startMs: number, endMs: number) => void>();

  customOpen = signal(false);

  customMode = signal<CustomMode>('last-x');
  customHours = signal<number | null>(0);
  customMinutes = signal<number | null>(30);
  customFromDate = signal<Date>(new Date(Date.now() - 30 * 60 * 1000));
  customToDate = signal<Date>(new Date());
  maxDate = signal<Date>(new Date());
  // Taiga's date-time input works in [TuiDay, TuiTime]; the component keeps native Dates
  maxDayTime = computed(() => toDayTime(this.maxDate()));
  customFromDayTime = computed(() => toDayTime(this.customFromDate()));
  customToDayTime = computed(() => toDayTime(this.customToDate()));

  // Build the dropdown config from the preset list each time it changes; preserves the
  // existing select-dropdown contract without leaking it back to the parent.
  quickSelectConfig = computed<SelectorConfig>(() => ({
    options: this.presets().map((p) => ({
      name: p.label,
      function: () => this.onSelectPreset()(p.minutes)
    })),
    placeholder: 'Quick Select'
  }));

  // The dropdown's defaultValue input matches an option by name, so we look up the label
  // for the active preset (or undefined when a custom range is active / nothing is picked).
  selectedPresetLabel = computed<string | undefined>(() => {
    const minutes = this.selectedPresetMinutes();
    if (minutes === undefined) return undefined;
    return this.presets().find((p) => p.minutes === minutes)?.label;
  });

  toggleCustomPopover = () => {
    const open = !this.customOpen();
    if (open) this.onCustomPopoverShow();
    this.customOpen.set(open);
  };

  /** Close the popover once focus and clicks leave it (Taiga's active zone) */
  onCustomActiveZone(active: boolean) {
    if (!active) this.customOpen.set(false);
  }

  setCustomFrom(value: DayTime | null) {
    if (value) this.customFromDate.set(fromDayTime(value));
  }

  setCustomTo(value: DayTime | null) {
    if (value) this.customToDate.set(fromDayTime(value));
  }

  // Refresh the popover contents every time it opens. Without this, the From/To pickers
  // and `maxDate` go stale (component-init values) once the page has been open a while,
  // and re-applying the same range fetches data anchored at the wrong "now".
  onCustomPopoverShow = () => {
    this.maxDate.set(new Date());

    const lastX = this.activeLastXMinutes();
    const range = this.activeDateRange();
    if (lastX !== undefined) {
      this.customMode.set('last-x');
      this.customHours.set(Math.floor(lastX / 60));
      this.customMinutes.set(lastX % 60);
    } else if (range !== undefined) {
      this.customMode.set('date-range');
      this.customFromDate.set(new Date(range.startMs));
      this.customToDate.set(new Date(range.endMs));
    } else {
      // Nothing applied — restore the initial defaults for both modes so prior typing
      // doesn't linger. Uses fresh "now" for Date Range to avoid wall-clock from page load.
      this.customHours.set(0);
      this.customMinutes.set(30);
      this.customFromDate.set(new Date(Date.now() - 30 * 60 * 1000));
      this.customToDate.set(new Date());
    }
  };

  setCustomMode = (mode: CustomMode) => {
    this.customMode.set(mode);
  };

  applyCustomLastX = () => {
    const hours = this.customHours() ?? 0;
    const minutes = this.customMinutes() ?? 0;
    const totalMinutes = Math.floor(hours * 60 + minutes);
    if (totalMinutes <= 0) {
      this.toasts.show('Custom range must be greater than 0 minutes.', { label: 'Invalid Range', appearance: 'warning' });
      return;
    }
    if (totalMinutes > MAX_RANGE_MINUTES) {
      this.toasts.show(`Custom range capped at ${MAX_RANGE_MINUTES / (24 * 60)} days.`, {
        label: 'Range Too Large',
        appearance: 'warning'
      });
      return;
    }
    this.onApplyCustomLastX()(totalMinutes);
  };

  applyCustomDateRange = () => {
    const from = this.customFromDate();
    const to = this.customToDate();
    const now = Date.now();
    if (!from || !to) {
      this.toasts.show('Pick both a start and end time.', { label: 'Invalid Range', appearance: 'warning' });
      return;
    }
    const startMs = from.getTime();
    const endMs = to.getTime();
    if (startMs >= endMs) {
      this.toasts.show('Start must be before end.', { label: 'Invalid Range', appearance: 'warning' });
      return;
    }
    if (endMs > now + 60 * 1000) {
      this.toasts.show('End time cannot be in the future.', { label: 'Invalid Range', appearance: 'warning' });
      return;
    }
    if (endMs - startMs > MAX_RANGE_MINUTES * 60 * 1000) {
      this.toasts.show(`Custom range capped at ${MAX_RANGE_MINUTES / (24 * 60)} days.`, {
        label: 'Range Too Large',
        appearance: 'warning'
      });
      return;
    }
    this.onApplyCustomDateRange()(startMs, endMs);
  };
}
