import { Component, inject, input, OnInit, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import Storage from 'src/services/storage.service';
import { Segment, segmentInfo, SegmentInfo } from 'src/utils/bms.utils';
import { StatConfig, StatSummaryComponent } from 'src/components/stat-summary/stat-summary.component';

const DEFAULT_SEGMENT_STATS: StatConfig[] = [
  { label: 'Avg Temp', unit: '°C', value: undefined, formatFn: (v) => v.toFixed(0) },
  { label: 'Avg Voltage', unit: 'V', value: undefined, formatFn: (v) => v.toFixed(2) },
  { label: 'Total Voltage', unit: 'V', value: undefined, formatFn: (v) => v.toFixed(1) }
];

const SEGMENT_TOPIC_KEYS: (keyof SegmentInfo)[] = ['segmentTempKey', 'voltageKey', 'totalVoltageKey'];

@Component({
  selector: 'segment-overview',
  templateUrl: './segment-overview.component.html',
  styleUrl: './segment-overview.component.css',
  standalone: true,
  imports: [StatSummaryComponent]
})
export class SegmentOverviewComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private storage = inject(Storage);

  segment = input.required<Segment>();

  statConfigs = signal<StatConfig[]>(DEFAULT_SEGMENT_STATS);

  ngOnInit(): void {
    const info = segmentInfo(this.segment());
    const configs = [...DEFAULT_SEGMENT_STATS];

    SEGMENT_TOPIC_KEYS.forEach((key, i) => {
      this.storage
        .get(info[key])
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((v) => {
          configs[i] = { ...configs[i], value: parseFloat(v.values[0]) };
          this.statConfigs.set([...configs]);
        });
    });
  }
}
