import { computed, Directive, input } from '@angular/core';
import { ButtonSize, ButtonVariant, buttonClass, IconButtonSize, iconButtonClass } from '../recipes/button';

/**
 * A native button (or link) in the design system's look: `<button uiButton variant="neutral" size="sm">`.
 * The recipe in src/ui/recipes/button.ts holds the classes; layout (width, margins, grid placement) goes in
 * the element's own `class`, which is kept. `data-variant` and `data-size` mirror the inputs for audits.
 */
@Directive({
  selector: 'button[uiButton], a[uiButton]',
  host: {
    '[class]': 'classes()',
    '[attr.data-variant]': 'variant()',
    '[attr.data-size]': 'size()'
  }
})
export class UiButtonDirective {
  variant = input<ButtonVariant>('primary');
  size = input<ButtonSize>('md');
  protected classes = computed(() => buttonClass(this.variant(), this.size()));
}

/** A round icon-only button: `<button uiIconButton aria-label="Close"><ui-icon name="close" /></button>`. Name it. */
@Directive({
  selector: 'button[uiIconButton]',
  host: { '[class]': 'classes()', '[attr.data-size]': 'size()' }
})
export class UiIconButtonDirective {
  size = input<IconButtonSize>('md');
  protected classes = computed(() => iconButtonClass(this.size()));
}
