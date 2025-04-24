import { Component, effect, inject, input, OnInit } from '@angular/core';
import { Segment } from 'src/utils/bms.utils';
import { Subscription } from 'rxjs';
import { HeatMapService, HeatMapView } from 'src/services/heat-map.service';
import { AlphaCells, BetaCells, CellReading, CellService } from 'src/services/cell.service';
import { DropdownOption, SelectorConfig } from 'src/components/select-dropdown/select-dropdown.component';

@Component({
  selector: 'cell-by-cell-heat-map',
  templateUrl: './cell-by-cell-heat-map.component.html',
  styleUrl: './cell-by-cell-heat-map.component.css'
})
export class CellByCellHeatMapComponent implements OnInit {
  private cellService = inject(CellService);
  private heatMapService = inject(HeatMapService);
  currentSegment = input.required<Segment>();
  alphaSubscriptions: Subscription[] = [];
  betaSubscriptions: Subscription[] = [];
  alphaCells!: Readonly<AlphaCells>;
  betaCells!: Readonly<BetaCells>;
  view = HeatMapView.Voltage;
  selectedCell: CellReading | undefined = undefined;
  cellViewSelectOptions: DropdownOption[] = [
    {
      name: HeatMapView.Temperature.toString(),
      function: () => {
        this.view = HeatMapView.Temperature;
        this.heatMapService.setCurrentView(this.currentSegment(), HeatMapView.Temperature);
      }
    },
    {
      name: HeatMapView.Voltage.toString(),
      function: () => {
        this.view = HeatMapView.Voltage;
        this.heatMapService.setCurrentView(this.currentSegment(), HeatMapView.Voltage);
      }
    }
  ];
  selectorConfig: SelectorConfig = {
    options: this.cellViewSelectOptions,
    placeholder: 'Change View'
  };

  constructor() {
    effect(() => {
      this.alphaCells = this.cellService.getAlphaCellsBySegment(this.currentSegment());
      this.betaCells = this.cellService.getBetaCellsBySegment(this.currentSegment());
    });
  }

  ngOnInit(): void {
    this.alphaCells = this.cellService.getAlphaCellsBySegment(this.currentSegment());
    this.betaCells = this.cellService.getBetaCellsBySegment(this.currentSegment());
  }
  getTempColor = (value: number | undefined) => {
    if (value === undefined) {
      return 'grey';
    }

    // Math: red is 0 so when the value we have red, when the value is 45 we have bright green,
    // and increase slowly from 0... to 120 by 8 increments transitioning from green -> red.
    const hslMainValue = Math.min(Math.max(55 - value, 0) * 6, 120);

    return `hsl(${hslMainValue}, 100%, 50%)`;
  };

  getVoltColor = (value: number | undefined) => {
    if (value === undefined) {
      return 'grey';
    }
    // Math: red is 0 so when the value we have red, when the value is 45 we have bright green,
    // and increase slowly from 0... to 120 by 8 increments transitioning from green -> red.
    const hslMainValue = Math.min(Math.max(4 - value, 0) * 100, 120);

    return `hsl(${hslMainValue}, 100%, 50%)`;
  };

  cellClicked = (cell: CellReading) => {
    this.selectedCell = cell;
    this.heatMapService.setSelectedCell(cell);
  };

  isSelectedCell = (cell: CellReading) => {
    return this.selectedCell === cell;
  };

  averageVoltCellPair = (reading: CellReading): number | undefined => {
    const { volt1, volt2 } = reading;

    if (volt1 === undefined) {
      return volt2;
    } else if (volt2 === undefined) {
      return volt1;
    }

    return (volt1 + volt2) / 2;
  };
}
