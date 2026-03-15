import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { DataTypeEnum } from 'src/data-type.enum';

import TypographyComponent from 'src/components/typography/typography.component';
import EfuseCardComponent from './components/efuse-card/efuse-card.component';
import RtdsDebugCardComponent from './components/rtds-debug-card/rtds-debug-card.component';
import GridLayoutComponent from 'src/components/grid-layout/grid-layout.component';

/**
 * Container for the eFuses page, displays eFuse status and controls.
 */
@Component({
  selector: 'efuses-page',
  styleUrls: ['./efuses-page.component.css'],
  templateUrl: './efuses-page.component.html',
  standalone: true,
  imports: [GridLayoutComponent, TypographyComponent, EfuseCardComponent, RtdsDebugCardComponent]
})
export default class EfusesPageComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription[] = [];

  // Expose DataTypeEnum for template
  DataTypeEnum = DataTypeEnum;

  ngOnInit() {
    // Page initialization
    console.log('eFuses page initialized');
  }

  ngOnDestroy() {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
