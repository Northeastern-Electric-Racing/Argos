import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { BrnDialogState } from '@spartan-ng/brain/dialog';
import { HlmAlertDialogImports } from '@spartan-ng/helm/alert-dialog';
import { ConfirmOptions, ConfirmService } from 'src/services/confirm.service';
import { focusLost } from 'src/utils/focus.utils';

/** The app's one yes/no question, a Spartan Alert Dialog driven by ConfirmService. */
@Component({
  selector: 'confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmAlertDialogImports]
})
export class ConfirmDialogComponent {
  protected confirmService = inject(ConfirmService);
  /** The question on screen, kept until the dialog has finished closing. */
  private asked: ConfirmOptions | null = null;

  constructor() {
    effect(() => {
      const question = this.confirmService.pending();
      if (question) this.asked = question;
    });
  }

  /** Escape (or any close other than the two buttons) counts as no. */
  protected onStateChanged(state: BrnDialogState) {
    if (state === 'closed' && this.confirmService.pending()) this.confirmService.answer(false);
  }

  /** The dialog hands focus back to the control that asked; if that control is gone, use the fallback. */
  protected onClosed() {
    const fallback = this.asked?.focusFallback;
    this.asked = null;
    if (fallback && focusLost()) fallback()?.focus();
  }
}
