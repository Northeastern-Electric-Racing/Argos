import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { UiButtonDirective } from '../button/button.directive';

export interface ConfirmDialogData {
  message: string;
  /** Id of the message element; the dialog's aria-describedby points at it. */
  messageId: string;
  acceptLabel: string;
  rejectLabel: string;
  danger: boolean;
}

@Component({
  selector: 'ui-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UiButtonDirective]
})
export class ConfirmDialogComponent {
  protected data = inject<ConfirmDialogData>(DIALOG_DATA);
  protected ref = inject<DialogRef<boolean>>(DialogRef);
}
