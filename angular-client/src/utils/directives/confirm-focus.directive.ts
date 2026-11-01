import { Directive, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialog } from 'primeng/confirmdialog';

/**
 * Returns focus to whatever asked for confirmation once a PrimeNG ConfirmDialog closes, as ArgosDialogService
 * does for dynamic dialogs; PrimeNG leaves it on <body>. If that element is gone, focus goes to confirm({ target }).
 */
@Directive({ selector: 'p-confirmdialog[argosConfirmFocus]' })
export class ConfirmFocusDirective {
  private opener: HTMLElement | null = null;
  private target: HTMLElement | null = null;

  constructor() {
    // The dialog moves focus into itself after a delay, so the opener is still focused when the request arrives
    inject(ConfirmationService)
      .requireConfirmation$.pipe(takeUntilDestroyed())
      .subscribe((confirmation) => {
        if (!confirmation) return;
        const active = document.activeElement;
        this.opener = active instanceof HTMLElement && active !== document.body ? active : null;
        // A popup menu that asked is gone by the time the dialog closes, so the caller can name its trigger
        this.target = confirmation.target instanceof HTMLElement ? confirmation.target : null;
      });
    inject(ConfirmDialog)
      .onHide.pipe(takeUntilDestroyed())
      .subscribe(() => {
        const back = this.opener?.isConnected ? this.opener : this.target;
        if (back?.isConnected) back.focus({ preventScroll: true });
        this.opener = null;
        this.target = null;
      });
  }
}
