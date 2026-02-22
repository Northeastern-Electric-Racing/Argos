import { Component, inject, input, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Segment } from 'src/utils/bms.utils';
import { HeatMapService, HeatMapView } from 'src/services/heat-map.service';
import {
  DropdownOption,
  SelectorConfig,
  SelectDropdownComponent
} from 'src/components/select-dropdown/select-dropdown.component';
import { appRoutes } from 'src/app/app-routing.module';
import { SegmentHeatmapComponent } from '../segment-heatmap/segment-heatmap.component';
import { SegmentOverviewComponent } from '../segment-overview/segment-overview.component';

@Component({
  selector: 'segment-row',
  templateUrl: './segment-row.component.html',
  styleUrl: './segment-row.component.css',
  standalone: true,
  imports: [SelectDropdownComponent, SegmentHeatmapComponent, SegmentOverviewComponent]
})
export class SegmentRowComponent implements OnInit, OnDestroy {
  private heatMapService = inject(HeatMapService);
  private router = inject(Router);
  private subscriptions: Subscription[] = [];

  segment = input.required<Segment>();

  // View selector config (Voltage and Balancing only per ticket)
  viewSelectorConfig!: SelectorConfig;
  private viewOptions: DropdownOption[] = [
    {
      name: HeatMapView.Voltage.toString(),
      function: () => this.heatMapService.setCurrentView(this.segment(), HeatMapView.Voltage)
    },
    {
      name: HeatMapView.Balancing.toString(),
      function: () => this.heatMapService.setCurrentView(this.segment(), HeatMapView.Balancing)
    }
  ];

  constructor() {}

  ngOnInit(): void {
    this.viewSelectorConfig = { options: this.viewOptions, placeholder: 'Voltage' };
    const viewSub = this.heatMapService.getCurrentView(this.segment());
    if (viewSub) {
      this.subscriptions.push(
        viewSub.subscribe((view) => {
          this.viewSelectorConfig = {
            ...this.viewSelectorConfig,
            defaultValue: view !== undefined ? view : 'Voltage'
          };
        })
      );
    }
  }

  openSegmentPage = (): void => {
    this.router.navigate([appRoutes.bmsSegmentViewRoute(this.segment())]);
  };

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }
}
