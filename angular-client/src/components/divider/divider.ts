import { Component, ChangeDetectionStrategy } from '@angular/core';

/**
 * A vertical hairline, 80% of its row's height by default. The default has zero specificity, so a consumer's
 * height class on `<divider>` always wins (not only when Tailwind happens to emit it later).
 */
@Component({
  selector: 'divider',
  templateUrl: './divider.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { class: '[:where(&)]:h-4/5 border border-solid border-border' }
})
export class DividerComponent {}
