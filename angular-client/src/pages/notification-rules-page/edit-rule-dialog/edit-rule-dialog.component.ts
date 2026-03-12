import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputText } from 'primeng/inputtext';
import { ButtonDirective } from 'primeng/button';

export interface EditRuleResult {
  expr: string;
  debounce_time: number;
}

@Component({
  selector: 'edit-rule-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, InputText, ButtonDirective],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <div class="field">
        <label for="edit-expr">Expression</label>
        <input id="edit-expr" pInputText formControlName="expr" />
        @if (form.get('expr')?.touched && form.get('expr')?.hasError('required')) {
          <small class="error" role="alert">Expression is required</small>
        }
      </div>

      <div class="field">
        <label for="edit-debounce">Debounce Time (seconds)</label>
        <input id="edit-debounce" pInputText formControlName="debounce_time" type="number" />
        @if (form.get('debounce_time')?.touched && form.get('debounce_time')?.hasError('required')) {
          <small class="error" role="alert">Debounce time is required</small>
        }
        @if (form.get('debounce_time')?.touched && form.get('debounce_time')?.hasError('min')) {
          <small class="error" role="alert">Must be 0 or greater</small>
        }
      </div>

      <div class="button-row">
        <button pButton type="button" label="Cancel" class="p-button-text" (click)="onCancel()"></button>
        <button pButton type="submit" label="Save"></button>
      </div>
    </form>
  `,
  styles: [
    `
      form {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .field label {
        color: #ccc;
        font-size: 0.85rem;
        font-weight: 600;
      }
      .field input {
        width: 100%;
      }
      .error {
        color: #e74c3c;
        font-size: 0.8rem;
      }
      .button-row {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 8px;
      }
    `
  ]
})
export class EditRuleDialogComponent {
  private ref = inject(DynamicDialogRef);
  private config = inject(DynamicDialogConfig);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    expr: [this.config.data.expr as string, Validators.required],
    debounce_time: [this.config.data.debounce_time as number, [Validators.required, Validators.min(0)]]
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
