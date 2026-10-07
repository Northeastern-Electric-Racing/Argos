import { Component, inject, input, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
export class SegmentSummaryComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
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

    this.storage
      .get(segmentInfo.segmentTempKey)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.temperature = parseFloat(value.values[0]);
      });
    this.storage
      .get(segmentInfo.alphaChipTempKey)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.alphaChipTemp = parseFloat(value.values[0]);
      });
    this.storage
      .get(segmentInfo.betaChipTempKey)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.betaChipTemp = parseFloat(value.values[0]);
      });
    this.storage
      .get(segmentInfo.voltageKey)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
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
    return segmentInfo(this.segmentNumber());
  };
}
