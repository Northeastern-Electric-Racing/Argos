import { Component, input, OnChanges, OnInit } from '@angular/core';

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
  styleUrl: './info-value-display.component.css'
})
export class InfoValueDisplayComponent implements OnInit, OnChanges {
  ngOnChanges(): void {
    this.formattedValue = (this.value()?.toFixed(this.precision()) ?? '-') + (this.unit() === 'C' ? '°' : '');
  }
  containerStyle = input<string>('');
  valueUnitContainerStyle = input<string>('');
  value = input<number>();
  valueStyle = input<string>('');
  boolValue = input<boolean>();
  precision = input<number>(1);
  subtitle = input<string>('');
  subtitleStyle = input<string>('');
  unit = input<string>('');
  formattedValue = '-';

  // Consolidated widget input
  widget = input<WidgetConfig>();
  enableWidget = input<boolean>(true);

  ngOnInit(): void {
    console.log('Info Value Display');
  }

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
