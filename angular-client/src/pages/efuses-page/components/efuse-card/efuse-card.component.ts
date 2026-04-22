import { Component, OnDestroy, OnInit, input, computed, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import Storage from 'src/services/storage.service';
import { decimalPipe } from 'src/utils/pipes.utils';
import { sendConfig } from 'src/api/car-command.api';
import { EFUSE_TOPICS } from '../../efuses-page.topics';
import { InfoBackgroundComponent } from '../../../../components/info-background/info-background.component';
import HStackComponent from 'src/components/hstack/hstack.component';
import VStackComponent from 'src/components/vstack/vstack.component';
import SevenSegmentDisplayComponent from '../seven-segment-display/seven-segment-display.component';
import IndicatorLightComponent from '../indicator-light/indicator-light.component';
import EfuseSwitchComponent, { EfuseSwitchState } from '../efuse-switch/efuse-switch.component';
import { LockButtonComponent } from '../lock-button/lock-button.component';
import { inject } from '@angular/core';

export type EfuseLockMode = 'Unlocked' | 'Unlockable' | 'Locked';

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
    HStackComponent,
    VStackComponent,
    SevenSegmentDisplayComponent,
    IndicatorLightComponent,
    EfuseSwitchComponent,
    LockButtonComponent
  ]
})
export default class EfuseCardComponent implements OnInit, OnDestroy {
  private storage = inject(Storage);
  private subscriptions: Subscription[] = [];

  private static readonly FIGURE_SPACE = '\u2007';

  private static readonly EFUSE_KEY_FALLBACK: keyof typeof EFUSE_TOPICS.VCU.eFuses = 'Dashboard';

  // ── Common inputs (required for every eFuse card) ──
  efuseName = input.required<string>();
  efuseTopicKey = input.required<keyof typeof EFUSE_TOPICS.VCU.eFuses>();
  stateDataType = input<string | undefined>(undefined);
  controlStateDataType = input<string | undefined>(undefined);
  commandKey = input<string | null>(null);
  adcDataType = input<string | undefined>(undefined);
  voltageDataType = input<string | undefined>(undefined);
  currentDataType = input<string | undefined>(undefined);
  faultedDataType = input<string | undefined>(undefined);
  enabledDataType = input<string | undefined>(undefined);
  maxCurrent = input.required<string>();

  // ── Optional AUTO-mode inputs (Type 2 cards only) ──
  // When `autoDataType` is provided the card becomes Type 2:
  //   • The switch gains an AUTO button.
  //   • A small seven-segment display shows the controlling telemetry value.
  autoDataType = input<string | undefined>(undefined);
  autoLabel = input<string>('Auto Value');
  autoUnit = input<string>('°C');
  autoDigits = input<number>(3);
  autoDecimals = input<number>(1);
  notice = input<string>(''); // Component param allowing you to put a note/warning/etc, in the top-right corner of the card.
  lockMode = input<EfuseLockMode>('Unlockable');

  // ── Shared seven-segment display inputs ──
  readonly largeDisplayFontSize: number = 80;
  readonly largeDisplayUnitFontSize: number = 30;

  readonly smallDisplayFontSize: number = 40;
  readonly smallDisplayUnitFontSize: number = 20;
  readonly smallDisplayPaddingTop: number = 10;
  readonly smallDisplayPaddingRight: number = 12;
  readonly smallDisplayPaddingBottom: number = 4;
  readonly smallDisplayPaddingLeft: number = 12;

  readonly controlDisplayFontSize: number = 14;
  readonly controlDisplayPaddingTop: number = 6;
  readonly controlDisplayPaddingRight: number = 10;
  readonly controlDisplayPaddingBottom: number = 4;
  readonly controlDisplayPaddingLeft: number = 10;

  // ── Locking state ──
  isLocked = signal<boolean>(true);

  effectivelyLocked = computed(() => {
    const mode = this.lockMode();
    if (mode === 'Unlocked') return false;
    if (mode === 'Locked') return true;
    return this.isLocked();
  });

  /** Whether this card supports AUTO mode (Type 2) */
  hasAutoMode = computed(() => this.autoDataType() !== undefined);

  /** Derived topic bundle for this eFuse key */
  private efuseTopicBundle = computed(() => {
    const key = this.efuseTopicKey() ?? EfuseCardComponent.EFUSE_KEY_FALLBACK;
    return EFUSE_TOPICS.VCU.eFuses[key];
  });

  /** Derived Calypso command topic for this eFuse key */
  private efuseCommandTopic = computed(() => {
    const key = this.efuseTopicKey() ?? EfuseCardComponent.EFUSE_KEY_FALLBACK;
    return EFUSE_TOPICS.Calypso.eFuse_Commands[key];
  });

