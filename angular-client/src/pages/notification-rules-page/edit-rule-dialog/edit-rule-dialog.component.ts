import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TUI_VALIDATION_ERRORS, TuiButton, type TuiDialogContext, TuiError, TuiInput } from '@taiga-ui/core';
import { TuiInputNumber } from '@taiga-ui/kit';
import { TuiForm } from '@taiga-ui/layout';
import { injectContext } from '@taiga-ui/polymorpheus';

export interface EditRuleResult {
  expr: string;
  debounce_time: number;
}

export type EditRuleData = EditRuleResult;

/** Messages tui-error shows for the rule dialogs' validators */
export const RULE_VALIDATION_ERRORS = {
  provide: TUI_VALIDATION_ERRORS,
  useValue: { required: 'This field is required', min: 'Must be 0 or greater' }
};

@Component({
  selector: 'edit-rule-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TuiButton, TuiError, TuiInput, TuiInputNumber, TuiForm],
  providers: [RULE_VALIDATION_ERRORS],
  templateUrl: './edit-rule-dialog.component.html',
  styleUrls: ['./edit-rule-dialog.component.css']
})
export class EditRuleDialogComponent {
  private readonly context = injectContext<TuiDialogContext<EditRuleResult | null, EditRuleData>>();
  private fb = inject(FormBuilder);

  form = this.fb.group({
    expr: [this.context.data.expr, Validators.required],
    debounce_time: [this.context.data.debounce_time, [Validators.required, Validators.min(0)]]
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

    this.context.completeWith(result);
  }

  onCancel(): void {
    this.context.completeWith(null);
  }
}
