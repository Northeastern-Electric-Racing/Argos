import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { StyleVariant } from 'src/utils/style-variant';
import { typographyClass } from './typography.recipe';

/**
 * 814 parity (plan 2.2, the fontSize trap). Theme wrote these variants' size as `fontSize: …`; Angular's style
 * binding applies that key after a caller's `font-size: …`, so on 814 those overrides never rendered. They are
 * dropped here so every page keeps 814's sizes; a caller that really wants the size uses textClass (or fontSize).
 */
const SIZE_BEAT_DASH_CASE_OVERRIDES = new Set<StyleVariant>([
  'header',
  'secondary-header',
  'subheader',
  'info-title',
  'info-subtitle',
  'value',
  'info-value',
  'info-value-mobile'
]);
const dashCaseFontSize = /(^|;)\s*font-size\s*:[^;]*;?/gi;

/**
 * Text in one of the app's type styles (typography.recipe.ts).
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
  protected inlineStyle = computed(() =>
    SIZE_BEAT_DASH_CASE_OVERRIDES.has(this.variant())
      ? this.additionalStyles().replace(dashCaseFontSize, '$1')
      : this.additionalStyles()
  );
}
