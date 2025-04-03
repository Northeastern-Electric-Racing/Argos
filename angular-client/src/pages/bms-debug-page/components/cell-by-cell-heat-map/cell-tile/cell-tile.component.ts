import { Component, input } from '@angular/core';
import { HeatMapView } from 'src/services/heat-map.service';

@Component({
  selector: 'cell-tile',
  templateUrl: './cell-tile.component.html',
  styleUrl: './cell-tile.component.css'
})
export class CellTileComponent {
  value = input.required<number | undefined>();
  color = input.required<string>();
  currentView = input<HeatMapView>();
  boxShadowColor = input<string>();

  getDisplayValue = () => {
    const value = this.value();
    const view = this.currentView();
    const symbol = view === undefined ? '' : view === HeatMapView.Temperature ? '°' : 'ⱽ';
    return (value === undefined ? '-' : value.toFixed(1).toString()) + symbol;
  };

  getBoxShadowStyle = () => {
    const color = this.boxShadowColor();
    return `0px 0px 15px ${color}`;
  };
}
