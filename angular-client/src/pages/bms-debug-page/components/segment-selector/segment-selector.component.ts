import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { appRoutes } from 'src/app/app-routing.module';
import { DropdownOption } from 'src/components/select-dropdown/select-dropdown.component';
import { allSegments } from 'src/utils/bms.utils';
import { InfoBackgroundComponent } from '../../../../components/info-background/info-background.component';


import { SelectDropdownComponent } from '../../../../components/select-dropdown/select-dropdown.component';
import TypographyComponent from 'src/components/typography/typography.component';
import VStackComponent from 'src/components/vstack/vstack.component';

@Component({
    selector: 'segment-selector',
    templateUrl: './segment-selector.component.html',
    styleUrl: './segment-selector.component.css',
    standalone: true,
    imports: [InfoBackgroundComponent, SelectDropdownComponent, TypographyComponent, VStackComponent]
})
export class SegmentSelectorComponent implements OnInit {
  public router = inject(Router);
  selectorOptions: DropdownOption[] = [
    {
      name: 'Accumulator',
      function: () => {
        this.router.navigate([appRoutes.bmsRoute()]);
      }
    }
  ];
  placeholder = 'Select Segment';

  constructor() {
    // Add all segments with title: 'Segment {segmentNumber}' to dropdown
    this.selectorOptions.push(
      ...allSegments.map((segment) => {
        return {
          name: `Segment ${segment + 1}`,
          function: () => {
            this.router.navigate([appRoutes.bmsSegmentViewRoute(segment)]);
          }
        };
      })
    );
  }

  ngOnInit() {
    this.placeholder = this.router.url.includes('bms')
      ? `${this.router.url.split('/').pop() === 'bms' ? 'Accumulator' : 'Segment ' + this.router.url.split('/').pop()}`
      : 'Select Segment';
  }
}
