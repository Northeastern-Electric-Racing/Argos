import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmFieldImports } from '@spartan-ng/helm/field';

export interface EditRuleContext {
  header: string;
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
  imports: [ReactiveFormsModule, HlmInput, HlmFieldImports, HlmButton, HlmDialogImports],
  host: { class: 'grid gap-6 min-w-0' },
  templateUrl: './edit-rule-dialog.component.html'
})
export class EditRuleDialogComponent {
  private ref = inject(BrnDialogRef);
  protected context = injectBrnDialogContext<EditRuleContext>();
  private fb = inject(FormBuilder);

  form = this.fb.group({
    expr: [this.context.expr, Validators.required],
    debounce_time: [this.context.debounce_time, [Validators.required, Validators.min(0)]]
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
