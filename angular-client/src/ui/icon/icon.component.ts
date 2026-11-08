import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input } from '@angular/core';
import {
  iconBaseClass,
  iconClasses,
  iconDefaultSizeClass,
  iconFontClass,
  iconFontLeadingClass,
  IconSize
} from '../recipes/icon';
import { cx } from '../recipes/tw';
import { UiIconRegistry } from './icon-registry';

/**
 * An icon: a Material Icons ligature (`<ui-icon name="close" />`) or a registered SVG (`<ui-icon svg="wifi" />`,
 * UiIconRegistry). Styled only with utilities (recipes/icon.ts), so classes on it work like on any element: colour
 * it with a `text-*` class on it or its parent (it draws in currentColor), place it with layout classes.
 * Size it with `size` (xs 16 · sm 18 · md 20 · lg 24 · xl 36px, or `inline`); an unsized icon is 24px, which a
 * font-size utility on it can override.
 * Decorative by default: hidden from assistive tech, as mat-icon was. Give it a `label` when it carries meaning
 * nothing else says; it is then an image with that name.
 */
@Component({
  selector: 'ui-icon',
  template: '{{ svg() ? "" : name() }}',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    translate: 'no',
    '[class]': 'classes()',
    '[attr.role]': 'label() ? "img" : null',
    '[attr.aria-label]': 'label() || null',
    '[attr.aria-hidden]': 'label() ? null : "true"'
  }
})
export class UiIconComponent {
  /** The Material Icons ligature to draw (`close`, `chevron_right`). */
  name = input('');
  /** A registered SVG icon's name; drawn instead of `name`. */
  svg = input<string>();
  size = input<IconSize>();
  /** The accessible name; without one the icon is aria-hidden. */
  label = input<string>();

  private host: HTMLElement = inject(ElementRef).nativeElement;
  private registry = inject(UiIconRegistry);

  protected classes = computed(() => {
    const size = this.size();
    const font = !this.svg();
    return cx(
      iconBaseClass,
      size ? iconClasses[size] : iconDefaultSizeClass,
      font ? iconFontClass : '',
      font && size !== 'inline' ? iconFontLeadingClass : ''
    );
  });

  constructor() {
    effect((onCleanup) => {
      const name = this.svg();
      let current = true;
      onCleanup(() => (current = false));
      this.host.querySelector(':scope > svg')?.remove();
      if (!name) return;
      void this.registry.svg(name).then((svg) => {
        if (current && svg) this.host.appendChild(svg);
      });
    });
  }
}
