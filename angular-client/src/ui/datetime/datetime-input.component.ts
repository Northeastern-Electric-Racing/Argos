import { ChangeDetectionStrategy, Component, computed, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

const pad = (n: number) => String(n).padStart(2, '0');

/** Formats a Date as the local `YYYY-MM-DDTHH:mm:ss` string a datetime-local input expects. */
export function toLocalInputValue(date: Date | null | undefined): string {
  if (!date || isNaN(date.getTime())) return '';
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

/**
 * Date + time (to the second) picker: the browser's native datetime-local input, bound to a Date.
 * Neither Angular Aria nor the CDK has a datepicker; the native control is accessible as-is.
 */
@Component({
  selector: 'ui-datetime-input',
  templateUrl: './datetime-input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => UiDateTimeInputComponent), multi: true }]
})
export class UiDateTimeInputComponent implements ControlValueAccessor {
  maxDate = input<Date | null | undefined>(undefined);
  ariaLabel = input<string | undefined>(undefined);
  inputId = input<string | undefined>(undefined);

  protected text = signal('');
  protected disabled = signal(false);
  protected max = computed(() => toLocalInputValue(this.maxDate()) || null);

  private onChange: (value: Date | null) => void = () => {};
  protected onTouched: () => void = () => {};

  protected onInput(value: string): void {
    this.text.set(value);
    const date = value ? new Date(value) : null;
    this.onChange(date && !isNaN(date.getTime()) ? date : null);
  }

  writeValue(value: Date | null): void {
    this.text.set(toLocalInputValue(value));
  }

  registerOnChange(fn: (value: Date | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }
}
