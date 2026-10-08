import { Component, inject, input, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Segment } from 'src/utils/bms.utils';
import { HeatMapService, HeatMapView } from 'src/services/heat-map.service';
import {
  DropdownOption,
  SelectorConfig,
  SelectDropdownComponent
} from 'src/components/select-dropdown/select-dropdown.component';
import { appRoutes } from 'src/app/app-routes';
import { SegmentHeatmapComponent } from '../segment-heatmap/segment-heatmap.component';
import { SegmentOverviewComponent } from '../segment-overview/segment-overview.component';

@Component({
  selector: 'segment-row',
  templateUrl: './segment-row.component.html',
  styleUrl: './segment-row.component.css',
  imports: [SelectDropdownComponent, SegmentHeatmapComponent, SegmentOverviewComponent]
})
export class SegmentRowComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private heatMapService = inject(HeatMapService);
  private router = inject(Router);

  segment = input.required<Segment>();

  viewSelectorConfig!: SelectorConfig;
  private viewOptions: DropdownOption[] = [
    {
      name: HeatMapView.Voltage.toString(),
      function: () => this.heatMapService.setCurrentView(this.segment(), HeatMapView.Voltage)
    },
    {
      name: HeatMapView.SVolts.toString(),
      function: () => this.heatMapService.setCurrentView(this.segment(), HeatMapView.SVolts)
    },
    {
      name: HeatMapView.Temperature.toString(),
      function: () => this.heatMapService.setCurrentView(this.segment(), HeatMapView.Temperature)
    },
    {
      name: HeatMapView.Balancing.toString(),
      function: () => this.heatMapService.setCurrentView(this.segment(), HeatMapView.Balancing)
    },
    {
      name: HeatMapView.CvsFailure.toString(),
      function: () => this.heatMapService.setCurrentView(this.segment(), HeatMapView.CvsFailure)
    },
    {
      name: HeatMapView.OpenWire.toString(),
      function: () => this.heatMapService.setCurrentView(this.segment(), HeatMapView.OpenWire)
    }
  ];

  constructor() {}

  ngOnInit(): void {
    this.viewSelectorConfig = { options: this.viewOptions, placeholder: HeatMapView.Voltage.toString() };
    const viewSub = this.heatMapService.getCurrentView(this.segment());
    if (viewSub) {
      viewSub.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((view) => {
        this.viewSelectorConfig = {
          ...this.viewSelectorConfig,
          defaultValue: view !== undefined ? view : HeatMapView.Voltage.toString()
        };
      });
    }
  }

  openSegmentPage = (): void => {
    this.router.navigate([appRoutes.bmsSegmentViewRoute(this.segment())]);
  };
}
