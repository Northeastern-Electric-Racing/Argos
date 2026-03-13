import { Component, input, computed } from '@angular/core';

/** Use one-dot-leader (U+2024) instead of period — it falls back to
 *  monospace with a consistent advance width in the Segment7 font. */
const DOT = '\u2024';

/**
 * Seven-segment display component using a font-based approach.
 * Two layers: a background layer always showing "8" for every digit (faded red),
 * and a foreground layer showing the actual value (bright red).
 *
 * Uses the one-dot-leader character (U+2024) for the decimal point so that
 * both layers always have identical character widths and align perfectly.
 */
@Component({
  selector: 'seven-segment-display',
  templateUrl: './seven-segment-display.component.html',
  styleUrls: ['./seven-segment-display.component.css'],
  standalone: true
})
export default class SevenSegmentDisplayComponent {
  /** The value to display (e.g., "1.70") */
  value = input.required<string>();

  /** Number of digits (not counting decimal point) to show in the background */
  digits = input<number>(3);

  /** Number of decimal places */
  decimals = input<number>(2);

  /** Font size in px */
  fontSize = input<number>(64);

  /** Optional unit label displayed at the bottom-right of the box (e.g., "A", "V") */
  unit = input<string>('');

  /** Font size in px for the unit label */
  unitFontSize = input<number>(30);

  /** Optional padding overrides for the display box (in px) */
  paddingLeft = input<number>(15);
  paddingRight = input<number>(10);
  paddingTop = input<number>(20);
  paddingBottom = input<number>(10);

  /** Text alignment for the segment text */
  textAlign = input<'left' | 'center' | 'right'>('center');

  /** Alignment for the stacked text layers */
  stackAlign = input<'start' | 'center' | 'end'>('center');

  /**
   * Background text with all 8s and the dot leader, e.g. "8․88"
   */
  backgroundText = computed(() => {
    const intDigits = this.digits() - this.decimals();
    const decPlaces = this.decimals();
    if (decPlaces > 0) {
      return '8'.repeat(intDigits) + DOT + '8'.repeat(decPlaces);
    }
    return '8'.repeat(this.digits());
  });

  /**
   * Foreground text with the actual value, using the dot leader, e.g. "0․90"
   */
  foregroundText = computed(() => {
    const val = this.value();
    const dotIndex = val.indexOf('.');
    const decPlaces = this.decimals();
    const intDigits = this.digits() - decPlaces;

    const intPart = (dotIndex >= 0 ? val.substring(0, dotIndex) : val).padStart(intDigits, ' ');
    if (decPlaces === 0) return intPart;

    const decRaw = dotIndex >= 0 ? val.substring(dotIndex + 1) : '';
    const decPart = decRaw.padEnd(decPlaces, '0').substring(0, decPlaces);
    return intPart + DOT + decPart;
  });
}
