import { Component, ChangeDetectionStrategy } from '@angular/core';

/** A vertical hairline, 80% of its row's height. */
@Component({
  selector: 'divider',
  templateUrl: './divider.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { class: 'h-4/5 border border-solid border-border' }
})
export class DividerComponent {}
