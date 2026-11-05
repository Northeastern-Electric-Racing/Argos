import { Component, inject, input, OnInit, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
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
import { buttonVariantClasses } from 'src/ui/recipes/button';
import { cx, tw } from 'src/ui/recipes/tw';

/**
 * "See more": the secondary button's colours, hover and focus ring at the row's fluid size (the recipe's sizes
 * are fixed). Its height never drops under 24px (WCAG 2.5.8; 814's clamp started at 18px), like the select's.
 */
const seeMoreClass = cx(
  buttonVariantClasses.secondary,
  tw(
    'inline-flex h-[clamp(24px,2.3vw,44px)] w-full cursor-pointer items-center justify-center gap-[0.3em] rounded-[clamp(8px,1.25vw,24px)] border border-solid px-[clamp(6px,1.4vw,28px)] text-center font-sans text-[length:clamp(7px,0.94vw,18px)] leading-control font-semibold whitespace-nowrap transition-colors duration-120 select-none focus-visible:focus-ring'
  )
);

@Component({
  selector: 'segment-row',
  templateUrl: './segment-row.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [SelectDropdownComponent, SegmentHeatmapComponent, SegmentOverviewComponent, MatIcon],
  host: { class: 'block' }
})
export class SegmentRowComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private heatMapService = inject(HeatMapService);
  private router = inject(Router);

  segment = input.required<Segment>();
  protected readonly seeMoreClass = seeMoreClass;

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
