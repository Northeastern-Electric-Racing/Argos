import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

export interface EditRuleResult {
  expr: string;
  debounce_time: number;
}

@Component({
  selector: 'edit-rule-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './edit-rule-dialog.component.html',
  styleUrls: ['./edit-rule-dialog.component.css']
})
export class EditRuleDialogComponent {
  private ref = inject(DialogRef);
  private dialogData = inject(DIALOG_DATA);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    expr: [this.dialogData.expr as string, Validators.required],
    debounce_time: [this.dialogData.debounce_time as number, [Validators.required, Validators.min(0)]]
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const result: EditRuleResult = {
      expr: value.expr!,
      debounce_time: Number(value.debounce_time)
    };

    this.ref.close(result);
  }

  onCancel(): void {
    this.ref.close(null);
  }
}