  private resolvedStateDataType = computed(() => this.stateDataType() ?? this.efuseCommandTopic());
  private resolvedControlStateDataType = computed(
    () => this.controlStateDataType() ?? this.efuseTopicBundle().Control_State
  );
  private resolvedAdcDataType = computed(() => this.adcDataType() ?? this.efuseTopicBundle().ADC);
  private resolvedVoltageDataType = computed(() => this.voltageDataType() ?? this.efuseTopicBundle().Voltage);
  private resolvedCurrentDataType = computed(() => this.currentDataType() ?? this.efuseTopicBundle().Current);
  private resolvedFaultedDataType = computed(() => this.faultedDataType() ?? this.efuseTopicBundle().Faulted);
  private resolvedEnabledDataType = computed(() => this.enabledDataType() ?? this.efuseTopicBundle().Enabled);

  /** The command key to send to Calypso (falls back to efuseName) */
  resolvedCommandKey = computed(() => this.commandKey() ?? this.efuseName());

  /** The switch options passed to <efuse-switch> */
  switchOptions = computed<EfuseSwitchState[]>(() => {
    const includeAuto = this.hasAutoMode() || this.switchState() === 'AUTO';
    return includeAuto ? ['ON', 'OFF', 'AUTO'] : ['ON', 'OFF'];
  });

  // ── Data properties ──
  adcRaw: number = 0;
  voltage: number = 0;
  current: number = 0;
  isFaulted: boolean = false;
  isEnabled: boolean = false;
  autoValue: number = 0;
  switchState = signal<EfuseSwitchState>('OFF');
  controlStateDisplay = signal<string>('Null');

  ngOnInit() {
    // Subscribe to ADC raw data
    this.subscriptions.push(
      this.storage.get(this.resolvedAdcDataType()).subscribe((value) => {
        this.adcRaw = parseInt(value.values[0]);
      })
    );

    // Subscribe to voltage data
    this.subscriptions.push(
      this.storage.get(this.resolvedVoltageDataType()).subscribe((value) => {
        this.voltage = decimalPipe(value.values[0], 2);
      })
    );

    // Subscribe to current data
    this.subscriptions.push(
      this.storage.get(this.resolvedCurrentDataType()).subscribe((value) => {
        this.current = decimalPipe(value.values[0], 2);
      })
    );

    // Subscribe to faulted status
    this.subscriptions.push(
      this.storage.get(this.resolvedFaultedDataType()).subscribe((value) => {
        this.isFaulted = Number(value.values[0]) === 1;
      })
    );

    // Subscribe to enabled status
    this.subscriptions.push(
      this.storage.get(this.resolvedEnabledDataType()).subscribe((value) => {
        this.isEnabled = Number(value.values[0]) === 1;
      })
    );

    // Subscribe to VCU control state (0=ON, 1=AUTO, 2=OFF)
    this.subscriptions.push(
      this.storage.get(this.resolvedControlStateDataType()).subscribe((value) => {
        const raw = Number(value.values[0]);
        if (Number.isNaN(raw)) return;
        this.controlStateDisplay.set(this.formatControlState(raw));
      })
    );

    // Subscribe to Calypso eFuse state (0=ON, 1=AUTO, 2=OFF)
    this.subscriptions.push(
      this.storage.get(this.resolvedStateDataType()).subscribe((value) => {
        const raw = Number(value.values[0]);
        if (Number.isNaN(raw)) return;
        if (raw === 0) this.switchState.set('ON');
        if (raw === 1) this.switchState.set('AUTO');
        if (raw === 2) this.switchState.set('OFF');
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
    if (this.effectivelyLocked()) return;
    const payload = state === 'ON' ? 0 : state === 'AUTO' ? 1 : 2;
    sendConfig(this.resolvedCommandKey(), [payload]).catch((error) => {
      console.error(`Failed to send ${this.efuseName()} command`, error);
    });
    if (this.lockMode() === 'Unlockable') {
      this.lockEfuse();
    }
  }

  onLockButtonClick(): void {
    if (this.isLocked()) {
      this.isLocked.set(false);
      return;
    }

    this.lockEfuse();
  }

  lockEfuse(): void {
    this.isLocked.set(true);
  }

  private formatControlState(raw: number): string {
    const pad = EfuseCardComponent.FIGURE_SPACE;
    if (raw === 0) return `${pad}On${pad}`;
    if (raw === 1) return 'Auto';
    if (raw === 2) return `${pad}OFF`;
    return 'Null';
  }
}
