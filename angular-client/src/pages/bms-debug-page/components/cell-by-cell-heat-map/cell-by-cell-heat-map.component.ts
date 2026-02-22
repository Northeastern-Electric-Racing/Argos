import { Component, effect, inject, input, OnInit } from '@angular/core';
import { Segment } from 'src/utils/bms.utils';
import { HeatMapService, HeatMapView } from 'src/services/heat-map.service';
import { CellReading, CellService } from 'src/services/cell.service';
import { DropdownOption, SelectorConfig } from 'src/components/select-dropdown/select-dropdown.component';
import { DialogService } from 'primeng/dynamicdialog';
import { CellViewComponent } from '../cell-view/cell-view.component';
import { InfoBackgroundComponent } from '../../../../components/info-background/info-background.component';
import { CellTileComponent } from './cell-tile/cell-tile.component';
import HStackComponent from 'src/components/hstack/hstack.component';

const formatAllSelectorName = (name: string) => {
  return 'Set ALL Maps: ' + name;
};

@Component({
  selector: 'cell-by-cell-heat-map',
  templateUrl: './cell-by-cell-heat-map.component.html',
  styleUrl: './cell-by-cell-heat-map.component.css',
  standalone: true,
  imports: [InfoBackgroundComponent, CellTileComponent, HStackComponent]
})
export class CellByCellHeatMapComponent implements OnInit {
  private cellService = inject(CellService);
  private heatMapService = inject(HeatMapService);
  private dialogService = inject(DialogService);
  currentSegment = input.required<Segment>();
  alphaCells!: Readonly<CellReading[]>;
  betaCells!: Readonly<CellReading[]>;
  view = HeatMapView.Voltage;
  selectedCell: CellReading | undefined = undefined;
  cellViewSelectOptions: DropdownOption[] = [
    {
      name: HeatMapView.Temperature.toString(),
      function: () => {
        this.heatMapService.setCurrentView(this.currentSegment(), HeatMapView.Temperature);
      }
    },
    {
      name: HeatMapView.Voltage.toString(),
      function: () => {
        this.heatMapService.setCurrentView(this.currentSegment(), HeatMapView.Voltage);
      }
    },
    {
      name: HeatMapView.Balancing.toString(),
      function: () => {
        this.heatMapService.setCurrentView(this.currentSegment(), HeatMapView.Balancing);
      }
    }
  ];
  currentSegmentSelectorConfig: SelectorConfig = {
    options: this.cellViewSelectOptions,
    placeholder: 'Change View'
  };
  allSegSelectorConfig: SelectorConfig = {
    options: this.cellViewSelectOptions.map((option) => ({
      name: formatAllSelectorName(option.name),
      function: () => {
        this.heatMapService.setAllSegViews(option.name as HeatMapView);
      }
    })),
    placeholder: 'Change ALL Segments'
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
    this.heatMapService.getCurrentView(this.currentSegment())?.subscribe((view) => {
      this.view = view;
      this.allSegSelectorConfig = {
        ...this.allSegSelectorConfig,
        defaultValue: view !== undefined ? formatAllSelectorName(view.toString()) : 'Change ALL Segments'
      };
      this.currentSegmentSelectorConfig = {
        ...this.currentSegmentSelectorConfig,
        defaultValue: view !== undefined ? view : 'Change View'
      };
    });
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

  getBalancingColor = (value: boolean | undefined) => {
    if (value === undefined) {
      return 'grey';
    }
    // Math: red is false, green is true
    return value ? '#4169e1' : 'yellow';
  };

  cellClicked = (cell: CellReading) => {
    this.selectedCell = cell;
    this.heatMapService.setSelectedCell(cell);
    this.openCellView();
  };

  isSelectedCell = (cell: CellReading) => {
    return this.selectedCell === cell;
  };

  getCellVoltage = (reading: CellReading): number | undefined => {
    return reading.voltage;
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
