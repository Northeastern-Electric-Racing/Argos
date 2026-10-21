import { DIALOG_DATA, Dialog, DialogConfig, DialogRef } from '@angular/cdk/dialog';
import { hasModifierKey } from '@angular/cdk/keycodes';
import { ComponentPortal, ComponentType } from '@angular/cdk/portal';
import { Injectable, Injector, inject } from '@angular/core';
import { createGlobalPositionStrategy, createOverlayRef } from '@angular/cdk/overlay';
import { UiDialogContainerComponent } from './dialog-container.component';
import { UI_PANEL_CONFIG, UiPanelComponent, UiPanelConfig, UiPanelRef } from './panel.component';

/** Options for {@link UiDialogService.open}, on top of the CDK's own DialogConfig. */
export interface UiDialogOptions<D = unknown> {
  /** Title shown in the dialog header; the header labels the dialog (aria-labelledby). */
  header?: string;
  /** Accessible name for a dialog without a visible header. */
  ariaLabel?: string;
  /** Id of the element that describes the dialog, such as a confirmation's message. */
  ariaDescribedBy?: string;
  data?: D;
  width?: string;
  /** Show the header bar with the title and close button. Default true. */
  showHeader?: boolean;
  /** Show the close button and let Escape close the dialog. Default true. */
  closable?: boolean;
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
  uiTitleId: string;
  uiShowHeader: boolean;
  uiClosable: boolean;
  uiDraggable: boolean;
}

let nextTitleId = 0;
const newTitleId = () => `ui-dialog-title-${nextTitleId++}`;

/**
 * Opens components in a CDK dialog wrapped in our styled container (header, close button,
 * optional drag). The CDK provides the focus trap, initial focus, focus restore, role="dialog",
 * aria-labelledby, and aria-hidden on the page behind. Non-modal panels go through {@link openPanel} on the CDK Overlay,
 * because a CDK Dialog is always modal for assistive tech.
 */
@Injectable({ providedIn: 'root' })
export class UiDialogService {
  private dialog = inject(Dialog);
  private injector = inject(Injector);

  /** `R` is the result type the dialog closes with. */
  open<R = unknown, D = unknown>(component: ComponentType<unknown>, options: UiDialogOptions<D> = {}): DialogRef<R> {
    const closable = options.closable ?? true;
    const showHeader = options.showHeader ?? true;
    const titleId = newTitleId();
    const config: UiDialogConfig<D> = {
      data: options.data,
      width: options.width,
      maxWidth: 'calc(100vw - 32px)',
      backdropClass: 'ui-dialog-backdrop',
      panelClass: ['ui-dialog-pane', ...(options.panelClass ? [options.panelClass] : [])],
      // We decide ourselves when Escape / backdrop clicks close (PrimeNG-compatible defaults).
      disableClose: true,
      role: options.role ?? 'dialog',
      ariaLabel: options.ariaLabel ?? null,
      ariaLabelledBy: showHeader && options.header ? titleId : null,
      ariaDescribedBy: options.ariaDescribedBy ?? null,
      // The CDK default: focus the first tabbable element (or [cdkFocusInitial]); the container
      // puts the close button after the content so a form opens on its first field.
      autoFocus: 'first-tabbable',
      container: UiDialogContainerComponent,
      positionStrategy: options.position ? this.edgePosition(options.position) : undefined,
      uiHeader: options.header,
      uiTitleId: titleId,
      uiShowHeader: showHeader,
      uiClosable: closable,
      uiDraggable: options.draggable ?? false
    };
    const ref = this.dialog.open<R, D>(component, config as DialogConfig<D, DialogRef<R>>);

    // Both streams complete when the dialog closes. Mirrors the CDK's own Escape handling.
    ref.keydownEvents.subscribe((event) => {
      if (closable && event.key === 'Escape' && !hasModifierKey(event)) {
        event.preventDefault();
        ref.close(undefined, { focusOrigin: 'keyboard' });
      }
    });
    if (options.dismissableMask) {
      ref.backdropClick.subscribe(() => ref.close(undefined, { focusOrigin: 'mouse' }));
    }
    return ref;
  }

  /**
   * Opens a non-modal panel: same chrome as a dialog, but on a plain CDK overlay, so the page
   * stays usable and visible to assistive tech, and Tab can leave it. Escape or the close button
   * closes it. The content component can inject DIALOG_DATA and UiPanelRef.
   */
  openPanel<R = unknown, D = unknown>(
    component: ComponentType<unknown>,
    options: Pick<UiDialogOptions<D>, 'header' | 'data' | 'width' | 'draggable' | 'panelClass'> = {}
  ): UiPanelRef<R> {
    const ref = new UiPanelRef<R>();
    const overlayRef = createOverlayRef(this.injector, {
      positionStrategy: createGlobalPositionStrategy(this.injector).centerHorizontally().centerVertically(),
      hasBackdrop: false,
      width: options.width,
      maxWidth: 'calc(100vw - 32px)',
      panelClass: ['ui-dialog-pane', 'ui-dialog-pane--modeless', ...(options.panelClass ? [options.panelClass] : [])]
    });
    const panelConfig: UiPanelConfig = {
      header: options.header,
      titleId: newTitleId(),
      draggable: options.draggable ?? false,
      component
    };
    const injector = Injector.create({
      parent: this.injector,
      providers: [
        { provide: UI_PANEL_CONFIG, useValue: panelConfig },
        { provide: DIALOG_DATA, useValue: options.data },
        { provide: UiPanelRef, useValue: ref }
      ]
    });
    overlayRef.attach(new ComponentPortal(UiPanelComponent, null, injector));
    ref.setCloseHandler(() => overlayRef.dispose());
    overlayRef.keydownEvents().subscribe((event) => {
      if (event.key === 'Escape' && !hasModifierKey(event)) {
        event.preventDefault();
        ref.close();
      }
    });
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
