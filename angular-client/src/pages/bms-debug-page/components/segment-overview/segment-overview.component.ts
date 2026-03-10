import { Component, inject, input, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import Storage from 'src/services/storage.service';
import { Segment, segmentInfoMap, SegmentInfo } from 'src/utils/bms.utils';

export interface StatConfig {
  label: string;
  unit: string;
  topicKey: keyof SegmentInfo;
  formatFn: (v: number) => string;
}

const DEFAULT_STATS	: StatConfig[] = [
  { label: 'Avg Temp', unit: '°C', topicKey: 'segmentTempKey', formatFn: (v) => v.toFixed(0) },
  { label: 'Avg Voltage', unit: 'V', topicKey: 'voltageKey', formatFn: (v) => v.toFixed(1) },
  { label: 'Total Voltage', unit: 'V', topicKey: 'totalVoltageKey', formatFn: (v) => v.toFixed(1) }
];

@Component({
  selector: 'segment-overview',
  templateUrl: './segment-overview.component.html',
  styleUrl: './segment-overview.component.css',
  standalone: true
})
export class SegmentOverviewComponent implements OnInit, OnDestroy {
  private storage = inject(Storage);
  private subscriptions: Subscription[] = [];

  segment = input.required<Segment>();
  stats = input<StatConfig[]>(DEFAULT_STATS);

  /** Current stat values keyed by topicKey */
  values: Record<string, number | undefined> = {};

  ngOnInit(): void {
    const info: SegmentInfo = segmentInfoMap[this.segment()];
    for (const stat of this.stats()) {
      this.subscriptions.push(
        this.storage.get(info[stat.topicKey]).subscribe((v) => {
          this.values[stat.topicKey] = parseFloat(v.values[0]);
        })
      );
    }
  }

  formatStat(stat: StatConfig): string {
    const val = this.values[stat.topicKey];
    return val !== undefined ? stat.formatFn(val) : '-';
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }
}
