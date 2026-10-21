import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { map, take } from 'rxjs';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
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
  imports: [NzTableModule, NzSwitchModule, FormsModule, NzButtonModule, NzIconModule],
  templateUrl: './rules-table.component.html',
  styleUrls: ['./rules-table.component.css']
})
export class RulesTableComponent implements OnInit {
  clientId = input.required<string>();
  searchTerm = input('');

  selectionChanged = output<ClientRule[]>();

  private notification = inject(NzNotificationService);
  private modal = inject(NzModalService);

  /** On narrow screens the Uploaded By and Description columns are left out, so nz-table sizes the rest to fit. */
  isMobile = toSignal(
    inject(BreakpointObserver)
      .observe('(max-width: 768px)')
      .pipe(map((state) => state.matches)),
    {
      initialValue: false
    }
  );

  rules = signal<ClientRule[]>([]);
  loading = signal(true);
  selectedRules = signal<ClientRule[]>([]);

  selectedIds = computed(() => new Set(this.selectedRules().map((r) => r.id)));

  /** Rules whose expression, topic or id contains the search term (case-insensitive). */
  filteredRules = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return this.rules();
    return this.rules().filter((r) => [r.expr, r.topic, r.id].some((f) => f.toLowerCase().includes(term)));
  });
  allChecked = computed(() => {
    const visible = this.filteredRules();
    return visible.length > 0 && visible.every((r) => this.selectedIds().has(r.id));
  });
  indeterminate = computed(() => !this.allChecked() && this.filteredRules().some((r) => this.selectedIds().has(r.id)));

  private editRef: NzModalRef | undefined;

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
        this.notification.create('error', 'Load Error', 'Failed to fetch rules');
      }
    } catch {
      this.notification.create('error', 'Load Error', 'Network error');
    }
    this.loading.set(false);
  }

  onSelectionChange(selected: ClientRule[]): void {
    this.selectedRules.set(selected);
    this.selectionChanged.emit(selected);
  }

  onItemChecked(rule: ClientRule, checked: boolean): void {
    const others = this.selectedRules().filter((r) => r.id !== rule.id);
    this.onSelectionChange(checked ? [...others, rule] : others);
  }

  /** Header checkbox: selects or clears every rule currently shown. */
  onAllChecked(checked: boolean): void {
    const visibleIds = new Set(this.filteredRules().map((r) => r.id));
    const others = this.selectedRules().filter((r) => !visibleIds.has(r.id));
    this.onSelectionChange(checked ? [...others, ...this.filteredRules()] : others);
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
        this.notification.create('error', 'Error', 'Failed to update subscription');
      }
    } catch {
      this.rules.update((rules) => rules.map((r) => (r.id === rule.id ? { ...r, is_subscribed: !subscribed } : r)));
      this.notification.create('error', 'Error', 'Network error');
    }
  }

  onEdit(rule: ClientRule): void {
    this.editRef = this.modal.create({
      nzContent: EditRuleDialogComponent,
      nzFooter: null,
      nzTitle: `Edit Rule: ${rule.id}`,
      nzWidth: 450,
      nzData: { expr: rule.expr, debounce_time: rule.debounce_time }
    });

    // eslint-disable-next-line rxjs-angular-x/prefer-takeuntil -- one-shot dialog result; take(1) ends it, and tying it to destroy could drop the result
    this.editRef.afterClose.pipe(take(1)).subscribe(async (result: EditRuleResult | null) => {
      if (!result) return;

      try {
        const response = await editRule(rule.id, result);
        if (response.ok) {
          this.rules.update((rules) =>
            rules.map((r) => (r.id === rule.id ? { ...r, expr: result.expr, debounce_time: result.debounce_time } : r))
          );
          this.notification.create('success', 'Updated', `Rule "${rule.id}" updated`);
        } else {
          const text = await response.text();
          this.notification.create('error', 'Edit Failed', text);
        }
      } catch {
        this.notification.create('error', 'Edit Failed', 'Network error');
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
        this.notification.create('success', 'Deleted', `Rule "${rule.id}" removed`);
      } else {
        const text = await response.text();
        this.notification.create('error', 'Delete Failed', text);
      }
    } catch {
      this.notification.create('error', 'Delete Failed', 'Network error');
    }
  }
}
