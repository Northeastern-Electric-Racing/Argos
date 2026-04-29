import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { allSegments, Chip, Segment } from 'src/utils/bms.utils';
import { MatGridList, MatGridTile } from '@angular/material/grid-list';
import { BmsHeaderComponent } from '../components/bms-header/bms-header.component';
import { SegmentAtAGlanceComponent } from '../components/segment-at-a-glance/segment-at-a-glance.component';
import { SegmentHeatmapComponent } from '../components/segment-heatmap/segment-heatmap.component';
import { ChipDiagnosticsComponent } from '../components/chip-diagnostics/chip-diagnostics.component';
import { ChipFaultsComponent } from '../components/chip-faults/chip-faults.component';
import { InfoBackgroundComponent } from '../../../components/info-background/info-background.component';
import { DropdownOption, SelectorConfig } from 'src/components/select-dropdown/select-dropdown.component';
import { HeatMapService, HeatMapView } from 'src/services/heat-map.service';

const formatAllSelectorName = (name: string) => {
  return 'Set ALL Maps: ' + name;
};

@Component({
  selector: 'bms-segment-view',
  templateUrl: './bms-segment-view.component.html',
  styleUrl: './bms-segment-view.component.css',
  host: {
    '(window:resize)': 'onResize()'
  },
  imports: [
    MatGridList,
    MatGridTile,
    BmsHeaderComponent,
    SegmentAtAGlanceComponent,
    SegmentHeatmapComponent,
    InfoBackgroundComponent,
    ChipDiagnosticsComponent,
    ChipFaultsComponent
  ]
})
/**
 * Detail page for a single battery segment.
 * Displays a full-size heatmap, chip diagnostics, and chip faults.
 * Implements OnDestroy for proper RxJS subscription cleanup.
 */
export class BmsSegmentViewComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private router = inject(Router);
  private heatMapService = inject(HeatMapService);
  private subscriptions: Subscription[] = [];
  changeTitleSize = window.innerWidth < 1060;
  segmentId!: Segment;
  chipAlpha: Chip = Chip.Alpha;
  chipBeta: Chip = Chip.Beta;

  cellViewSelectOptions: DropdownOption[] = [
    {
      name: HeatMapView.Temperature.toString(),
      function: () => {
        this.heatMapService.setCurrentView(this.segmentId, HeatMapView.Temperature);
      }
    },
    {
      name: HeatMapView.Voltage.toString(),
      function: () => {
        this.heatMapService.setCurrentView(this.segmentId, HeatMapView.Voltage);
      }
    },
    {
      name: HeatMapView.Balancing.toString(),
      function: () => {
        this.heatMapService.setCurrentView(this.segmentId, HeatMapView.Balancing);
      }
    },
    {
      name: HeatMapView.CvsFailure.toString(),
      function: () => {
        this.heatMapService.setCurrentView(this.segmentId, HeatMapView.CvsFailure);
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

  ngOnInit(): void {
    this.subscribeToSegmentID();
  }

  getHeatmapTitle(): string {
    return 'Segment ' + (this.segmentId + 1) + ': Cell-by-Cell';
  }

  private subscribeToView(): void {
    const viewSub = this.heatMapService.getCurrentView(this.segmentId);
    if (viewSub) {
      this.subscriptions.push(
        viewSub.subscribe((view) => {
          this.allSegSelectorConfig = {
            ...this.allSegSelectorConfig,
            defaultValue: view !== undefined ? formatAllSelectorName(view.toString()) : 'Change ALL Segments'
          };
          this.currentSegmentSelectorConfig = {
            ...this.currentSegmentSelectorConfig,
            defaultValue: view !== undefined ? view : 'Change View'
          };
        })
      );
    }
  }

  // Update view width
  onResize() {
    this.changeTitleSize = window.innerWidth < 1060;
  }

  subscribeToSegmentID = () => {
    if (this.route.url.subscribe((url) => url.toString().includes('bms/segment'))) {
      this.route.paramMap.subscribe((params) => {
        const possibleSegId = Number(params.get('id')) - 1;
        allSegments.indexOf(possibleSegId) !== -1 ? (this.segmentId = possibleSegId) : this.router.navigate(['bms']);
        this.subscribeToView();
      });
    } else {
      this.router.navigate(['bms']);
    }
  };

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }
}
