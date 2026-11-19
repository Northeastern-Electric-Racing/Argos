import { Combobox, ComboboxPopup, ComboboxWidget } from '@angular/aria/combobox';
import { Listbox, Option } from '@angular/aria/listbox';
import { CdkConnectedOverlay, OverlayModule } from '@angular/cdk/overlay';
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
import { UiIconComponent } from 'src/ui/icon/icon.component';
import { cx, tw } from '../recipes/tw';
import { listboxClasses, listboxPopupClass } from '../recipes/listbox';

/*
 * The trigger. Pages restyle it through custom properties set on ui-select or any ancestor, instead of piercing
 * encapsulation: --ui-select-height, -radius, -bg, -color, -font-size, -font-weight and -padding-left (BMS
 * segment rows and the graph caption use them; the arrow follows -color too). Each falls back to the token the
 * size would use. Hover lays a 6% text-colour tint over whatever the background is; focus and open show the
 * neutral focus edge, 2px thick (the border plus a 1px outline outside it). The rest edge is control-border,
 * 3:1 on every surface.
 */
const triggerBase = tw(
  'group/trigger relative box-border flex w-full cursor-pointer items-center border border-solid border-control-border bg-[color:var(--ui-select-bg,var(--color-surface-3))] pr-9 [font-weight:var(--ui-select-font-weight,inherit)] text-[color:var(--ui-select-color,var(--color-fg))] transition-[border-color] duration-120 select-none hover:border-control-border-hover hover:bg-linear-to-r hover:from-fg/6 hover:to-fg/6 focus-visible:border-focus focus-visible:outline-1 focus-visible:outline-focus aria-disabled:cursor-default aria-disabled:opacity-55 aria-expanded:border-focus aria-expanded:outline-1 aria-expanded:outline-focus'
);
const triggerSizeClasses = {
  md: tw(
    'h-[var(--ui-select-height,2.25rem)] rounded-[var(--ui-select-radius,var(--radius-md))] pl-[var(--ui-select-padding-left,0.75rem)] text-[length:var(--ui-select-font-size,var(--text-base))]'
  ),
  sm: tw(
    'h-[var(--ui-select-height,1.75rem)] rounded-[var(--ui-select-radius,var(--radius-sm))] pl-[var(--ui-select-padding-left,0.5rem)] text-[length:var(--ui-select-font-size,var(--text-ctrl-sm))]'
  )
} as const;

/**
 * Single-select dropdown built from Angular Aria's Combobox + Listbox, positioned with a CDK
 * connected overlay, following the Aria "Select" pattern guide. Works with ngModel; `(selectionChange)`
 * emits each pick.
 */
@Component({
  selector: 'ui-select',
  templateUrl: './select.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The 10rem default min width is zero-specificity (:where), so a consumer's min-w-* class always wins.
  host: { class: 'inline-block [:where(&)]:min-w-40' },
  imports: [Combobox, ComboboxPopup, ComboboxWidget, Listbox, Option, OverlayModule, UiIconComponent],
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

  selectionChange = output<T>();

  protected readonly lb = listboxClasses;
  /**
   * The arrow's box: it places, turns and colours the icon. Its colour follows the trigger's text colour hook, so a page that restyles the trigger (BMS's unlit control-off rows,
   * where fg-muted was 2.96:1) keeps the arrow at the text's contrast; muted otherwise.
   */
  protected readonly arrowClass = tw(
    'pointer-events-none absolute right-[0.45rem] flex text-[color:var(--ui-select-color,var(--color-fg-muted))] transition-transform duration-180 ease-out group-aria-expanded/trigger:rotate-180'
  );
  protected triggerClass = computed(() => cx(triggerBase, triggerSizeClasses[this.size()]));
  protected popupClass = computed(() => listboxPopupClass('grow', this.size()));

  private listbox = viewChild(Listbox);
  private combobox = viewChild(Combobox);
  private overlay = viewChild(CdkConnectedOverlay);
  /**
   * The popup is at least as wide as the trigger and grows for a long option. The overlay pane takes the
   * popup's real width (not matchWidth), so the CDK can flip it to end-aligned when it would leave the
   * viewport (the camera's select sits at the right edge). Measured when the popup opens.
   */
  protected popupMinWidth = computed(() =>
    this.expanded() ? this.combobox()?.element.getBoundingClientRect().width ?? 0 : 0
  );
  protected expanded = signal(false);
  protected disabled = signal(false);
  private selected = signal<T | undefined>(undefined);

  protected current = this.selected.asReadonly();
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
      // The options render after the pane is first placed; place it again now that it has its width.
      if (this.expanded()) this.overlay()?.overlayRef?.updatePosition();
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
}
