import { Component } from '@angular/core';
import { Router } from '@angular/router';
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
export class Carousel {
  runs: Run[];
  currentIndex: number = 0;
  previousIndex: number = 0;
  selectRun: (run: Run) => void = () => {
    this.dialogRef.close();
  };

  responsiveOptions: any[] | undefined;

  constructor(
    public dialogRef: DynamicDialogRef,
    public config: DynamicDialogConfig,
    public router: Router
  ) {
    this.runs = config.data.runs;
    this.selectRun = (run: Run) => {
      this.dialogRef.close();
      config.data.selectRun(run);
    };
  }

  updateIndex(nexIndex: number) {
    this.currentIndex = nexIndex;
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  handlePageChange(event: any): void {
    const newIndex = event.page;

    if (newIndex === this.runs.length) {
      this.currentIndex = 0;
    } else if (newIndex === -1) {
      this.currentIndex = this.runs.length - 1;
    } else {
      this.currentIndex = newIndex;
    }

    this.previousIndex = newIndex;
  }

  datePipe = (date: Date) => {
    date = new Date(date);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()} - ${date.getHours()}:${date.getMinutes()}`;
  };
}
