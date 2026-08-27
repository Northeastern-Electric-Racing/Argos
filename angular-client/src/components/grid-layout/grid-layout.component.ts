import { Component, computed, input } from '@angular/core';
import { NgStyle } from '@angular/common';

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
  styleUrls: ['./grid-layout.component.css'],
  imports: [NgStyle]
})
export default class GridLayoutComponent {
  /** Minimum column width (e.g. '300px', '20rem') */
  minWidth = input<string>('300px');

  /** Maximum column width (e.g. '1fr', '500px') */
  maxWidth = input<string>('1fr');

  /** Grid repeat mode: 'auto-fit' collapses empty tracks, 'auto-fill' keeps them */
  repeatMode = input<RepeatMode>('auto-fit');

  /** Gap between grid items (e.g. '15px', '1rem') */
  gap = input<string>('15px');

  gridTemplateColumns = computed(() => {
    return `repeat(${this.repeatMode()}, minmax(${this.minWidth()}, ${this.maxWidth()}))`;
  });
}
