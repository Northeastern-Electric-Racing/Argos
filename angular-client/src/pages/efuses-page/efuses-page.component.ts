import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import Storage from 'src/services/storage.service';
import { DataTypeEnum } from 'src/data-type.enum';

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
  imports: [
    MatGridList,
    MatGridTile,
    TypographyComponent,
    EfuseCardComponent
  ]
})
export default class EfusesPageComponent implements OnInit, OnDestroy {
  private storage = inject(Storage);
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
