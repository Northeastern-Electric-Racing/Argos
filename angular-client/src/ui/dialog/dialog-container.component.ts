import { CdkDialogContainer, DialogRef } from '@angular/cdk/dialog';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { CdkPortalOutlet } from '@angular/cdk/portal';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { UiIconButtonDirective } from '../button/button.directive';
import { dialogClasses, headerlessContentClass } from './dialog.recipe';
import { UiDialogConfig } from './dialog.service';

/**
 * Our dialog chrome around CDK dialog content: header with title and close button,
 * dragged by the header when the dialog is draggable. Extends CdkDialogContainer so it keeps
 * the CDK's focus trap, initial focus and ARIA wiring (role, aria-labelledby on the title,
 * aria-describedby), as the CDK dialog guide recommends.
 */
@Component({
  selector: 'ui-dialog-container',
  templateUrl: './dialog-container.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [CdkPortalOutlet, CdkDrag, CdkDragHandle, MatIcon, UiIconButtonDirective],
  // Fill the overlay pane, which carries the requested width (what CdkDialogContainer's own styles did).
  host: { class: 'block size-full max-h-[inherit] min-h-[inherit] outline-none' }
})
export class UiDialogContainerComponent extends CdkDialogContainer<UiDialogConfig> {
  private ref = inject(DialogRef);
  protected readonly classes = dialogClasses[this._config.uiDensity];
  protected readonly headerlessContent = headerlessContentClass;

  close(): void {
    this.ref.close(undefined, { focusOrigin: 'mouse' });
  }
}
