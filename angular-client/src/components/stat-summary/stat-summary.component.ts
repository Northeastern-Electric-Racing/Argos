import { Component, input } from '@angular/core';

export interface StatConfig {
  label: string;
  unit: string;
  value: number | undefined;
  formatFn: (v: number) => string;
}

@Component({
  selector: 'stat-summary',
  templateUrl: './stat-summary.component.html',
  styleUrl: './stat-summary.component.css',
  standalone: true
})
export class StatSummaryComponent {
  configs = input.required<StatConfig[]>();

  formatStat(config: StatConfig): string {
    return config.value !== undefined ? config.formatFn(config.value) : '-';
  }
}
