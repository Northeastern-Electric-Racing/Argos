import { ChangeDetectionStrategy, Component, forwardRef, input, model, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * On/off switch: a native button with role="switch" and aria-checked (WAI-ARIA switch pattern).
 * Angular Aria has no switch, so this is ours. Works with ngModel or `[(checked)]`.
 * Controlled: it shows `checked` and asks to change it through `checkedChange`, so a parent can set it back
 * (an optimistic toggle that reverts when the server refuses). Track and thumb read aria-checked.
 * Off is an outlined track (control-border, 3:1 on the surface), on a filled accent track: the states differ by fill
 * versus outline and by the thumb's side, since no grey can be 3:1 from both the surface and the accent (WCAG 1.4.11).
 * Hovered on, the fill deepens to accent-strong (white thumb 4.98:1; a lighter fill left it at 2.96:1) and the
 * edge lightens to accent-hover, so the track's edge stays 3:1 against every surface.
 */
@Component({
  selector: 'ui-switch',
  templateUrl: './switch.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => UiSwitchComponent), multi: true }]
})
export class UiSwitchComponent implements ControlValueAccessor {
  checked = model(false);
  ariaLabel = input<string | undefined>(undefined);
  inputId = input<string | undefined>(undefined);
  protected disabled = signal(false);

  private onChange: (value: boolean) => void = () => {};
  private onTouched: () => void = () => {};

  toggle(): void {
    if (this.disabled()) return;
    const next = !this.checked();
    this.checked.set(next);
    this.onChange(next);
    this.onTouched();
  }

  writeValue(value: boolean | null): void {
    this.checked.set(!!value);
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }
}
