import { computed, Directive, input } from '@angular/core';
import { fieldClasses, InputSize, inputClass } from '../recipes/field';

/**
 * A text, number, date or password input in the design system's look:
 * `<input uiInput>` (md) or `<input uiInput="sm">`. Wire aria-required, aria-invalid and aria-describedby on
 * the element as usual; aria-invalid="true" turns the edge to the danger colour. Width is the consumer's class.
 */
@Directive({
  selector: 'input[uiInput]',
  host: { '[class]': 'classes()', '[attr.data-size]': 'size()' }
})
export class UiInputDirective {
  /** The size; the bare attribute (`uiInput`) means md. */
  uiInput = input<InputSize | ''>('');
  protected size = computed<InputSize>(() => this.uiInput() || 'md');
  protected classes = computed(() => inputClass(this.size()));
}

/** A field label: `<label uiLabel for="id">`. */
@Directive({
  selector: 'label[uiLabel]',
  host: { '[class]': 'classes' }
})
export class UiLabelDirective {
  protected readonly classes = fieldClasses.label;
}

/** The error line under a field; point the control's aria-describedby at its id. */
@Directive({
  selector: '[uiFieldError]',
  host: { '[class]': 'classes' }
})
export class UiFieldErrorDirective {
  protected readonly classes = fieldClasses.error;
}
