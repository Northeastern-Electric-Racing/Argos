import { Component, HostListener, inject } from '@angular/core';
import { allSegments } from 'src/utils/bms.utils';
import { MatGridList, MatGridTile } from '@angular/material/grid-list';
import { BmsHeaderComponent } from './components/bms-header/bms-header.component';
import { BmsAtAGlanceComponent } from './components/bms-at-a-glance/bms-at-a-glance.component';
import { SegmentRowComponent } from './components/segment-row/segment-row.component';
import { HeatMapService, HeatMapView } from 'src/services/heat-map.service';
import {
  DropdownOption,
  SelectorConfig,
  SelectDropdownComponent
} from 'src/components/select-dropdown/select-dropdown.component';

const formatAllSelectorName = (name: string) => 'Set ALL Maps: ' + name;

@Component({
  selector: 'app-bms-debug-page',
  templateUrl: './bms-debug-page.component.html',
  styleUrl: './bms-debug-page.component.css',
  standalone: true,
  imports: [
    MatGridList,
    MatGridTile,
    BmsHeaderComponent,
    BmsAtAGlanceComponent,
    SegmentRowComponent,
    SelectDropdownComponent
  ]
})
export class BmsDebugPageComponent {
  private heatMapService = inject(HeatMapService);

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
    }
  ];
  allSegSelectorConfig: SelectorConfig = {
    options: this.allViewOptions,
    placeholder: 'Set ALL Maps: Temp...'
  };

  constructor() {}

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.isMobile = window.innerWidth <= this.mobileThreshold;
    this.windowSize = window.innerWidth;
  }
}
