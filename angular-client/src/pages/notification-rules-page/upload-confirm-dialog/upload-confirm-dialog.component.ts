import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NZ_MODAL_DATA, NzModalRef } from 'ng-zorro-antd/modal';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { RulePayload } from 'src/api/rules.api';

@Component({
  selector: 'upload-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NzButtonModule],
  templateUrl: './upload-confirm-dialog.component.html',
  styleUrls: ['./upload-confirm-dialog.component.css']
})
export class UploadConfirmDialogComponent {
  private ref = inject(NzModalRef);
  private data = inject(NZ_MODAL_DATA);

  rules: RulePayload[] = this.data.rules;

  onConfirm(): void {
    this.ref.close(true);
  }

  onCancel(): void {
    this.ref.close(false);
  }
}
