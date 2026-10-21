import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';

export interface ConfirmDialogContext {
  header: string;
  message: string;
  acceptLabel?: string;
  rejectLabel?: string;
  /** Styles the accept button as destructive (delete, clear, reset). */
  destructive?: boolean;
}

/** Yes/no confirmation, opened through ConfirmService; closes with true when accepted. */
@Component({
  selector: 'confirm-dialog',
  // Lays out the dialog's header, body and footer the way the Dialog docs' dynamic component does.
  host: { class: 'grid gap-6 min-w-0' },
  templateUrl: './confirm-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmDialogImports, HlmButton]
})
export class ConfirmDialogComponent {
  private ref = inject<BrnDialogRef<boolean>>(BrnDialogRef);
  protected context = injectBrnDialogContext<ConfirmDialogContext>();

  accept() {
    this.ref.close(true);
  }

  reject() {
    this.ref.close(false);
  }
}
