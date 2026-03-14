import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import Storage from 'src/services/storage.service';
import { DataTypeEnum } from 'src/data-type.enum';
import { BreakpointObserver } from '@angular/cdk/layout';

import { MatGridList, MatGridTile } from '@angular/material/grid-list';
import TypographyComponent from 'src/components/typography/typography.component';
import EfuseCardComponent from './components/efuse-card/efuse-card.component';

/**
 * Container for the eFuses page, displays eFuse status and controls.
 */
@Component({
  selector: 'efuses-page',
  styleUrls: ['./efuses-page.component.css'],
  templateUrl: './efuses-page.component.html',
  standalone: true,
  imports: [MatGridList, MatGridTile, TypographyComponent, EfuseCardComponent]
})
export default class EfusesPageComponent implements OnInit, OnDestroy {
  private storage = inject(Storage);
  private breakpointObserver = inject(BreakpointObserver);
  private subscriptions: Subscription[] = [];

  // Expose DataTypeEnum for template
  DataTypeEnum = DataTypeEnum;

  gridCols = 3;
  gridRowHeight: string | number = '450px';

  private readonly singleColumnQuery = '(max-width: 1100px)';
  private readonly doubleColumnQuery = '(max-width: 1800px)';

  ngOnInit() {
    // Page initialization
    console.log('eFuses page initialized');

    this.subscriptions.push(
      this.breakpointObserver.observe([this.singleColumnQuery, this.doubleColumnQuery]).subscribe((state) => {
        if (state.breakpoints[this.singleColumnQuery]) {
          this.gridCols = 1;
          this.gridRowHeight = '520px';
          return;
        }

        if (state.breakpoints[this.doubleColumnQuery]) {
          this.gridCols = 2;
          this.gridRowHeight = '500px';
          return;
        }

        this.gridCols = 3;
        this.gridRowHeight = '450px';
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
