import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle
} from '@angular/material/dialog';
import { MatActionList, MatListItem, MatListItemLine, MatListItemTitle } from '@angular/material/list';
import { Run } from 'src/utils/types.utils';

// the data for the dialog: all the runs, and what to do with the picked one
export interface DialogData {
  runs: Run[];
  selectRun: (run: Run) => void;
}

/**
 * Run picker dialog. Angular Material has no carousel, so the runs are an action list
 * (newest first) the user scrolls and clicks, instead of PrimeNG's one-at-a-time carousel.
 */
@Component({
  selector: 'carousel',
  templateUrl: 'carousel.component.html',
  styleUrls: ['carousel.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    DatePipe,
    MatButton,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatActionList,
    MatListItem,
    MatListItemTitle,
    MatListItemLine
  ]
})
export class CarouselComponent {
  private dialogRef = inject(MatDialogRef<CarouselComponent>);
  private data = inject<DialogData>(MAT_DIALOG_DATA);
  runs: Run[] = (this.data.runs ?? []).slice().reverse();

  selectRun(run: Run) {
    this.dialogRef.close();
    this.data.selectRun(run);
  }
}
