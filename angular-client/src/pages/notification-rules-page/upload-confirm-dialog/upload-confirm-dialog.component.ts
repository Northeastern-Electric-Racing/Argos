import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { RulePayload } from 'src/api/rules.api';

@Component({
  selector: 'upload-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmButton, HlmDialogImports, HlmTableImports],
  templateUrl: './upload-confirm-dialog.component.html',
  styleUrls: ['./upload-confirm-dialog.component.css']
})
export class UploadConfirmDialogComponent {
  private ref = inject(BrnDialogRef);
  private context = injectBrnDialogContext<{ rules: RulePayload[] }>();

  rules: RulePayload[] = this.context.rules;

  onConfirm(): void {
    this.ref.close(true);
  }

  onCancel(): void {
    this.ref.close(false);
  }
}
