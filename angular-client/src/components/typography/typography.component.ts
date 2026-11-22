import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { StyleVariant } from 'src/utils/style-variant';
import { typographyClass } from 'src/ui/recipes/typography';

/**
 * Text in one of the app's type styles (src/ui/recipes/typography.ts).
 * @param variant - The type style.
 * @param content - The text.
 * @param textClass - Tailwind classes for the paragraph: layout, alignment, or a size, colour or margin override
 *   (an override replaces the variant's own class for that property).
 * @param additionalStyles - Legacy inline CSS for callers not yet migrated to `textClass`; it beats every class.
 * @example
 * <typography variant="header" content="Hello World!" textClass="m-0 text-accent-fg" />
 */
@Component({
  selector: 'typography',
  templateUrl: './typography.component.html',
  changeDetection: ChangeDetectionStrategy.Eager
})
export default class TypographyComponent {
  variant = input.required<StyleVariant>();
  content = input<string | string[] | null>();
  textClass = input<string>('');
  additionalStyles = input<string>('');

  protected classes = computed(() => typographyClass(this.variant(), this.textClass()));
}
