import { Component, OnDestroy, OnInit, input } from '@angular/core';
import { Subscription } from 'rxjs';
import Storage from 'src/services/storage.service';
import { DataTypeEnum } from 'src/data-type.enum';
import { decimalPipe } from 'src/utils/pipes.utils';
import { InfoBackgroundComponent } from '../../../../components/info-background/info-background.component';
import TypographyComponent from 'src/components/typography/typography.component';
import HStackComponent from 'src/components/hstack/hstack.component';
import VStackComponent from 'src/components/vstack/vstack.component';
import SevenSegmentDisplayComponent from '../seven-segment-display/seven-segment-display.component';
import { inject } from '@angular/core';

/**
 * Component to display individual eFuse status
 */
@Component({
  selector: 'efuse-card',
  templateUrl: './efuse-card.component.html',
  styleUrls: ['./efuse-card.component.css'],
  standalone: true,
  imports: [
    InfoBackgroundComponent,
    TypographyComponent,
    HStackComponent,
    VStackComponent,
    SevenSegmentDisplayComponent
  ]
})
export default class EfuseCardComponent implements OnInit, OnDestroy {
  private storage = inject(Storage);
  private subscriptions: Subscription[] = [];

  // Input properties for customization
  efuseName = input.required<string>();
  adcDataType = input.required<DataTypeEnum>();
  voltageDataType = input.required<DataTypeEnum>();
  currentDataType = input.required<DataTypeEnum>();
  faultedDataType = input.required<DataTypeEnum>();
  enabledDataType = input.required<DataTypeEnum>();
  maxCurrent = input.required<string>(); // Max current for the specific eFuse.

  // Data properties
  adcRaw: number = 0;
  voltage: number = 0;
  current: number = 0;
  isFaulted: boolean = false;
  isEnabled: boolean = false;

  ngOnInit() {
    // Subscribe to ADC raw data
    this.subscriptions.push(
      this.storage.get(this.adcDataType()).subscribe((value) => {
        this.adcRaw = parseInt(value.values[0]);
      })
    );

    // Subscribe to voltage data
    this.subscriptions.push(
      this.storage.get(this.voltageDataType()).subscribe((value) => {
        this.voltage = decimalPipe(value.values[0], 2);
      })
    );

    // Subscribe to current data
    this.subscriptions.push(
      this.storage.get(this.currentDataType()).subscribe((value) => {
        this.current = decimalPipe(value.values[0], 2);
      })
    );

    // Subscribe to faulted status
    this.subscriptions.push(
      this.storage.get(this.faultedDataType()).subscribe((value) => {
        this.isFaulted = Number(value.values[0]) === 1;
      })
    );

    // Subscribe to enabled status
    this.subscriptions.push(
      this.storage.get(this.enabledDataType()).subscribe((value) => {
        this.isEnabled = Number(value.values[0]) === 1;
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  getStatusColor(): string {
    if (this.isFaulted) return '#ef4444'; // Red for fault
    if (this.isEnabled) return '#22c55e'; // Green for enabled
    return '#6b7280'; // Gray for disabled
  }

  getStatusText(): string {
    if (this.isFaulted) return 'FAULTED';
    if (this.isEnabled) return 'ENABLED';
    return 'DISABLED';
  }
}
