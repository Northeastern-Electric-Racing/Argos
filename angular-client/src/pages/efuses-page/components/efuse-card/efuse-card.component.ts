import { Component, OnDestroy, OnInit, input, computed } from '@angular/core';
import { Subscription } from 'rxjs';
import Storage from 'src/services/storage.service';
import { DataTypeEnum } from 'src/data-type.enum';
import { decimalPipe } from 'src/utils/pipes.utils';
import { InfoBackgroundComponent } from '../../../../components/info-background/info-background.component';
import TypographyComponent from 'src/components/typography/typography.component';
import HStackComponent from 'src/components/hstack/hstack.component';
import VStackComponent from 'src/components/vstack/vstack.component';
import SevenSegmentDisplayComponent from '../seven-segment-display/seven-segment-display.component';
import IndicatorLightComponent from '../indicator-light/indicator-light.component';
import EfuseSwitchComponent, { EfuseSwitchState } from '../efuse-switch/efuse-switch.component';
import { inject } from '@angular/core';

/**
 * Component to display individual eFuse status.
 *
 * Supports two card types:
 *  - Type 1 (ON / OFF only): leave the auto-mode inputs empty.
 *  - Type 2 (ON / OFF / AUTO): provide `autoDataType`, `autoLabel`,
 *    and `autoUnit` to enable the AUTO option and show a small
 *    seven-segment display for the telemetry value that controls the
 *    eFuse's state in AUTO mode.
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
    SevenSegmentDisplayComponent,
    IndicatorLightComponent,
    EfuseSwitchComponent
  ]
})
export default class EfuseCardComponent implements OnInit, OnDestroy {
  private storage = inject(Storage);
  private subscriptions: Subscription[] = [];

  // ── Common inputs (required for every eFuse card) ──
  efuseName = input.required<string>();
  adcDataType = input.required<DataTypeEnum>();
  voltageDataType = input.required<DataTypeEnum>();
  currentDataType = input.required<DataTypeEnum>();
  faultedDataType = input.required<DataTypeEnum>();
  enabledDataType = input.required<DataTypeEnum>();
  maxCurrent = input.required<string>();

  // ── Optional AUTO-mode inputs (Type 2 cards only) ──
  // When `autoDataType` is provided the card becomes Type 2:
  //   • The switch gains an AUTO button.
  //   • A small seven-segment display shows the controlling telemetry value.
  autoDataType = input<DataTypeEnum | undefined>(undefined);
  autoLabel = input<string>('Auto Value');
  autoUnit = input<string>('°C');
  autoDigits = input<number>(3);
  autoDecimals = input<number>(1);

  /** Whether this card supports AUTO mode (Type 2) */
  hasAutoMode = computed(() => this.autoDataType() !== undefined);

  /** The switch options passed to <efuse-switch> */
  switchOptions = computed<EfuseSwitchState[]>(() =>
    this.hasAutoMode() ? ['ON', 'OFF', 'AUTO'] : ['ON', 'OFF']
  );

  // ── Data properties ──
  adcRaw: number = 0;
  voltage: number = 0;
  current: number = 0;
  isFaulted: boolean = false;
  isEnabled: boolean = false;
  autoValue: number = 0;

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

    // Subscribe to the AUTO-mode telemetry value (Type 2 cards only)
    const autoDT = this.autoDataType();
    if (autoDT !== undefined) {
      this.subscriptions.push(
        this.storage.get(autoDT).subscribe((value) => {
          this.autoValue = decimalPipe(value.values[0], this.autoDecimals());
        })
      );
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  getStatusColor(): string {
    if (this.isFaulted) return '#ef4444';
    if (this.isEnabled) return '#22c55e';
    return '#6b7280';
  }

  getStatusText(): string {
    if (this.isFaulted) return 'FAULTED';
    if (this.isEnabled) return 'ENABLED';
    return 'DISABLED';
  }

  /** Handle switch state change — sends the appropriate CAN message */
  onSwitchStateChange(state: EfuseSwitchState): void {
    // TODO: send CAN message based on efuse name and selected state
    console.log(`[${this.efuseName()}] switch → ${state}`);
  }
}
