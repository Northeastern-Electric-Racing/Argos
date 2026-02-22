import { Component, inject, input, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import Storage from 'src/services/storage.service';
import { Segment, segmentInfoMap, SegmentInfo } from 'src/utils/bms.utils';

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
  temperature!: number;
  voltage!: number;
  chipTemp!: number;

  ngOnInit(): void {
    const info: SegmentInfo = segmentInfoMap[this.segment()];
    this.subscriptions.push(
      this.storage.get(info.segmentTempKey).subscribe((v) => (this.temperature = parseFloat(v.values[0]))),
      this.storage.get(info.voltageKey).subscribe((v) => (this.voltage = parseFloat(v.values[0]))),
      this.storage.get(info.alphaChipTempKey).subscribe((v) => (this.chipTemp = parseFloat(v.values[0])))
    );
  }

  formatTemp(): string {
    return this.temperature !== undefined ? this.temperature.toFixed(0) : '-';
  }

  formatVoltage(): string {
    return this.voltage !== undefined ? this.voltage.toFixed(1) : '-';
  }

  formatChipTemp(): string {
    return this.chipTemp !== undefined ? this.chipTemp.toFixed(0) : '-';
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }
}
