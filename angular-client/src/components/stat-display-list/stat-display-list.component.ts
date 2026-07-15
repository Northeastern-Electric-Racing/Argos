import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'stat-display-list',
  templateUrl: './stat-display-list.component.html',
  styleUrl: './stat-display-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatDisplayListComponent {}
