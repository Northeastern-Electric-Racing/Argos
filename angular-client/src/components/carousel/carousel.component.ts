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

  responsiveOptions: any[] | undefined;

  constructor(
    public dialogRef: MatDialogRef<Carousel>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public router: Router
  ) {
    this.runs = data.runs;
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  datePipe = (time: string) => {
    const date = new Date(parseInt(time));
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()} - ${date.getHours()}:${date.getMinutes()}`;
  };

  selectRun = (run: Run) => {
    this.router.navigate([`graph/false/${run.id}`]);
    this.dialogRef.close();
  };
}
