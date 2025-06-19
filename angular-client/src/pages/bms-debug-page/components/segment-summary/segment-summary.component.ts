import { Component, inject, input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { appRoutes } from 'src/app/app-routing.module';
import Storage from 'src/services/storage.service';
import { SegmentInfo, Segment, segmentInfoMap } from 'src/utils/bms.utils';
import { InfoBackgroundComponent } from '../../../../components/info-background/info-background.component';

import { InfoValueDisplayComponent } from '../../../../components/info-value-dispaly/info-value-display.component';
import HStackComponent from '../../../../components/hstack/hstack.component';

@Component({
  selector: 'segment-summary',
  templateUrl: './segment-summary.component.html',
  styleUrl: './segment-summary.component.css',
  standalone: true,
  imports: [InfoBackgroundComponent, InfoValueDisplayComponent, HStackComponent]
})
export class SegmentSummaryComponent implements OnInit {
  private router = inject(Router);
  private storage = inject(Storage);
  segmentNumber = input.required<Segment>();
  temperature!: number;
  alphaChipTemp!: number;
  betaChipTemp!: number;
  voltage!: number;

  ngOnInit(): void {
    this.subscribeAndUpdateTemperature();
  }

  subscribeAndUpdateTemperature = () => {
    const segmentInfo = this.getRelevantKeys();

    this.storage.get(segmentInfo.segmentTempKey).subscribe((value) => {
      this.temperature = parseFloat(value.values[0]);
    });
    this.storage.get(segmentInfo.alphaChipTempKey).subscribe((value) => {
      this.alphaChipTemp = parseFloat(value.values[0]);
    });
    this.storage.get(segmentInfo.betaChipTempKey).subscribe((value) => {
      this.betaChipTemp = parseFloat(value.values[0]);
    });
    this.storage.get(segmentInfo.voltageKey).subscribe((value) => {
      this.voltage = parseFloat(value.values[0]);
    });
  };

  /**
   * Opens the segment page for the current segment.
   */
  openSegmentPage = () => {
    this.router.navigate([appRoutes.bmsSegmentViewRoute(this.segmentNumber())]);
  };

  getRelevantKeys = (): SegmentInfo => {
    return segmentInfoMap[this.segmentNumber()];
  };
}
