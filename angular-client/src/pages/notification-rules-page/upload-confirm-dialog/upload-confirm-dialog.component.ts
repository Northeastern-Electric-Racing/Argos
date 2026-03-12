import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ButtonDirective } from 'primeng/button';
import { RulePayload } from 'src/api/rules.api';

@Component({
  selector: 'upload-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonDirective],
  template: `
    <div class="confirm-content">
      <p>The following {{ rules.length }} rule(s) will be added:</p>
      <div class="rules-preview">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Topic</th>
              <th>Expression</th>
              <th>Debounce (s)</th>
            </tr>
          </thead>
          <tbody>
            @for (rule of rules; track rule.id) {
              <tr>
                <td>{{ rule.id }}</td>
                <td>{{ rule.topic }}</td>
                <td>{{ rule.expr }}</td>
                <td>{{ rule.debounce_time }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <div class="button-row">
        <button pButton label="Cancel" class="p-button-text" (click)="onCancel()"></button>
        <button pButton label="Confirm Upload" (click)="onConfirm()"></button>
      </div>
    </div>
  `,
  styles: [
    `
      .confirm-content p {
        margin-bottom: 12px;
        color: #ccc;
      }
      .rules-preview {
        max-height: 300px;
        overflow-y: auto;
        margin-bottom: 16px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.85rem;
      }
      th,
      td {
        padding: 6px 8px;
        text-align: left;
        border-bottom: 1px solid #444;
        color: #ddd;
      }
      th {
        color: #e74c3c;
        font-weight: 600;
      }
      .button-row {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
    `
  ]
})
export class UploadConfirmDialogComponent {
  private ref = inject(DynamicDialogRef);
  private config = inject(DynamicDialogConfig);

  rules: RulePayload[] = this.config.data.rules;

  onConfirm(): void {
    this.ref.close(true);
  }

  onCancel(): void {
    this.ref.close(false);
  }
}
