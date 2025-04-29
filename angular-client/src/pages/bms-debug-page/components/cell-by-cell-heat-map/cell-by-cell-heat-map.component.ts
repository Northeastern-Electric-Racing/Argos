import { Component, effect, inject, input, OnInit } from '@angular/core';
import { Segment } from 'src/utils/bms.utils';
import { Subscription } from 'rxjs';
import { HeatMapService, HeatMapView } from 'src/services/heat-map.service';
import { AlphaCells, BetaCells, CellReading, CellService } from 'src/services/cell.service';
import { DropdownOption, SelectorConfig } from 'src/components/select-dropdown/select-dropdown.component';
import { DialogService } from 'primeng/dynamicdialog';
import { CellViewComponent } from '../cell-view/cell-view.component';

@Component({
  selector: 'cell-by-cell-heat-map',
  templateUrl: './cell-by-cell-heat-map.component.html',
  styleUrl: './cell-by-cell-heat-map.component.css'
})
export class CellByCellHeatMapComponent implements OnInit {
  private cellService = inject(CellService);
  private heatMapService = inject(HeatMapService);
  private dialogService = inject(DialogService);
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

  getTitle = () => {
    const segment = this.currentSegment();
    const title = 'Segment ' + (segment + 1) + ': Cell-by-Cell';
    return title;
  };

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
    // Math: red at 3.0V or lower, green at 3.6V or higher, with a gradient in between
    const hslMainValue = Math.min(Math.max((value - 3.0) * 200, 0), 120);

    return `hsl(${hslMainValue}, 100%, 50%)`;
  };

  cellClicked = (cell: CellReading) => {
    this.selectedCell = cell;
    this.heatMapService.setSelectedCell(cell);
    this.openCellView();
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

  // open cell-view dialog
  openCellView = () => {
    // use selected cell to open cell view
    if (this.selectedCell) {
      const cellView = this.dialogService.open(CellViewComponent, {
        data: {
          forSegment: this.currentSegment()
        },
        width: '40%',
        draggable: true,
        closable: true,
        closeAriaLabel: 'Close'
      });
      cellView.onClose.subscribe(() => {
        this.selectedCell = undefined;
      });
    }
  };
}
