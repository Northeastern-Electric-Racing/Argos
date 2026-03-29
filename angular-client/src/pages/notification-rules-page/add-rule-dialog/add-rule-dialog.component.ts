import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputText } from 'primeng/inputtext';
import { ButtonDirective } from 'primeng/button';
import { RulePayload } from 'src/api/rules.api';

@Component({
  selector: 'add-rule-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, InputText, ButtonDirective],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <div class="field">
        <label for="rule-id">Rule ID</label>
        <input id="rule-id" pInputText formControlName="id" placeholder="e.g. high-voltage-alert" />
        @if (form.get('id')?.touched && form.get('id')?.hasError('required')) {
          <small class="error" role="alert">Rule ID is required</small>
        }
      </div>

      <div class="field">
        <label for="rule-topic">Topic</label>
        <input id="rule-topic" pInputText formControlName="topic" placeholder="e.g. BMS/Pack/Voltage" />
        @if (form.get('topic')?.touched && form.get('topic')?.hasError('required')) {
          <small class="error" role="alert">Topic is required</small>
        }
      </div>

      <div class="field">
        <label for="rule-expr">Expression</label>
        <input id="rule-expr" pInputText formControlName="expr" placeholder="e.g. a > 5.0 || a < 1.0" />
        @if (form.get('expr')?.touched && form.get('expr')?.hasError('required')) {
          <small class="error" role="alert">Expression is required</small>
        }
      </div>

      <div class="field">
        <label for="rule-debounce">Debounce Time (seconds)</label>
        <input id="rule-debounce" pInputText formControlName="debounce_time" type="number" placeholder="e.g. 60" />
        @if (form.get('debounce_time')?.touched && form.get('debounce_time')?.hasError('required')) {
          <small class="error" role="alert">Debounce time is required</small>
        }
        @if (form.get('debounce_time')?.touched && form.get('debounce_time')?.hasError('min')) {
          <small class="error" role="alert">Must be 0 or greater</small>
        }
      </div>

      <!-- TODO: add description field once backend supports it -->

      <div class="button-row">
        <button pButton type="button" label="Cancel" class="p-button-text" (click)="onCancel()"></button>
        <button pButton type="submit" label="Add Rule"></button>
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
export class AddRuleDialogComponent {
  private ref = inject(DynamicDialogRef);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    id: ['', Validators.required],
    topic: ['', Validators.required],
    expr: ['', Validators.required],
    debounce_time: [60, [Validators.required, Validators.min(0)]]
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const rule: RulePayload = {
      id: value.id!,
      topic: value.topic!,
      expr: value.expr!,
      debounce_time: Number(value.debounce_time)
    };

    this.ref.close(rule);
  }

  onCancel(): void {
    this.ref.close(null);
  }
}
