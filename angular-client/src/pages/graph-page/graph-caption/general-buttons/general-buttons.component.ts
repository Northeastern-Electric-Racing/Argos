import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmDatePickerImports } from '@spartan-ng/helm/date-picker';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmPopoverImports } from '@spartan-ng/helm/popover';
import { HlmToggleGroupImports } from '@spartan-ng/helm/toggle-group';
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

@Component({
  selector: 'general-buttons',
  templateUrl: './general-buttons.component.html',
  styleUrl: './general-buttons.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RunSelectorComponent,
    ButtonComponent,
    SelectDropdownComponent,
    HlmPopoverImports,
    HlmToggleGroupImports,
    HlmDatePickerImports,
    HlmInput,
    HlmLabel,
    FormsModule
  ]
})
export class GeneralButtonsComponent {
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

  customPopoverOpen = signal(false);

  customMode = signal<CustomMode>('last-x');
  readonly customModes: { value: CustomMode; label: string }[] = [
    { value: 'last-x', label: 'Last X' },
    { value: 'date-range', label: 'Date Range' }
  ];
  customHours = signal<number | null>(0);
  customMinutes = signal<number | null>(30);
  customFromDate = signal<Date>(new Date(Date.now() - 30 * 60 * 1000));
  customToDate = signal<Date>(new Date());
  maxDate = signal<Date>(new Date());

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
    this.customPopoverOpen.update((open) => !open);
  };

  onCustomPopoverStateChanged(state: string) {
    const open = state === 'open';
    this.customPopoverOpen.set(open);
    if (open) this.onCustomPopoverShow();
  }

  /** yyyy-mm-dd, the day half of a From/To picker. */
  formatDay = (date: Date): string =>
    [date.getFullYear(), date.getMonth() + 1, date.getDate()].map((n) => String(n).padStart(2, '0')).join('-');

  /** "HH:mm:ss" for the time half of a From/To picker. */
  timeOf(date: Date): string {
    return [date.getHours(), date.getMinutes(), date.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':');
  }

  /** Keeps the time of day when a new calendar day is picked. */
  withDay(current: Date, day: Date | null): Date {
    if (!day) return current;
    const next = new Date(day);
    next.setHours(current.getHours(), current.getMinutes(), current.getSeconds(), 0);
    return next;
  }

  /** Applies an "HH:mm[:ss]" time input to the picked day. */
  withTime(current: Date, time: string): Date {
    const [h = 0, m = 0, sec = 0] = time.split(':').map(Number);
    const next = new Date(current);
    next.setHours(h, m, sec, 0);
    return next;
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

  setCustomMode = (mode: CustomMode | CustomMode[] | null | undefined) => {
    if (typeof mode === 'string') this.customMode.set(mode);
  };

  applyCustomLastX = () => {
    const hours = this.customHours() ?? 0;
    const minutes = this.customMinutes() ?? 0;
    const totalMinutes = Math.floor(hours * 60 + minutes);
    if (totalMinutes <= 0) {
      toast.warning('Invalid Range', { description: 'Custom range must be greater than 0 minutes.' });
      return;
    }
    if (totalMinutes > MAX_RANGE_MINUTES) {
      toast.warning('Range Too Large', { description: `Custom range capped at ${MAX_RANGE_MINUTES / (24 * 60)} days.` });
      return;
    }
    this.onApplyCustomLastX()(totalMinutes);
  };

  applyCustomDateRange = () => {
    const from = this.customFromDate();
    const to = this.customToDate();
    const now = Date.now();
    if (!from || !to) {
      toast.warning('Invalid Range', { description: 'Pick both a start and end time.' });
      return;
    }
    const startMs = from.getTime();
    const endMs = to.getTime();
    if (startMs >= endMs) {
      toast.warning('Invalid Range', { description: 'Start must be before end.' });
      return;
    }
    if (endMs > now + 60 * 1000) {
      toast.warning('Invalid Range', { description: 'End time cannot be in the future.' });
      return;
    }
    if (endMs - startMs > MAX_RANGE_MINUTES * 60 * 1000) {
      toast.warning('Range Too Large', { description: `Custom range capped at ${MAX_RANGE_MINUTES / (24 * 60)} days.` });
      return;
    }
    this.onApplyCustomDateRange()(startMs, endMs);
  };
}
