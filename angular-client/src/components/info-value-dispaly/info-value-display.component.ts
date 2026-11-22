import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { formatDisplayValue } from 'src/utils/pipes.utils';
import { tw } from 'src/ui/recipes/tw';
import { BatteryPercentageComponent } from '../battery-percentage/battery-percentage.component';
import { ConnectionDotWithMessageComponent } from '../connection-dot-with-message/connection-dot-with-message.component';
import TypographyComponent from '../typography/typography.component';
import ThermometerComponent from '../thermometer/thermometer.component';
import HStackComponent from '../hstack/hstack.component';
import VStackComponent from '../vstack/vstack.component';

export interface ThermometerConfig {
  type: 'thermometer-config';
  currentValue: number;
  min: number;
  max: number;
}

export interface BatteryConfig {
  type: 'battery-config';
  percentage: number;
  height: number;
  width: number;
}

export interface ConnectionDotConfig {
  type: 'connection-dot-config';
  getStatusColor: () => string;
  getStatusMessage?: () => string;
}

export type WidgetConfig = ThermometerConfig | BatteryConfig | ConnectionDotConfig;

@Component({
  selector: 'info-value-display',
  templateUrl: './info-value-display.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    BatteryPercentageComponent,
    ConnectionDotWithMessageComponent,
    TypographyComponent,
    ThermometerComponent,
    HStackComponent,
    VStackComponent
  ]
})
export class InfoValueDisplayComponent {
  containerStyle = input<string>('');
  valueUnitContainerStyle = input<string>('');
  value = input<number>();
  valueStyle = input<string>('');
  boolValue = input<boolean>();
  precision = input<number>(1);
  subtitle = input<string>('');
  subtitleStyle = input<string>('');
  unit = input<string>('');
  unitStyle = input<string>('');

  formattedValue = computed(() => formatDisplayValue(this.value(), this.precision(), this.unit()));

  // Consolidated widget input
  widget = input<WidgetConfig>();
  enableWidget = input<boolean>(true);

  getStatusMessage = (connectDotConfig: ConnectionDotConfig): (() => string) => {
    return connectDotConfig.getStatusMessage ? connectDotConfig.getStatusMessage : () => '';
  };

  /** A value with no unit row sits lower, so its subtitle gets a 1vh gap. */
  protected subtitleClass = computed(() => (this.unit() === '' && this.boolValue() === undefined ? tw('m-0 mt-[1vh]') : ''));
}
