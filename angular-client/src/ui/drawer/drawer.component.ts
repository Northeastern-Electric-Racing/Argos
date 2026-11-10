import { Dialog } from '@angular/cdk/dialog';
import { createGlobalPositionStrategy } from '@angular/cdk/overlay';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injector,
  TemplateRef,
  effect,
  inject,
  input,
  model,
  untracked,
  viewChild
} from '@angular/core';
import { UiIconComponent } from 'src/ui/icon/icon.component';
import { UiIconButtonDirective } from '../button/button.directive';
import { closeOnEscape } from '../dialog/close-on-escape';
import { dialogBackdropClass } from '../dialog/dialog.recipe';
import { tw } from '../recipes/tw';

const drawerClasses = {
  /** The sheet slides in from its edge (a transition from @starting-style, so no keyframes are needed). */
  drawer: tw(
    'flex h-full flex-col bg-surface-2 text-fg shadow-overlay transition-transform duration-180 ease-out outline-none data-[position=left]:starting:-translate-x-full data-[position=right]:starting:translate-x-full'
  ),
  /** On the CDK overlay pane: the dialog container takes focus on open and needs no outline of its own. */
  pane: tw('[&_.cdk-dialog-container]:outline-none')
};

/**
 * Side drawer: a CDK dialog pinned to one edge with a global position strategy, so it gets the
 * CDK's focus trap, Escape handling and focus restore. Neither Angular Aria nor the CDK has a
 * ready-made drawer. Put a `[uiDrawerHeader]` element inside for the header; the rest is the body.
 * It closes with its host.
 */
@Component({
  selector: 'ui-drawer',
  templateUrl: './drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UiIconComponent, UiIconButtonDirective]
})
export class UiDrawerComponent {
  visible = model(false);
  position = input<'left' | 'right'>('right');
  width = input('20rem');
  /** Close when the backdrop is clicked. */
  dismissible = input(true);
  ariaLabel = input('Drawer');
  protected readonly classes = drawerClasses;

  private dialog = inject(Dialog);
  private injector = inject(Injector);
  private panel = viewChild.required<TemplateRef<unknown>>('panel');
  /** Closes the open drawer; set while it is open. */
  private closeOpen?: () => void;
  private destroyed = false;

  constructor() {
    effect(() => {
      const visible = this.visible();
      untracked(() => (visible ? this.open() : this.closeOpen?.()));
    });
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.closeOpen?.();
    });
  }

  close(): void {
    this.visible.set(false);
  }

  private open(): void {
    if (this.closeOpen) return;
    const strategy = createGlobalPositionStrategy(this.injector).top('0');
    if (this.position() === 'right') strategy.right('0');
    else strategy.left('0');
    const ref = this.dialog.open(this.panel(), {
      positionStrategy: strategy,
      width: this.width(),
      maxWidth: '100vw',
      height: '100%',
      hasBackdrop: true,
      backdropClass: dialogBackdropClass,
      panelClass: drawerClasses.pane.split(' '),
      disableClose: true,
      ariaLabel: this.ariaLabel(),
      autoFocus: 'dialog'
    });
    this.closeOpen = () => ref.close();
    // These streams complete when the drawer closes. The CDK's own Escape handling is off because the backdrop is configurable.
    closeOnEscape(ref.keydownEvents, () => ref.close(undefined, { focusOrigin: 'keyboard' }));
    // eslint-disable-next-line rxjs-angular-x/prefer-takeuntil -- completes with the drawer
    ref.backdropClick.subscribe(() => this.dismissible() && ref.close(undefined, { focusOrigin: 'mouse' }));
    // eslint-disable-next-line rxjs-angular-x/prefer-takeuntil -- completes with the drawer
    ref.closed.subscribe(() => this.onClosed());
  }

  /** Called once the drawer has closed, however it closed. */
  private onClosed(): void {
    this.closeOpen = undefined;
    // A destroyed host's model can't emit.
    if (!this.destroyed) this.visible.set(false);
  }
}
