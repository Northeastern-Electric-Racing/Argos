import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiAutoFocus } from '@taiga-ui/cdk';
import { TuiButton, type TuiDialogContext, TuiError, TuiInput } from '@taiga-ui/core';
import { TuiInputNumber } from '@taiga-ui/kit';
import { TuiForm } from '@taiga-ui/layout';
import { injectContext } from '@taiga-ui/polymorpheus';
import { requiredWithMessage, RULE_VALIDATION_ERRORS } from './rule-validators';

export interface EditRuleResult {
  expr: string;
  debounce_time: number;
}

export type EditRuleData = EditRuleResult;

@Component({
  selector: 'edit-rule-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TuiAutoFocus, TuiButton, TuiError, TuiInput, TuiInputNumber, TuiForm],
  providers: [RULE_VALIDATION_ERRORS],
  templateUrl: './edit-rule-dialog.component.html',
  styleUrls: ['./edit-rule-dialog.component.css']
})
export class EditRuleDialogComponent {
  private readonly context = injectContext<TuiDialogContext<EditRuleResult | null, EditRuleData>>();
  private fb = inject(FormBuilder);

  form = this.fb.group({
    expr: [this.context.data.expr, requiredWithMessage('Expression is required')],
    debounce_time: [this.context.data.debounce_time, [requiredWithMessage('Debounce time is required'), Validators.min(0)]]
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
