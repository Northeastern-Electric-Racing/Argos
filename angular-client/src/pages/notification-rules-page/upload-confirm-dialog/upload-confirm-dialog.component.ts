import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { RulePayload } from 'src/api/rules.api';

@Component({
  selector: 'upload-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatButton, MatTableModule],
  templateUrl: './upload-confirm-dialog.component.html',
  styleUrls: ['./upload-confirm-dialog.component.css']
})
export class UploadConfirmDialogComponent {
  private ref = inject(MatDialogRef<UploadConfirmDialogComponent, boolean>);
  rules: RulePayload[] = inject<{ rules: RulePayload[] }>(MAT_DIALOG_DATA).rules;
  readonly columns = ['id', 'topic', 'expr', 'debounce_time'];

  onConfirm(): void {
    this.ref.close(true);
  }

  onCancel(): void {
    this.ref.close(false);
  }
}
