import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { NzCarouselModule } from 'ng-zorro-antd/carousel';
import { NZ_MODAL_DATA, NzModalRef } from 'ng-zorro-antd/modal';
import { Run } from 'src/utils/types.utils';
import { MatGridList, MatGridTile } from '@angular/material/grid-list';
import { NzButtonModule } from 'ng-zorro-antd/button';
import TypographyComponent from '../typography/typography.component';

// the data for the dialog, basically just all the runs
export interface DialogData {
  runs: Run[];
}

@Component({
  selector: 'carousel',
  templateUrl: 'carousel.component.html',
  styleUrls: ['carousel.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [NzCarouselModule, MatGridList, MatGridTile, NzButtonModule, TypographyComponent]
})
export class CarouselComponent {
  public dialogRef = inject(NzModalRef);
  public data = inject(NZ_MODAL_DATA);
  public router = inject(Router);
  runs: Run[];
  currentIndex: number = 0;
  selectRun: (run: Run) => void = () => {
    this.dialogRef.close();
  };

  constructor() {
    this.runs = this.data.runs;
    this.selectRun = (run: Run) => {
      this.dialogRef.close();
      this.data.selectRun(run);
    };
  }

  updateIndex(nexIndex: number) {
    this.currentIndex = nexIndex;
  }

  datePipe = (date: Date) => {
    date = new Date(date);
    return `${date.toLocaleString()}`;
  };
}
