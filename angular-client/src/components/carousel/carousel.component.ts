import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Router } from '@angular/router';
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

  responsiveOptions: any[] | undefined;

  constructor(
    public dialogRef: MatDialogRef<Carousel>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public router: Router
  ) {
    this.runs = data.runs;
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

  datePipe = (time: string) => {
    const date = new Date(parseInt(time));
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()} - ${date.getHours()}:${date.getMinutes()}`;
  };

  selectRun = (run: Run, index: number) => {
    this.router.navigate([`graph/false/${run.id}`]);
    this.dialogRef.close();
  };
}
