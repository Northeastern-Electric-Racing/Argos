import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TableModule } from 'primeng/table';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { FormsModule } from '@angular/forms';
import { ButtonDirective } from 'primeng/button';
import { take } from 'rxjs';
import {
  ClientRule,
  deleteRule,
  editRule,
  getRulesByClientId,
  RulesResponse,
  subscribeToRules,
  unsubscribeFromRules
} from 'src/api/rules.api';
import { EditRuleDialogComponent, EditRuleResult } from '../edit-rule-dialog/edit-rule-dialog.component';

@Component({
  selector: 'rules-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TableModule, ToggleSwitch, FormsModule, ButtonDirective],
  templateUrl: './rules-table.component.html',
  styleUrls: ['./rules-table.component.css']
})
export class RulesTableComponent implements OnInit {
  clientId = input.required<string>();
  searchTerm = input('');

  selectionChanged = output<ClientRule[]>();

  private messageService = inject(MessageService);
  private dialogService = inject(DialogService);

  rules = signal<ClientRule[]>([]);
  loading = signal(true);
  selectedRules = signal<ClientRule[]>([]);

  filteredRules = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const all = this.rules();
    if (!term) return all;
    return all.filter(
      (r) =>
        r.expr.toLowerCase().includes(term) ||
        r.topic.toLowerCase().includes(term) ||
        r.id.toLowerCase().includes(term)
    );
  });

  private editRef: DynamicDialogRef | undefined;

  ngOnInit(): void {
    this.loadRules();
  }

  async loadRules(): Promise<void> {
    this.loading.set(true);
    try {
      const response = await getRulesByClientId(this.clientId());
      if (response.ok) {
        const data: RulesResponse = await response.json();
        this.rules.set(data.client_rules);
      } else {
        this.messageService.add({ severity: 'error', summary: 'Load Error', detail: 'Failed to fetch rules' });
      }
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Load Error', detail: 'Network error' });
    }
    this.loading.set(false);
  }

  onSelectionChange(selected: ClientRule[]): void {
    this.selectedRules.set(selected);
    this.selectionChanged.emit(selected);
  }

  async onToggleSubscription(rule: ClientRule, subscribed: boolean): Promise<void> {
    const request = { rule_ids: [rule.id], client_id: this.clientId() };
    try {
      const response = subscribed ? await subscribeToRules(request) : await unsubscribeFromRules(request);
      if (response.ok) {
        this.rules.update((rules) => rules.map((r) => (r.id === rule.id ? { ...r, is_subscribed: subscribed } : r)));
      } else {
        // Revert the toggle on failure
        this.rules.update((rules) => rules.map((r) => (r.id === rule.id ? { ...r, is_subscribed: !subscribed } : r)));
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update subscription' });
      }
    } catch {
      this.rules.update((rules) => rules.map((r) => (r.id === rule.id ? { ...r, is_subscribed: !subscribed } : r)));
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Network error' });
    }
  }

  onEdit(rule: ClientRule): void {
    this.editRef = this.dialogService.open(EditRuleDialogComponent, {
      header: `Edit Rule: ${rule.id}`,
      width: '450px',
      closable: true,
      closeAriaLabel: 'Close',
      data: { expr: rule.expr, debounce_time: rule.debounce_time }
    });

    this.editRef.onClose.pipe(take(1)).subscribe(async (result: EditRuleResult | null) => {
      if (!result) return;

      try {
        const response = await editRule(rule.id, result);
        if (response.ok) {
          this.rules.update((rules) =>
            rules.map((r) => (r.id === rule.id ? { ...r, expr: result.expr, debounce_time: result.debounce_time } : r))
          );
          this.messageService.add({ severity: 'success', summary: 'Updated', detail: `Rule "${rule.id}" updated` });
        } else {
          const text = await response.text();
          this.messageService.add({ severity: 'error', summary: 'Edit Failed', detail: text });
        }
      } catch {
        this.messageService.add({ severity: 'error', summary: 'Edit Failed', detail: 'Network error' });
      }
    });
  }

  async onDelete(rule: ClientRule): Promise<void> {
    if (!confirm(`Delete rule "${rule.id}"?`)) return;

    try {
      const response = await deleteRule(this.clientId(), rule.id);
      if (response.ok) {
        this.rules.update((rules) => rules.filter((r) => r.id !== rule.id));
        this.selectedRules.update((sel) => sel.filter((r) => r.id !== rule.id));
        this.selectionChanged.emit(this.selectedRules());
        this.messageService.add({ severity: 'success', summary: 'Deleted', detail: `Rule "${rule.id}" removed` });
      } else {
        const text = await response.text();
        this.messageService.add({ severity: 'error', summary: 'Delete Failed', detail: text });
      }
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Delete Failed', detail: 'Network error' });
    }
  }
}
