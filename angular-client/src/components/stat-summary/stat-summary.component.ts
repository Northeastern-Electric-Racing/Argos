import { Component, input, ChangeDetectionStrategy } from '@angular/core';

export interface StatConfig {
  label: string;
  unit: string;
  value: number | undefined;
  formatFn: (v: number) => string;
}

@Component({
  selector: 'stat-summary',
  templateUrl: './stat-summary.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { class: 'flex h-full w-full items-center justify-center' }
})
export class StatSummaryComponent {
  configs = input.required<StatConfig[]>();

  formatStat(config: StatConfig): string {
    return Number.isFinite(config.value) ? config.formatFn(config.value!) : '-';
  }
}
