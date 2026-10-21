import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RulePayload } from 'src/api/rules.api';

@Component({
  selector: 'upload-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './upload-confirm-dialog.component.html',
  styleUrls: ['./upload-confirm-dialog.component.css']
})
export class UploadConfirmDialogComponent {
  private ref = inject(DialogRef);
  private dialogData = inject(DIALOG_DATA);

  rules: RulePayload[] = this.dialogData.rules;

  onConfirm(): void {
    this.ref.close(true);
  }

  onCancel(): void {
    this.ref.close(false);
  }
}
