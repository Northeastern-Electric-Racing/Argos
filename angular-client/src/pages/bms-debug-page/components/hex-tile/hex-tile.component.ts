import { Component, input, computed } from '@angular/core';
import { HeatMapView } from 'src/services/heat-map.service';

@Component({
  selector: 'hex-tile',
  templateUrl: './hex-tile.component.html',
  styleUrl: './hex-tile.component.css',
  standalone: true
})
export class HexTileComponent {
  value = input<number | undefined>();
  booleanValue = input<boolean | undefined>();
  color = input.required<string>();
  currentView = input<HeatMapView>();
  boxShadowColor = input<boolean>(false);
  cellNumber = input<string | undefined>();

  displayValue = computed(() => {
    if (this.booleanValue() !== undefined) {
      return this.booleanValue() ? 'YES' : 'NO';
    }
    const value = this.value();
    return value === undefined ? '-' : value.toFixed(2);
  });

  unitLabel = computed(() => {
    if (this.booleanValue() !== undefined) return '';
    const view = this.currentView();
    if (view === HeatMapView.Temperature) return '°C';
    if (view === HeatMapView.Voltage) return 'V';
    return '';
  });
}
