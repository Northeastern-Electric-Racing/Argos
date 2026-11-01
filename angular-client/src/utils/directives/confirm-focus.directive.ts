import { Directive, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialog } from 'primeng/confirmdialog';

/**
 * Returns focus to whatever asked for confirmation once a PrimeNG ConfirmDialog closes, as ArgosDialogService
 * does for dynamic dialogs; PrimeNG leaves it on <body>.
 */
@Directive({ selector: 'p-confirmdialog[argosConfirmFocus]' })
export class ConfirmFocusDirective {
  private opener: HTMLElement | null = null;

  constructor() {
    // The dialog moves focus into itself after a delay, so the opener is still focused when the request arrives
    inject(ConfirmationService)
      .requireConfirmation$.pipe(takeUntilDestroyed())
      .subscribe((confirmation) => {
        if (!confirmation) return;
        const active = document.activeElement;
        this.opener = active instanceof HTMLElement && active !== document.body ? active : null;
      });
    inject(ConfirmDialog)
      .onHide.pipe(takeUntilDestroyed())
      .subscribe(() => {
        if (this.opener?.isConnected) this.opener.focus({ preventScroll: true });
        this.opener = null;
      });
  }
}
