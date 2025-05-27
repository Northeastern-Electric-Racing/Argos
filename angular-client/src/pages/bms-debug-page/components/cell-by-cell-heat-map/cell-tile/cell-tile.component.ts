import { Component, input } from '@angular/core';
import TypographyComponent from 'src/components/typography/typography.component';
import { HeatMapView } from 'src/services/heat-map.service';

@Component({
  selector: 'cell-tile',
  templateUrl: './cell-tile.component.html',
  styleUrl: './cell-tile.component.css',
  standalone: true,
  imports: [TypographyComponent]
})
export class CellTileComponent {
  value = input<number | undefined>();
  color = input.required<string>();
  currentView = input<HeatMapView>();
  boxShadowColor = input<boolean>(false);
  sevenBoxLayout = input<boolean>(false);
  upperTitle = input<string | undefined>();
  boleanValue = input<boolean | undefined>();

  getDisplayValue = () => {
    if (this.boleanValue() !== undefined) {
      return this.boleanValue() ? 'YES' : 'NO';
    }
    const value = this.value();
    const view = this.currentView();
    const symbol = view === undefined ? '' : view === HeatMapView.Temperature ? '°' : 'ⱽ';
    return (value === undefined ? '-' : value.toFixed(2).toString()) + symbol;
  };

  getAdditionalStyles = () => {
    const sevenBoxLayout = this.sevenBoxLayout() ? 'fontSize: 2.4vw; color: #2C2C2C; ' : 'fontSize: 2vw; color: #2C2C2C; ';
    const addMargin = this.boleanValue() === undefined ? 'padding-left: 10px' : '';

    return sevenBoxLayout + addMargin;
  };
}
