import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';

type RepeatMode = 'auto-fit' | 'auto-fill';

/**
 * A reusable CSS Grid layout component with configurable column sizing.
 *
 * Usage:
 *   <grid-layout minWidth="300px" maxWidth="1fr" repeatMode="auto-fit" gap="15px">
 *     <my-card />
 *     <my-card />
 *   </grid-layout>
 */
@Component({
  selector: 'grid-layout',
  templateUrl: './grid-layout.component.html',
  changeDetection: ChangeDetectionStrategy.Eager
})
export default class GridLayoutComponent {
  /** Minimum column width (e.g. '300px', '20rem'); a grid narrower than this gets one column of its own width */
  minWidth = input<string>('300px');

  /** Maximum column width (e.g. '1fr', '500px') */
  maxWidth = input<string>('1fr');

  /** Grid repeat mode: 'auto-fit' collapses empty tracks, 'auto-fill' keeps them */
  repeatMode = input<RepeatMode>('auto-fit');

  /** Gap between grid items (e.g. '15px', '1rem') */
  gap = input<string>('15px');

  gridTemplateColumns = computed(() => {
    return `repeat(${this.repeatMode()}, minmax(min(${this.minWidth()}, 100%), ${this.maxWidth()}))`;
  });
}
