import { Component, input } from '@angular/core';
import { BatteryLevelIndicatorComponent } from '../battery-level-indicator/battery-level-indicator.component';
import { ConnectionDotWithMessageComponent } from '../connection-dot-with-message/connection-dot-with-message.component';
import { GlanceThermometerComponent } from '../glance-thermometer/glance-thermometer.component';
import { StatDisplayComponent } from '../stat-display/stat-display.component';

export type StatDisplayWidgetType = 'connection-dot' | 'thermometer' | 'battery-level-indicator';

export interface StatDisplayWidgetConfig {
  type: StatDisplayWidgetType;
  min?: number;
  max?: number;
  value?: number;
  getStatusColor?: () => string;
}

export interface StatDisplayListConfig {
  key: string;
  value: number | undefined;
  unit: string;
  subtitle: string;
  precision?: number;
  unitBelow?: boolean;
  headerLabel?: string;
  headerIcon?: string;
  widget?: StatDisplayWidgetConfig;
}

@Component({
  selector: 'stat-display-list',
  templateUrl: './stat-display-list.component.html',
  styleUrl: './stat-display-list.component.css',
  standalone: true,
  imports: [
    StatDisplayComponent,
    ConnectionDotWithMessageComponent,
    GlanceThermometerComponent,
    BatteryLevelIndicatorComponent
  ]
})
export class StatDisplayListComponent {
  configs = input<StatDisplayListConfig[]>([]);
  enableWidgets = input<boolean>(true);

  defaultStatusColor = (): string => {
    return 'var(--color-text-subtitle)';
  };
}
