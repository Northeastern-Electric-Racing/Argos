import { Component, HostListener, OnInit } from '@angular/core';
import { inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { allSegments, Chip, Segment } from 'src/utils/bms.utils';
import { MatGridList, MatGridTile } from '@angular/material/grid-list';
import { BmsHeaderComponent } from '../components/bms-header/bms-header.component';
import { SegmentAtAGlanceComponent } from '../components/segment-at-a-glance/segment-at-a-glance.component';
import { CellByCellHeatMapComponent } from '../components/cell-by-cell-heat-map/cell-by-cell-heat-map.component';
import { ChipDiagnosticsComponent } from '../components/chip-diagnostics/chip-diagnostics.component';
import { ChipFaultsComponent } from '../components/chip-faults/chip-faults.component';

@Component({
  selector: 'bms-segment-view',
  templateUrl: './bms-segment-view.component.html',
  styleUrl: './bms-segment-view.component.css',
  standalone: true,
  imports: [
    MatGridList,
    MatGridTile,
    BmsHeaderComponent,
    SegmentAtAGlanceComponent,
    CellByCellHeatMapComponent,
    ChipDiagnosticsComponent,
    ChipFaultsComponent
  ]
})
export class BmsSegmentViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private router = inject(Router);
  changeTitleSize = window.innerWidth < 1060;
  segmentId!: Segment;
  chipAlpha: Chip = Chip.Alpha;
  chipBeta: Chip = Chip.Beta;

  ngOnInit(): void {
    this.subscribeToSegmentID();
  }

  // Update view width
  @HostListener('window:resize', ['$event'])
  onResize() {
    this.changeTitleSize = window.innerWidth < 1060;
  }

  subscribeToSegmentID = () => {
    if (this.route.url.subscribe((url) => url.toString().includes('bms/segment'))) {
      this.route.paramMap.subscribe((params) => {
        const possibleSegId = Number(params.get('id')) - 1;
        allSegments.indexOf(possibleSegId) !== -1 ? (this.segmentId = possibleSegId) : this.router.navigate(['bms']);
      });
    } else {
      this.router.navigate(['bms']);
    }
  };
}
