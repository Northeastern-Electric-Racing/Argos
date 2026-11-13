import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiButtonDirective } from 'src/ui/button/button.directive';
import { UiFieldErrorDirective, UiInputDirective, UiLabelDirective } from 'src/ui/field/field.directive';
import { fieldClasses } from 'src/ui/recipes/field';

export interface EditRuleResult {
  expr: string;
  debounce_time: number;
}

@Component({
  selector: 'edit-rule-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, UiButtonDirective, UiInputDirective, UiLabelDirective, UiFieldErrorDirective],
  templateUrl: './edit-rule-dialog.component.html'
})
export class EditRuleDialogComponent {
  protected readonly f = fieldClasses;
  private ref = inject(DialogRef);
  private dialogData = inject(DIALOG_DATA);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    expr: [this.dialogData.expr as string, Validators.required],
    debounce_time: [this.dialogData.debounce_time as number, [Validators.required, Validators.min(0)]]
  });

  /** Whether a field shows an error, so its input gets aria-invalid and points at the message. */
  protected invalid(name: keyof EditRuleDialogComponent['form']['controls']): boolean {
    const control = this.form.controls[name];
    return control.touched && control.invalid;
  }

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
