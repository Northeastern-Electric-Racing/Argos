import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { toast } from '@spartan-ng/brain/sonner';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePencil, lucideTrash2 } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCheckbox } from '@spartan-ng/helm/checkbox';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { HlmSpinner } from '@spartan-ng/helm/spinner';
import { HlmSwitch } from '@spartan-ng/helm/switch';
import { HlmTableImports } from '@spartan-ng/helm/table';
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
  imports: [HlmTableImports, HlmCheckbox, HlmSwitch, HlmButton, HlmSpinner, NgIcon],
  providers: [provideIcons({ lucidePencil, lucideTrash2 })],
  templateUrl: './rules-table.component.html',
  styleUrls: ['./rules-table.component.css']
})
export class RulesTableComponent implements OnInit {
  clientId = input.required<string>();
  searchTerm = input('');

  selectionChanged = output<ClientRule[]>();
  private dialogService = inject(HlmDialogService);

  rules = signal<ClientRule[]>([]);
  loading = signal(true);
  selectedRules = signal<ClientRule[]>([]);

  /** Rules whose expression, topic or id contains the search term (case-insensitive). */
  filteredRules = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return this.rules();
    return this.rules().filter((r) => [r.expr, r.topic, r.id].some((field) => field.toLowerCase().includes(term)));
  });
  private selectedIds = computed(() => new Set(this.selectedRules().map((r) => r.id)));
  allVisibleSelected = computed(() => {
    const visible = this.filteredRules();
    return visible.length > 0 && visible.every((r) => this.selectedIds().has(r.id));
  });
  someVisibleSelected = computed(
    () => !this.allVisibleSelected() && this.filteredRules().some((r) => this.selectedIds().has(r.id))
  );

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
        toast.error('Load Error', { description: 'Failed to fetch rules' });
      }
    } catch {
      toast.error('Load Error', { description: 'Network error' });
    }
    this.loading.set(false);
  }

  isSelected(rule: ClientRule): boolean {
    return this.selectedIds().has(rule.id);
  }

  toggleRow(rule: ClientRule, checked: boolean): void {
    const others = this.selectedRules().filter((r) => r.id !== rule.id);
    this.onSelectionChange(checked ? [...others, rule] : others);
  }

  toggleAllVisible(checked: boolean): void {
    const visibleIds = new Set(this.filteredRules().map((r) => r.id));
    const others = this.selectedRules().filter((r) => !visibleIds.has(r.id));
    this.onSelectionChange(checked ? [...others, ...this.filteredRules()] : others);
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
        toast.error('Error', { description: 'Failed to update subscription' });
      }
    } catch {
      this.rules.update((rules) => rules.map((r) => (r.id === rule.id ? { ...r, is_subscribed: !subscribed } : r)));
      toast.error('Error', { description: 'Network error' });
    }
  }

  onEdit(rule: ClientRule): void {
    const editRef = this.dialogService.open<EditRuleResult | null>(EditRuleDialogComponent, {
      contentClass: 'w-[450px] sm:max-w-[450px]',
      context: { header: `Edit Rule: ${rule.id}`, expr: rule.expr, debounce_time: rule.debounce_time }
    });

    // eslint-disable-next-line rxjs-angular-x/prefer-takeuntil -- one-shot dialog result; take(1) ends it, and tying it to destroy could drop the result
    editRef.closed$.pipe(take(1)).subscribe(async (result) => {
      if (!result) return;

      try {
        const response = await editRule(rule.id, result);
        if (response.ok) {
          this.rules.update((rules) =>
            rules.map((r) => (r.id === rule.id ? { ...r, expr: result.expr, debounce_time: result.debounce_time } : r))
          );
          toast.success('Updated', { description: `Rule "${rule.id}" updated` });
        } else {
          const text = await response.text();
          toast.error('Edit Failed', { description: text });
        }
      } catch {
        toast.error('Edit Failed', { description: 'Network error' });
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
        toast.success('Deleted', { description: `Rule "${rule.id}" removed` });
      } else {
        const text = await response.text();
        toast.error('Delete Failed', { description: text });
      }
    } catch {
      toast.error('Delete Failed', { description: 'Network error' });
    }
  }
}
