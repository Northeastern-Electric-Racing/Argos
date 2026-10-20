import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

export interface ConfirmDialogData {
  message: string;
  acceptLabel: string;
  rejectLabel: string;
  danger: boolean;
}

@Component({
  selector: 'ui-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmDialogComponent {
  protected data = inject<ConfirmDialogData>(DIALOG_DATA);
  protected ref = inject<DialogRef<boolean>>(DialogRef);
}
