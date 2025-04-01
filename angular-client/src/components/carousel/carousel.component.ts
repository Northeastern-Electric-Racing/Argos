import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CarouselPageEvent } from 'primeng/carousel';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Run } from 'src/utils/types.utils';

// the data for the dialog, basically just all the runs
export interface DialogData {
  runs: Run[];
}

@Component({
  selector: 'carousel',
  templateUrl: 'carousel.component.html',
  styleUrls: ['carousel.component.css']
})
export class CarouselComponent {
  public dialogRef = inject(DynamicDialogRef);
  public config = inject(DynamicDialogConfig);
  public router = inject(Router);
  runs: Run[];
  currentIndex: number = 0;
  previousIndex: number = 0;
  selectRun: (run: Run) => void = () => {
    this.dialogRef.close();
  };

  constructor() {
    this.runs = this.config.data.runs;
    this.selectRun = (run: Run) => {
      this.dialogRef.close();
      this.config.data.selectRun(run);
    };
  }

  updateIndex(nexIndex: number) {
    this.currentIndex = nexIndex;
  }

  handlePageChange(event: CarouselPageEvent): void {
    const newIndex = event.page;
    if (newIndex) {
      if (newIndex === this.runs.length) {
        this.currentIndex = 0;
      } else if (newIndex === -1) {
        this.currentIndex = this.runs.length - 1;
      } else {
        this.currentIndex = newIndex;
      }

      this.previousIndex = newIndex;
    }
  }

  datePipe = (date: Date) => {
    date = new Date(date);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()} - ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padEnd(2, '0')}`;
  };
}
