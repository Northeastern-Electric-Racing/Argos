import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, InjectionToken, Injector, Type, inject } from '@angular/core';
import { UiIconComponent } from 'src/ui/icon/icon.component';
import { Observable, Subject } from 'rxjs';
import { UiIconButtonDirective } from '../button/button.directive';
import { DialogDensity, dialogClasses } from '../recipes/dialog';

/** Handle to a non-modal panel from UiDialogService.openPanel; the same shape callers use on a DialogRef. */
export class UiPanelRef<R = unknown> {
  private readonly closedSubject = new Subject<R | undefined>();
  /** Emits once, with the result, when the panel closes. */
  readonly closed: Observable<R | undefined> = this.closedSubject;
  private onClose: () => void = () => undefined;

  /** @internal */
  setCloseHandler(handler: () => void): void {
    this.onClose = handler;
  }

  close(result?: R): void {
    if (this.closedSubject.closed) return;
    this.onClose();
    this.closedSubject.next(result);
    this.closedSubject.complete();
  }
}

/** What UiDialogService.openPanel tells the panel chrome. */
export interface UiPanelConfig {
  header?: string;
  titleId: string;
  draggable: boolean;
  density: DialogDensity;
  component: Type<unknown>;
}

export const UI_PANEL_CONFIG = new InjectionToken<UiPanelConfig>('UI_PANEL_CONFIG');

/**
 * Non-modal counterpart of UiDialogContainerComponent: the same header, close button and drag,
 * on a plain CDK overlay. No focus trap and no aria-hidden on the page, so the page
 * behind stays usable and readable.
 */
@Component({
  selector: 'ui-panel',
  templateUrl: './panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgComponentOutlet, CdkDrag, CdkDragHandle, UiIconComponent, UiIconButtonDirective],
  host: {
    class: 'block size-full max-h-[inherit] min-h-[inherit] outline-none',
    role: 'dialog',
    '[attr.aria-labelledby]': 'config.header ? config.titleId : null'
  }
})
export class UiPanelComponent {
  protected config = inject(UI_PANEL_CONFIG);
  protected readonly classes = dialogClasses[this.config.density];
  protected injector = inject(Injector);
  private ref = inject(UiPanelRef);

  close(): void {
    this.ref.close();
  }
}
