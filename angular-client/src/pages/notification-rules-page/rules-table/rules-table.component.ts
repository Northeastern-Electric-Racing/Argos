import { ChangeDetectionStrategy, Component, computed, effect, inject, input, OnInit, output, signal } from '@angular/core';
import { ToastService } from 'src/services/toast.service';
import { SelectionModel } from '@angular/cdk/collections';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
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
  imports: [MatTableModule, MatCheckbox, MatSlideToggle, MatIconButton, MatIcon, MatProgressBar],
  templateUrl: './rules-table.component.html',
  styleUrls: ['./rules-table.component.css']
})
export class RulesTableComponent implements OnInit {
  clientId = input.required<string>();
  searchTerm = input('');

  selectionChanged = output<ClientRule[]>();

  private messageService = inject(ToastService);
  private dialog = inject(MatDialog);

  rules = signal<ClientRule[]>([]);
  loading = signal(true);
  selectedRules = signal<ClientRule[]>([]);

  readonly columns = ['select', 'expr', 'topic', 'uploadedBy', 'description', 'subscribed', 'actions'];
  /** Multi-row selection, keyed by rule id so it survives the rules array being replaced. */
  readonly selection = new SelectionModel<ClientRule>(true, [], true, (a, b) => a.id === b.id);
  readonly dataSource = new MatTableDataSource<ClientRule>([]);
  /** Rows the search term currently shows; drives the header checkbox. */
  private filteredRules = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    return term ? this.rules().filter((r) => this.matchesSearch(r, term)) : this.rules();
  });

  constructor() {
    // Same fields PrimeNG's globalFilterFields searched: expr, topic and id.
    this.dataSource.filterPredicate = (rule, filter) => this.matchesSearch(rule, filter);
    effect(() => {
      this.dataSource.data = this.rules();
      this.dataSource.filter = this.searchTerm().trim().toLowerCase();
    });
  }

  private matchesSearch(rule: ClientRule, term: string): boolean {
    return [rule.expr, rule.topic, rule.id].some((field) => field.toLowerCase().includes(term));
  }

  isAllSelected(): boolean {
    const visible = this.filteredRules();
    return visible.length > 0 && visible.every((r) => this.selection.isSelected(r));
  }

  toggleAllRows(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.selection.select(...this.filteredRules());
    }
    this.onSelectionChange(this.selection.selected);
  }

  toggleRow(rule: ClientRule): void {
    this.selection.toggle(rule);
    this.onSelectionChange(this.selection.selected);
  }

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
    this.selectedRules.set([...selected]);
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
    const editRef = this.dialog.open(EditRuleDialogComponent, {
      width: '450px',
      data: { id: rule.id, expr: rule.expr, debounce_time: rule.debounce_time }
    });

    editRef
      .afterClosed()
      .pipe(take(1))
      // eslint-disable-next-line rxjs-angular-x/prefer-takeuntil -- one-shot dialog result; take(1) ends it, and tying it to destroy could drop the result
      .subscribe(async (result: EditRuleResult | null) => {
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
        this.selection.deselect(rule);
        this.onSelectionChange(this.selection.selected);
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
