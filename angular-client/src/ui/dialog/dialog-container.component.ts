import { CdkDialogContainer, DialogRef } from '@angular/cdk/dialog';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { CdkPortalOutlet } from '@angular/cdk/portal';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
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
  styleUrls: ['./dialog-container.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [CdkPortalOutlet, CdkDrag, CdkDragHandle, MatIcon],
  host: { class: 'ui-dialog' }
})
export class UiDialogContainerComponent extends CdkDialogContainer<UiDialogConfig> {
  private ref = inject(DialogRef);

  close(): void {
    this.ref.close(undefined, { focusOrigin: 'mouse' });
  }
}
