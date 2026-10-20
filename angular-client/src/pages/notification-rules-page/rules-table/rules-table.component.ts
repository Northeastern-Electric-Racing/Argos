import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  output,
  signal,
  DestroyRef
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastService } from 'src/services/toast.service';
import { FormsModule } from '@angular/forms';
import { TuiTable, TuiTableControl } from '@taiga-ui/addon-table';
import { TuiButton, TuiCheckbox, TuiDialogService, TuiLoader } from '@taiga-ui/core';
import { TuiSwitch } from '@taiga-ui/kit';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import {
  ClientRule,
  deleteRule,
  editRule,
  getRulesByClientId,
  RulesResponse,
  subscribeToRules,
  unsubscribeFromRules
} from 'src/api/rules.api';
import { EditRuleData, EditRuleDialogComponent, EditRuleResult } from '../edit-rule-dialog/edit-rule-dialog.component';

@Component({
  selector: 'rules-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TuiTable, TuiTableControl, TuiButton, TuiCheckbox, TuiLoader, TuiSwitch, FormsModule],
  templateUrl: './rules-table.component.html',
  styleUrls: ['./rules-table.component.css']
})
export class RulesTableComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  clientId = input.required<string>();
  searchTerm = input('');

  selectionChanged = output<ClientRule[]>();

  private toasts = inject(ToastService);
  private dialogs = inject(TuiDialogService);

  rules = signal<ClientRule[]>([]);
  loading = signal(true);
  selectedRules = signal<ClientRule[]>([]);

  /** Rules whose expression, topic or ID contains the search term (case-insensitive) */
  filteredRules = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return this.rules();
    return this.rules().filter((rule) =>
      [rule.expr, rule.topic, rule.id].some((field) => field.toLowerCase().includes(term))
    );
  });

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
        this.reselect();
      } else {
        this.toasts.show('Failed to fetch rules', { label: 'Load Error', appearance: 'negative' });
      }
    } catch {
      this.toasts.show('Network error', { label: 'Load Error', appearance: 'negative' });
    }
    this.loading.set(false);
  }

  onSelectionChange(selected: readonly ClientRule[]): void {
    this.selectedRules.set([...selected]);
    this.selectionChanged.emit(this.selectedRules());
  }

  /** The table selects by object identity, so point the selection at the reloaded rule objects (matched by ID) */
  private reselect(): void {
    const selectedIds = new Set(this.selectedRules().map((rule) => rule.id));
    if (selectedIds.size === 0) return;
    this.onSelectionChange(this.rules().filter((rule) => selectedIds.has(rule.id)));
  }

  async onToggleSubscription(rule: ClientRule, subscribed: boolean): Promise<void> {
    const ruleIds = [rule.id];
    try {
      const response = subscribed
        ? await subscribeToRules(this.clientId(), ruleIds)
        : await unsubscribeFromRules(this.clientId(), ruleIds);
      if (response.ok) {
        this.rules.update((rules) => rules.map((r) => (r.id === rule.id ? { ...r, is_subscribed: subscribed } : r)));
        this.reselect();
      } else {
        // Revert the toggle on failure
        this.rules.update((rules) => rules.map((r) => (r.id === rule.id ? { ...r, is_subscribed: !subscribed } : r)));
        this.toasts.show('Failed to update subscription', { label: 'Error', appearance: 'negative' });
      }
    } catch {
      this.rules.update((rules) => rules.map((r) => (r.id === rule.id ? { ...r, is_subscribed: !subscribed } : r)));
      this.toasts.show('Network error', { label: 'Error', appearance: 'negative' });
    }
  }

  onEdit(rule: ClientRule): void {
    this.dialogs
      .open<EditRuleResult | null>(new PolymorpheusComponent(EditRuleDialogComponent), {
        label: `Edit Rule: ${rule.id}`,
        size: 's',
        data: { expr: rule.expr, debounce_time: rule.debounce_time } satisfies EditRuleData
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(async (result) => {
        if (!result) return;

        try {
          const response = await editRule(rule.id, result);
          if (response.ok) {
            this.rules.update((rules) =>
              rules.map((r) => (r.id === rule.id ? { ...r, expr: result.expr, debounce_time: result.debounce_time } : r))
            );
            this.reselect();
            this.toasts.show(`Rule "${rule.id}" updated`, { label: 'Updated', appearance: 'positive' });
          } else {
            const text = await response.text();
            this.toasts.show(text, { label: 'Edit Failed', appearance: 'negative' });
          }
        } catch {
          this.toasts.show('Network error', { label: 'Edit Failed', appearance: 'negative' });
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
        this.toasts.show(`Rule "${rule.id}" removed`, { label: 'Deleted', appearance: 'positive' });
      } else {
        const text = await response.text();
        this.toasts.show(text, { label: 'Delete Failed', appearance: 'negative' });
      }
    } catch {
      this.toasts.show('Network error', { label: 'Delete Failed', appearance: 'negative' });
    }
  }
}
