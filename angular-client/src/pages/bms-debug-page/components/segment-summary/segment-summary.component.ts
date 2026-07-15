import { Component, inject, input, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { appRoutes } from 'src/app/app-routes';
import Storage from 'src/services/storage.service';
import { SegmentInfo, Segment, segmentInfo } from 'src/utils/bms.utils';
import { InfoBackgroundComponent } from '../../../../components/info-background/info-background.component';

import { InfoValueDisplayComponent } from '../../../../components/info-value-dispaly/info-value-display.component';
import { DividerComponent } from '../../../../components/divider/divider';
import { ToastButtonComponent } from '../../../../components/toast-button/toast-button.component';
import VStackComponent from 'src/components/vstack/vstack.component';

@Component({
  selector: 'segment-summary',
  templateUrl: './segment-summary.component.html',
  styleUrl: './segment-summary.component.css',
  standalone: true,
  imports: [InfoBackgroundComponent, InfoValueDisplayComponent, DividerComponent, ToastButtonComponent, VStackComponent]
})
export class SegmentSummaryComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private storage = inject(Storage);
  private subscriptions: Subscription[] = [];
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

    this.subscriptions.push(
      this.storage.get(segmentInfo.segmentTempKey).subscribe((value) => {
        this.temperature = parseFloat(value.values[0]);
      }),
      this.storage.get(segmentInfo.alphaChipTempKey).subscribe((value) => {
        this.alphaChipTemp = parseFloat(value.values[0]);
      }),
      this.storage.get(segmentInfo.betaChipTempKey).subscribe((value) => {
        this.betaChipTemp = parseFloat(value.values[0]);
      }),
      this.storage.get(segmentInfo.voltageKey).subscribe((value) => {
        this.voltage = parseFloat(value.values[0]);
      })
    );
  };

  /**
   * Opens the segment page for the current segment.
   */
  openSegmentPage = () => {
    this.router.navigate([appRoutes.bmsSegmentViewRoute(this.segmentNumber())]);
  };

  getRelevantKeys = (): SegmentInfo => {
    return segmentInfo(this.segmentNumber());
  };

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
