import { Component, input, OnChanges } from '@angular/core';
import { NgClass } from '@angular/common';
import { MatIcon } from '@angular/material/icon';

/**
 * Lightweight stat display component designed for the At A Glance bar.
 * Renders value + unit + subtitle with optional header label and widget slot.
 * Uses pure CSS — no nested hstack/vstack/typography wrappers.
 */
@Component({
  selector: 'glance-stat',
  templateUrl: './glance-stat.component.html',
  styleUrl: './glance-stat.component.css',
  standalone: true,
  imports: [NgClass, MatIcon],
  host: {
    '[class.unit-below-mode]': 'unitBelow()'
  }
})
export class GlanceStatComponent implements OnChanges {
  value = input<number>();
  unit = input<string>('');
  subtitle = input<string>('');
  precision = input<number>(1);
  /** Optional header label (e.g. "Cell: 114 | Chip: A") */
  headerLabel = input<string>('');
  /** SVG icon name to show in header (registered via matIconRegistry) */
  headerIcon = input<string>('');
  /** When true, render the unit below the value instead of inline */
  unitBelow = input<boolean>(false);

  formattedValue = '-';

  ngOnChanges(): void {
    const val = this.value();
    this.formattedValue = (val?.toFixed(this.precision()) ?? '-') + (this.unit() === 'C' ? '°' : '');
  }
}
