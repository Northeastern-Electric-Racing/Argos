import { Dialog, DialogConfig, DialogRef } from '@angular/cdk/dialog';
import { ComponentType } from '@angular/cdk/portal';
import { Injectable, Injector, inject } from '@angular/core';
import { createGlobalPositionStrategy } from '@angular/cdk/overlay';
import { UiDialogContainerComponent } from './dialog-container.component';

/** Options for {@link UiDialogService.open}, on top of the CDK's own DialogConfig. */
export interface UiDialogOptions<D = unknown> {
  /** Title shown in the dialog header (also its accessible name). */
  header?: string;
  data?: D;
  width?: string;
  /** Show the header bar with the title and close button. Default true. */
  showHeader?: boolean;
  /** Show the close button and let Escape close the dialog. Default true. */
  closable?: boolean;
  /** Block the page behind with a backdrop. Default true. */
  modal?: boolean;
  /** Close when the backdrop is clicked. Default false. */
  dismissableMask?: boolean;
  /** Let the user drag the dialog by its header. Default false. */
  draggable?: boolean;
  /** Extra classes on the overlay pane, for global positioning tweaks. */
  panelClass?: string;
  /** Pin the dialog to the viewport edges instead of centring it. */
  position?: { top?: string; right?: string; bottom?: string; left?: string };
  /** ARIA role; use 'alertdialog' for confirmations. Default 'dialog'. */
  role?: 'dialog' | 'alertdialog';
}

/** DialogConfig as our container sees it: the CDK config plus our header options. */
export interface UiDialogConfig<D = unknown> extends DialogConfig<D> {
  uiHeader?: string;
  uiShowHeader: boolean;
  uiClosable: boolean;
  uiDraggable: boolean;
}

/**
 * Opens components in a CDK dialog wrapped in our styled container (header, close button,
 * optional drag). The CDK provides focus trap, focus restore, role="dialog" and Escape handling.
 */
@Injectable({ providedIn: 'root' })
export class UiDialogService {
  private dialog = inject(Dialog);
  private injector = inject(Injector);

  /** `R` is the result type the dialog closes with. */
  open<R = unknown, D = unknown>(component: ComponentType<unknown>, options: UiDialogOptions<D> = {}): DialogRef<R> {
    const closable = options.closable ?? true;
    const modal = options.modal ?? true;
    const config: UiDialogConfig<D> = {
      data: options.data,
      width: options.width,
      maxWidth: '95vw',
      hasBackdrop: modal,
      backdropClass: 'ui-dialog-backdrop',
      panelClass: [
        'ui-dialog-pane',
        ...(modal ? [] : ['ui-dialog-pane--modeless']),
        ...(options.panelClass ? [options.panelClass] : [])
      ],
      // We decide ourselves when Escape / backdrop clicks close (PrimeNG-compatible defaults).
      disableClose: true,
      role: options.role ?? 'dialog',
      ariaLabel: options.header ?? null,
      autoFocus: 'dialog',
      container: UiDialogContainerComponent,
      positionStrategy: options.position ? this.edgePosition(options.position) : undefined,
      uiHeader: options.header,
      uiShowHeader: options.showHeader ?? true,
      uiClosable: closable,
      uiDraggable: options.draggable ?? false
    };
    const ref = this.dialog.open<R, D>(component, config as DialogConfig<D, DialogRef<R>>);

    // Both streams complete when the dialog closes.
    ref.keydownEvents.subscribe((event) => {
      if (closable && event.key === 'Escape') ref.close();
    });
    if (modal && options.dismissableMask) {
      ref.backdropClick.subscribe(() => ref.close());
    }
    return ref;
  }

  private edgePosition(pos: NonNullable<UiDialogOptions['position']>) {
    const strategy = createGlobalPositionStrategy(this.injector);
    if (pos.top) strategy.top(pos.top);
    if (pos.bottom) strategy.bottom(pos.bottom);
    if (pos.left) strategy.left(pos.left);
    if (pos.right) strategy.right(pos.right);
    return strategy;
  }

  closeAll(): void {
    this.dialog.closeAll();
  }
}
