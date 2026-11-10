import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RulePayload } from 'src/api/rules.api';
import { UiButtonDirective } from 'src/ui/button/button.directive';
import { fieldClasses } from 'src/ui/recipes/field';
import { cellClass, headerCellClass, rowClass, tableClass } from 'src/ui/recipes/table';

@Component({
  selector: 'upload-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UiButtonDirective],
  templateUrl: './upload-confirm-dialog.component.html'
})
export class UploadConfirmDialogComponent {
  private ref = inject(DialogRef);
  private dialogData = inject(DIALOG_DATA);

  protected readonly f = fieldClasses;
  protected readonly table = tableClass('sm');
  protected readonly th = headerCellClass('phone');
  protected readonly td = cellClass('phone');
  protected readonly row = rowClass({ striped: true });

  rules: RulePayload[] = this.dialogData.rules;
  /** Each rule with its topic split after every slash, where a narrow column may break it (never mid-word). */
  protected readonly rows = this.rules.map((rule) => ({
    ...rule,
    topicSegments: rule.topic.split(/(?<=\/)/)
  }));

  onConfirm(): void {
    this.ref.close(true);
  }

  onCancel(): void {
    this.ref.close(false);
  }
}
