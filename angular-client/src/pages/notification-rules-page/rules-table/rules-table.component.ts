import { DialogRef } from '@angular/cdk/dialog';
import { ToastService } from 'src/ui/toast/toast.service';
import { UiDialogService } from 'src/ui/dialog/dialog.service';
import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { CdkTableModule } from '@angular/cdk/table';
import { MatIcon } from '@angular/material/icon';
import { UiSwitchComponent } from 'src/ui/switch/switch.component';
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
  imports: [CdkTableModule, UiSwitchComponent, MatIcon],
  templateUrl: './rules-table.component.html',
  styleUrls: ['./rules-table.component.css']
})
export class RulesTableComponent implements OnInit {
  clientId = input.required<string>();
  searchTerm = input('');

  selectionChanged = output<ClientRule[]>();

  private messageService = inject(ToastService);
  private dialogService = inject(UiDialogService);

  rules = signal<ClientRule[]>([]);
  loading = signal(true);
  selectedRules = signal<ClientRule[]>([]);

  readonly columns = ['select', 'expr', 'topic', 'uploadedBy', 'description', 'subscribed', 'actions'];

  /** Global "contains" filter over id, expr and topic (what PrimeNG's filterGlobal did). */
  filteredRules = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return this.rules();
    return this.rules().filter((r) => [r.expr, r.topic, r.id].some((field) => field.toLowerCase().includes(term)));
  });
  private selectedIds = computed(() => new Set(this.selectedRules().map((r) => r.id)));
  allSelected = computed(() => {
    const visible = this.filteredRules();
    return visible.length > 0 && visible.every((r) => this.selectedIds().has(r.id));
  });
  someSelected = computed(() => !this.allSelected() && this.filteredRules().some((r) => this.selectedIds().has(r.id)));

  trackById = (_: number, rule: ClientRule) => rule.id;

  isSelected(rule: ClientRule): boolean {
    return this.selectedIds().has(rule.id);
  }

  toggleRow(rule: ClientRule): void {
    const next = this.isSelected(rule)
      ? this.selectedRules().filter((r) => r.id !== rule.id)
      : [...this.selectedRules(), rule];
    this.onSelectionChange(next);
  }

  toggleAll(): void {
    this.onSelectionChange(this.allSelected() ? [] : [...this.filteredRules()]);
  }

  private editRef: DialogRef<EditRuleResult | null> | null | undefined;

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
    const ruleIds = [rule.id];
    try {
      const response = subscribed
        ? await subscribeToRules(this.clientId(), ruleIds)
        : await unsubscribeFromRules(this.clientId(), ruleIds);
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
    this.editRef = this.dialogService.open<EditRuleResult | null>(EditRuleDialogComponent, {
      header: `Edit Rule: ${rule.id}`,
      width: '450px',
      data: { expr: rule.expr, debounce_time: rule.debounce_time }
    });

    // eslint-disable-next-line rxjs-angular-x/prefer-takeuntil -- one-shot dialog result; take(1) ends it, and tying it to destroy could drop the result
    this.editRef?.closed.pipe(take(1)).subscribe(async (result) => {
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
