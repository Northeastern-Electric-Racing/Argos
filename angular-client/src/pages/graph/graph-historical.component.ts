import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-graph-historical',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p>Historical graph goes here - to be implemented...</p>`
})
export class GraphHistoricalComponent {
  @Input() key: number = 0;
}
