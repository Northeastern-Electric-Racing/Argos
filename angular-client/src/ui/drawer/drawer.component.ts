import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { hasModifierKey } from '@angular/cdk/keycodes';
import { createGlobalPositionStrategy } from '@angular/cdk/overlay';
import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  TemplateRef,
  effect,
  inject,
  input,
  model,
  untracked,
  viewChild
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';

/**
 * Side drawer: a CDK dialog pinned to one edge with a global position strategy, so it gets the
 * CDK's focus trap, Escape handling and focus restore. Neither Angular Aria nor the CDK has a
 * ready-made drawer. Put a `[uiDrawerHeader]` element inside for the header; the rest is the body.
 */
@Component({
  selector: 'ui-drawer',
  templateUrl: './drawer.component.html',
  styleUrls: ['./drawer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIcon]
})
export class UiDrawerComponent {
  visible = model(false);
  position = input<'left' | 'right'>('right');
  width = input('20rem');
  modal = input(true);
  /** Close when the backdrop is clicked. */
  dismissible = input(true);
  ariaLabel = input('Drawer');

  private dialog = inject(Dialog);
  private injector = inject(Injector);
  private panel = viewChild.required<TemplateRef<unknown>>('panel');
  private ref?: DialogRef<unknown, unknown>;

  constructor() {
    effect(() => {
      const visible = this.visible();
      untracked(() => (visible ? this.open() : this.ref?.close()));
    });
  }

  close(): void {
    this.visible.set(false);
  }

  private open(): void {
    if (this.ref) return;
    const strategy = createGlobalPositionStrategy(this.injector).top('0');
    if (this.position() === 'right') strategy.right('0');
    else strategy.left('0');

    const ref = this.dialog.open(this.panel(), {
      positionStrategy: strategy,
      width: this.width(),
      maxWidth: '100vw',
      height: '100%',
      hasBackdrop: this.modal(),
      backdropClass: 'ui-dialog-backdrop',
      panelClass: ['ui-drawer-pane', `ui-drawer-pane--${this.position()}`],
      disableClose: true,
      ariaLabel: this.ariaLabel(),
      autoFocus: 'dialog'
    });
    this.ref = ref;
    // These streams complete when the drawer closes.
    // eslint-disable-next-line rxjs-angular-x/prefer-takeuntil -- completes with the drawer
    ref.keydownEvents.subscribe((event) => {
      // Mirrors the CDK's own Escape handling (it is off because the backdrop is configurable).
      if (event.key === 'Escape' && !hasModifierKey(event)) {
        event.preventDefault();
        ref.close(undefined, { focusOrigin: 'keyboard' });
      }
    });
    // eslint-disable-next-line rxjs-angular-x/prefer-takeuntil -- completes with the drawer
    ref.backdropClick.subscribe(() => this.dismissible() && ref.close(undefined, { focusOrigin: 'mouse' }));
    // eslint-disable-next-line rxjs-angular-x/prefer-takeuntil -- completes with the drawer
    ref.closed.subscribe(() => {
      this.ref = undefined;
      this.visible.set(false);
    });
  }
}
