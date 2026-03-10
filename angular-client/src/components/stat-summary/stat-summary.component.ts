import { Component, input } from '@angular/core';

export interface StatDisplay {
  label: string;
  value: string;
  unit: string;
}

@Component({
  selector: 'stat-summary',
  templateUrl: './stat-summary.component.html',
  styleUrl: './stat-summary.component.css',
  standalone: true
})
export class StatSummaryComponent {
  stats = input.required<StatDisplay[]>();
}
