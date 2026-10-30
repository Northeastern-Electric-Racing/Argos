import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';

export interface EditRuleData {
  id: string;
  expr: string;
  debounce_time: number;
}

export interface EditRuleResult {
  expr: string;
  debounce_time: number;
}

@Component({
  selector: 'edit-rule-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatFormField,
    MatLabel,
    MatError,
    MatInput,
    MatButton
  ],
  templateUrl: './edit-rule-dialog.component.html',
  styleUrls: ['./edit-rule-dialog.component.css']
})
export class EditRuleDialogComponent {
  private ref = inject(MatDialogRef<EditRuleDialogComponent, EditRuleResult | null>);
  protected data = inject<EditRuleData>(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    expr: [this.data.expr, Validators.required],
    debounce_time: [this.data.debounce_time, [Validators.required, Validators.min(0)]]
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
