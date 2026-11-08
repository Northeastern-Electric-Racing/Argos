import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'stat-display-list',
  templateUrl: './stat-display-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' }
})
export class StatDisplayListComponent {}
