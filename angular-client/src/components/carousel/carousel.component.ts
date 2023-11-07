import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
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
export class CarouselRun {
  runs: Run[];

  responsiveOptions: any[] | undefined;

  constructor(
    public dialogRef: MatDialogRef<CarouselRun>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.runs = data.runs;
  }

  onNoClick(): void {
    this.dialogRef.close();
  }
}
