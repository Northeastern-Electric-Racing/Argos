import { Component, inject, input, OnDestroy, OnInit, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import Storage from 'src/services/storage.service';
import { Segment, segmentInfoMap, SegmentInfo } from 'src/utils/bms.utils';
import { StatConfig, StatSummaryComponent } from 'src/components/stat-summary/stat-summary.component';

const DEFAULT_SEGMENT_STATS: StatConfig[] = [
  { label: 'Avg Temp', unit: '°C', value: undefined, formatFn: (v) => v.toFixed(0) },
  { label: 'Avg Voltage', unit: 'V', value: undefined, formatFn: (v) => v.toFixed(1) },
  { label: 'Total Voltage', unit: 'V', value: undefined, formatFn: (v) => v.toFixed(1) }
];

const SEGMENT_TOPIC_KEYS: (keyof SegmentInfo)[] = ['segmentTempKey', 'voltageKey', 'totalVoltageKey'];

@Component({
  selector: 'segment-overview',
  templateUrl: './segment-overview.component.html',
  styleUrl: './segment-overview.component.css',
  imports: [StatSummaryComponent]
})
export class SegmentOverviewComponent implements OnInit, OnDestroy {
  private storage = inject(Storage);
  private subscriptions: Subscription[] = [];

  segment = input.required<Segment>();
  segmentStats = input<StatConfig[]>(DEFAULT_SEGMENT_STATS);

  statConfigs = signal<StatConfig[]>([]);

  ngOnInit(): void {
    const info = segmentInfoMap[this.segment()];
    const configs = [...this.segmentStats()];

    SEGMENT_TOPIC_KEYS.forEach((key, i) => {
      this.subscriptions.push(
        this.storage.get(info[key]).subscribe((v) => {
          configs[i] = { ...configs[i], value: parseFloat(v.values[0]) };
          this.statConfigs.set([...configs]);
        })
      );
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }
}
