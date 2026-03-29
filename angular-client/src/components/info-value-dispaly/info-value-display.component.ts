import { Component, computed, input } from '@angular/core';
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
  styleUrl: './info-value-display.component.css',
  standalone: true,
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

  formattedValue = computed(() => {
    return (this.value()?.toFixed(this.precision()) ?? '-') + (this.unit() === 'C' ? '°' : '');
  });

  // Consolidated widget input
  widget = input<WidgetConfig>();
  enableWidget = input<boolean>(true);

  getStatusMessage = (connectDotConfig: ConnectionDotConfig): (() => string) => {
    return connectDotConfig.getStatusMessage ? connectDotConfig.getStatusMessage : () => '';
  };

  getSubtitleStyle = (): string => {
    if (this.unit() === '' && this.boolValue() === undefined) {
      return this.subtitleStyle() + 'margin-top: 1vh';
    }
    return this.subtitleStyle();
  };
}
