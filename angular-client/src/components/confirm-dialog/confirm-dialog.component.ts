import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BrnDialogState } from '@spartan-ng/brain/dialog';
import { HlmAlertDialogImports } from '@spartan-ng/helm/alert-dialog';
import { ConfirmService } from 'src/services/confirm.service';

/** The app's one yes/no question, a Spartan Alert Dialog driven by ConfirmService. */
@Component({
  selector: 'confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmAlertDialogImports]
})
export class ConfirmDialogComponent {
  protected confirmService = inject(ConfirmService);

  /** Escape (or any close other than the two buttons) counts as no. */
  protected onStateChanged(state: BrnDialogState) {
    if (state === 'closed' && this.confirmService.pending()) this.confirmService.answer(false);
  }
}
