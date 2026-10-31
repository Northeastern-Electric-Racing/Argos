import { Combobox, ComboboxPopup, ComboboxWidget } from '@angular/aria/combobox';
import { Listbox, Option } from '@angular/aria/listbox';
import { OverlayModule } from '@angular/cdk/overlay';
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  output,
  signal,
  viewChild
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';

/**
 * Single-select dropdown built from Angular Aria's Combobox + Listbox, positioned with a CDK
 * connected overlay, following the Aria "Select" pattern guide. Works with ngModel, or with
 * `[value]` + `(selectionChange)`.
 */
@Component({
  selector: 'ui-select',
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Combobox, ComboboxPopup, ComboboxWidget, Listbox, Option, OverlayModule, MatIcon],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => UiSelectComponent), multi: true }]
})
export class UiSelectComponent<T> implements ControlValueAccessor {
  options = input<T[]>([]);
  /** Property of each option to show as its label; options are shown as-is when unset. */
  optionLabel = input<string | undefined>(undefined);
  placeholder = input('Select…');
  ariaLabel = input<string | undefined>(undefined);
  inputId = input<string | undefined>(undefined);
  size = input<'md' | 'sm'>('md');
  value = input<T | undefined>(undefined);

  selectionChange = output<T>();

  private listbox = viewChild(Listbox);
  protected expanded = signal(false);
  protected disabled = signal(false);
  private selected = signal<T | undefined>(undefined);
  private hasCvaValue = signal(false);

  protected current = computed(() => (this.hasCvaValue() ? this.selected() : this.selected() ?? this.value()));
  protected selectedValues = computed(() => {
    const current = this.current();
    return current === undefined || current === null ? [] : [current];
  });
  protected display = computed(() => {
    const current = this.current();
    return current === undefined || current === null ? undefined : this.labelOf(current);
  });

  private onChange: (value: T) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    afterRenderEffect(() => {
      this.listbox()?.scrollActiveItemIntoView();
    });
  }

  labelOf(option: T): string {
    const key = this.optionLabel();
    if (key && option && typeof option === 'object') {
      return String((option as Record<string, unknown>)[key] ?? '');
    }
    return String(option ?? '');
  }

  protected onValuesChange(values: T[]): void {
    const [next] = values;
    if (next === undefined || next === this.current()) return;
    this.selected.set(next);
    this.onChange(next);
    this.selectionChange.emit(next);
  }

  protected commit(): void {
    this.expanded.set(false);
    this.onTouched();
  }

  writeValue(value: T | null): void {
    this.hasCvaValue.set(true);
    this.selected.set(value ?? undefined);
  }

  registerOnChange(fn: (value: T) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  /** Clears the shown selection back to the placeholder. */
  clear(): void {
    this.selected.set(undefined);
  }
}
