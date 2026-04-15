import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { allSegments } from 'src/utils/bms.utils';
import { MatGridList, MatGridTile } from '@angular/material/grid-list';
import { BmsHeaderComponent } from './components/bms-header/bms-header.component';
import { BmsAtAGlanceComponent } from './components/bms-at-a-glance/bms-at-a-glance.component';
import { SegmentRowComponent } from './components/segment-row/segment-row.component';
import { HeatMapService, HeatMapView } from 'src/services/heat-map.service';
import { DropdownOption, SelectorConfig } from 'src/components/select-dropdown/select-dropdown.component';
import { SectionHeaderComponent } from 'src/components/section-header/section-header.component';

const formatAllSelectorName = (name: string) => 'Set ALL Maps: ' + name;

@Component({
  selector: 'app-bms-debug-page',
  templateUrl: './bms-debug-page.component.html',
  styleUrl: './bms-debug-page.component.css',
  imports: [
    MatGridList,
    MatGridTile,
    BmsHeaderComponent,
    BmsAtAGlanceComponent,
    SegmentRowComponent,
    SectionHeaderComponent
  ],
  host: {
    '(window:resize)': 'onResize()'
  }
})
export class BmsDebugPageComponent implements OnInit, OnDestroy {
  private heatMapService = inject(HeatMapService);
  private subscription?: Subscription;

  time = new Date();
  newRunIsLoading = false;
  mobileThreshold = 768;
  windowSize: number = window.innerWidth;
  isMobile = window.innerWidth < this.mobileThreshold;
  segments = allSegments;

  /** "Set ALL Maps" dropdown — shown once at the section header level */
  private allViewOptions: DropdownOption[] = [
    {
      name: formatAllSelectorName(HeatMapView.Voltage.toString()),
      function: () => this.heatMapService.setAllSegViews(HeatMapView.Voltage)
    },
    {
      name: formatAllSelectorName(HeatMapView.Balancing.toString()),
      function: () => this.heatMapService.setAllSegViews(HeatMapView.Balancing)
    },
    {
      name: formatAllSelectorName(HeatMapView.Temperature.toString()),
      function: () => this.heatMapService.setAllSegViews(HeatMapView.Temperature)
    },
    {
      name: formatAllSelectorName(HeatMapView.CvsFailure.toString()),
      function: () => this.heatMapService.setAllSegViews(HeatMapView.CvsFailure)
    }
  ];
  allSegSelectorConfig: SelectorConfig = {
    options: this.allViewOptions,
    placeholder: 'Set ALL Maps'
  };

  constructor() {}

  ngOnInit(): void {
    this.subscription = this.heatMapService.globalView$.subscribe((view) => {
      this.allSegSelectorConfig = {
        ...this.allSegSelectorConfig,
        defaultValue: formatAllSelectorName(view)
      };
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  onResize() {
    this.isMobile = window.innerWidth <= this.mobileThreshold;
    this.windowSize = window.innerWidth;
  }
}
