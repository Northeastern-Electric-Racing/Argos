import { ChangeDetectionStrategy, Component, input, computed } from '@angular/core';
import { HeatMapView } from 'src/services/heat-map.service';

/** Maps each HeatMapView to its CSS modifier class suffix */
const VIEW_CLASS_MAP: Record<HeatMapView, string> = {
  [HeatMapView.Voltage]: 'view-voltage',
  [HeatMapView.SVolts]: 'view-voltage',
  [HeatMapView.Balancing]: 'view-balancing',
  [HeatMapView.Temperature]: 'view-temperature',
  [HeatMapView.CvsFailure]: 'view-flag',
  [HeatMapView.OpenWire]: 'view-flag'
};

/** Maps each HeatMapView to the unit label shown inside the hex */
const VIEW_UNIT_MAP: Record<HeatMapView, string> = {
  [HeatMapView.Voltage]: 'V',
  [HeatMapView.SVolts]: 'V',
  [HeatMapView.Temperature]: '°C',
  [HeatMapView.Balancing]: '',
  [HeatMapView.CvsFailure]: '',
  [HeatMapView.OpenWire]: ''
};

@Component({
  selector: 'hex-tile',
  templateUrl: './hex-tile.component.html',
  styleUrl: './hex-tile.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'variant()',
    '[class.selected-cell]': 'boxShadowColor()'
  }
})
export class HexTileComponent {
  variant = input<string>('');
  value = input<number | undefined>();
  booleanValue = input<boolean | undefined>();
  color = input.required<string>();
  currentView = input<HeatMapView>();
  boxShadowColor = input<boolean>(false);
  cellNumber = input<string | undefined>();

  viewClass = computed(() => {
    const view = this.currentView();
    const className = view ? VIEW_CLASS_MAP[view] : '';
    return className ? `hex-tile ${className}` : 'hex-tile';
  });

  displayValue = computed(() => {
    const boolValue = this.booleanValue();
    if (boolValue !== undefined) {
      const view = this.currentView();
      if (view === HeatMapView.CvsFailure || view === HeatMapView.OpenWire) return boolValue ? 'TRUE' : 'FALSE';
      return boolValue ? 'YES' : 'NO';
    }
    const value = this.value();
    return value === undefined ? '-' : value.toFixed(2);
  });

  unitLabel = computed(() => {
    if (this.booleanValue() !== undefined) return '';
    const view = this.currentView();
    return view ? VIEW_UNIT_MAP[view] : '';
  });
}
