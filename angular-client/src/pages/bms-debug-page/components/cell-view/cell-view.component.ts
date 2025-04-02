import { Component, inject, OnInit } from '@angular/core';
import { CellReading } from 'src/services/cell.service';
import { HeatMapService } from 'src/services/heat-map.service';

@Component({
  selector: 'cell-view',
  templateUrl: './cell-view.component.html',
  styleUrl: './cell-view.component.css'
})
export class CellViewComponent implements OnInit {
  private heatMapService = inject(HeatMapService);
  cellViewData: CellReading | undefined = undefined;
  ngOnInit(): void {
    this.heatMapService.getSelectedCell().subscribe((data) => {
      this.cellViewData = data;
    });
  }
}
