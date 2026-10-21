import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TuiTable } from '@taiga-ui/addon-table';
import { TuiButton, type TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';
import { RulePayload } from 'src/api/rules.api';

export interface UploadConfirmData {
  rules: RulePayload[];
}

@Component({
  selector: 'upload-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TuiButton, TuiTable],
  templateUrl: './upload-confirm-dialog.component.html',
  styleUrls: ['./upload-confirm-dialog.component.css']
})
export class UploadConfirmDialogComponent {
  private readonly context = injectContext<TuiDialogContext<boolean, UploadConfirmData>>();

  rules: RulePayload[] = this.context.data.rules;

  onConfirm(): void {
    this.context.completeWith(true);
  }

  onCancel(): void {
    this.context.completeWith(false);
  }
}
