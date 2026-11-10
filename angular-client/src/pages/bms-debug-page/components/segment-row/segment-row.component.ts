import { Component, inject, input, OnInit, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { UiIconComponent } from 'src/ui/icon/icon.component';
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
import { buttonBaseClass } from 'src/ui/recipes/button';
import { cx, tw } from 'src/ui/recipes/tw';

/**
 * "See more": develop's light blue pill with black text, on the nearest token (info #60a5fa for #2aaeee; 8.26:1),
 * at the row's fluid size (no recipe size is fluid). Hover darkens it, as develop's did. Its height never drops
 * under 24px (WCAG 2.5.8; 814's clamp started at 18px), like the select's.
 */
const seeMoreClass = cx(
  buttonBaseClass,
  tw('border-info bg-info text-on-status not-disabled:hover:border-info/85 not-disabled:hover:bg-info/85'),
  tw(
    'h-[clamp(24px,2.3vw,44px)] w-full gap-[0.3em] rounded-[clamp(8px,1.25vw,24px)] px-[clamp(6px,1.4vw,28px)] text-[length:clamp(7px,0.94vw,18px)] font-semibold'
  )
);

@Component({
  selector: 'segment-row',
  templateUrl: './segment-row.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [SelectDropdownComponent, SegmentHeatmapComponent, SegmentOverviewComponent, UiIconComponent],
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
