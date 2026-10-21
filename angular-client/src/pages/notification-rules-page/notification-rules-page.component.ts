import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
  DestroyRef
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastService } from 'src/services/toast.service';
import { Router } from '@angular/router';
import { TuiDialogService, TuiIcon, TuiInput } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { appRoutes } from 'src/app/app-routes';
import TypographyComponent from 'src/components/typography/typography.component';
import { ButtonComponent } from 'src/components/argos-button/argos-button.component';
import {
  addRule,
  ClientRule,
  deleteRule,
  getRulesByClientId,
  RulePayload,
  RulesResponse,
  subscribeToRules,
  unsubscribeFromRules
} from 'src/api/rules.api';
import { UploadConfirmData, UploadConfirmDialogComponent } from './upload-confirm-dialog/upload-confirm-dialog.component';
import { AddRuleDialogComponent } from './add-rule-dialog/add-rule-dialog.component';
import { RulesTableComponent } from './rules-table/rules-table.component';
import { NotificationListComponent } from 'src/components/notification-list/notification-list.component';
import { downloadAsFile, FileReadError, readTextFile } from 'src/utils/file.utils';
import { injectConfirm } from 'src/utils/confirm.utils';

const CLIENT_ID_KEY = 'notification_rules_client_id';

/** CSV columns: id, topic, expr, debounce_time */
// TODO: add description and uploaded_by columns once backend supports them
const CSV_HEADERS = ['id', 'topic', 'expr', 'debounce_time'] as const;

@Component({
  selector: 'notification-rules-page',
  templateUrl: './notification-rules-page.component.html',
  styleUrls: ['./notification-rules-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TypographyComponent, ButtonComponent, TuiIcon, TuiInput, RulesTableComponent, NotificationListComponent]
})
export default class NotificationRulesPageComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private toasts = inject(ToastService);
  private dialogs = inject(TuiDialogService);
  private confirm = injectConfirm();
  private router = inject(Router);

  clientId!: string;
  fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  uploading = signal(false);
  downloading = signal(false);
  searchTerm = signal('');
  /** Selected rules — populated by the rules table */
  selectedRules = signal<ClientRule[]>([]);
  /** Whether the right-side notification stream rail is visible. */
  protected streamRailOpen = signal(true);

  rulesTable = viewChild<RulesTableComponent>('rulesTable');
  hasSelection = computed(() => this.selectedRules().length > 0);

  ngOnInit(): void {
    // clientId is guaranteed to exist — eagerly created by SocketService, which AppContextComponent injects at bootstrap
    this.clientId = localStorage.getItem(CLIENT_ID_KEY)!;
  }

  onViewLog = () => {
    this.router.navigateByUrl(appRoutes.notificationLogRoute());
  };

  onUpload = () => {
    this.fileInput()?.nativeElement.click();
  };

  onDownload = () => {
    this.downloadRulesAsCsv();
  };

  onAddRule = () => {
    this.dialogs
      .open<RulePayload | null>(new PolymorpheusComponent(AddRuleDialogComponent), { label: 'Add New Rule', size: 's' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(async (rule) => {
        if (!rule) return;

        try {
          const response = await addRule(this.clientId, rule);
          if (response.ok) {
            this.toasts.show(`Rule "${rule.id}" created`, { label: 'Rule Added', appearance: 'positive' });
            this.rulesTable()?.loadRules();
          } else {
            const text = await response.text();
            this.toasts.show(text, { label: 'Add Failed', appearance: 'negative' });
          }
        } catch {
          this.toasts.show('Network error', { label: 'Add Failed', appearance: 'negative' });
        }
      });
  };

  onRemoveSelected = () => {
    const selected = this.selectedRules();
    if (selected.length === 0) return;
    this.confirm('Delete Rules', { content: `Delete ${selected.length} selected rule(s)?`, yes: 'Delete', no: 'Cancel' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.removeRules(selected));
  };

  private removeRules = async (selected: ClientRule[]) => {
    const ids = selected.map((r) => r.id);
    const errors: string[] = [];
    for (const id of ids) {
      try {
        const response = await deleteRule(this.clientId, id);
        if (!response.ok) errors.push(id);
      } catch {
        errors.push(id);
      }
    }

    if (errors.length > 0) {
      this.toasts.show(`Failed to delete: ${errors.join(', ')}`, { label: 'Delete Error', appearance: 'negative' });
      // Keep failed rules selected so the user can retry
      const failedSet = new Set(errors);
      this.selectedRules.set(selected.filter((r) => failedSet.has(r.id)));
    } else {
      this.toasts.show(`${selected.length} rule(s) removed`, { label: 'Deleted', appearance: 'positive' });
      this.selectedRules.set([]);
    }

    this.rulesTable()?.loadRules();
  };

  onToggleSubscription = async () => {
    const selected = this.selectedRules();
    if (selected.length === 0) return;

    const toSubscribe = selected.filter((r) => !r.is_subscribed).map((r) => r.id);
    const toUnsubscribe = selected.filter((r) => r.is_subscribed).map((r) => r.id);

    try {
      const promises: Promise<Response>[] = [];
      if (toSubscribe.length > 0) {
        promises.push(subscribeToRules(this.clientId, toSubscribe));
      }
      if (toUnsubscribe.length > 0) {
        promises.push(unsubscribeFromRules(this.clientId, toUnsubscribe));
      }

      const results = await Promise.all(promises);
      const allOk = results.every((r) => r.ok);

      if (allOk) {
        const parts: string[] = [];
        if (toSubscribe.length > 0) parts.push(`subscribed to ${toSubscribe.length}`);
        if (toUnsubscribe.length > 0) parts.push(`unsubscribed from ${toUnsubscribe.length}`);
        this.toasts.show(`Toggled: ${parts.join(', ')}`, { label: 'Updated', appearance: 'positive' });
        this.rulesTable()?.loadRules();
      } else {
        this.toasts.show('Failed to update some subscriptions', { label: 'Error', appearance: 'negative' });
        this.rulesTable()?.loadRules();
      }
    } catch {
      this.toasts.show('Network error', { label: 'Error', appearance: 'negative' });
    }
  };

  onSelectionChanged(rules: ClientRule[]): void {
    this.selectedRules.set(rules);
  }

  onSearchInput(event: Event): void {
    const { value } = event.target as HTMLInputElement;
    this.searchTerm.set(value);
  }

  toggleStreamRail = () => {
    this.streamRailOpen.update((open) => !open);
  };

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Reset input so same file can be re-selected
    input.value = '';

    try {
      const text = await readTextFile(file, '.csv');
      this.parseCsvAndConfirm(text);
    } catch (err) {
      if (err instanceof FileReadError && err.kind === 'invalid-extension') {
        this.toasts.show('Please select a .csv file', { label: 'Invalid File', appearance: 'negative' });
      } else {
        this.toasts.show('Failed to read file', { label: 'Read Error', appearance: 'negative' });
      }
    }
  }

  private parseCsvAndConfirm(csv: string): void {
    const result = this.parseCsv(csv);
    if (!result) return;

    this.dialogs
      .open<boolean>(new PolymorpheusComponent(UploadConfirmDialogComponent), {
        label: 'Confirm Rule Upload',
        data: { rules: result } satisfies UploadConfirmData
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (confirmed) {
          this.batchAddRules(result);
        }
      });
  }

  private parseCsv(csv: string): RulePayload[] | null {
    const lines = csv
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      this.toasts.show('CSV must have a header row and at least one data row', {
        label: 'Parse Error',
        appearance: 'negative'
      });
      return null;
    }

    const headers = this.splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());

    for (const required of CSV_HEADERS) {
      if (!headers.includes(required)) {
        this.toasts.show(`Missing required column: ${required}. Expected: ${CSV_HEADERS.join(', ')}`, {
          label: 'Parse Error',
          appearance: 'negative'
        });
        return null;
      }
    }

    const idIdx = headers.indexOf('id');
    const topicIdx = headers.indexOf('topic');
    const exprIdx = headers.indexOf('expr');
    const debounceIdx = headers.indexOf('debounce_time');

    const rules: RulePayload[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = this.splitCsvLine(lines[i]);

      if (cols.length < headers.length) {
        errors.push(`Row ${i + 1}: not enough columns`);
        continue;
      }

      const id = cols[idIdx].trim();
      const topic = cols[topicIdx].trim();
      const expr = cols[exprIdx].trim();
      const debounceRaw = cols[debounceIdx].trim();

      if (!id || !topic || !expr) {
        errors.push(`Row ${i + 1}: id, topic, and expr are required`);
        continue;
      }

      const debounceTime = parseInt(debounceRaw, 10);
      if (isNaN(debounceTime) || debounceTime < 0) {
        errors.push(`Row ${i + 1}: debounce_time must be a non-negative integer`);
        continue;
      }

      rules.push({ id, topic, expr, debounce_time: debounceTime });
    }

    if (errors.length > 0) {
      this.toasts.show(errors.join('; '), { label: 'Parse Warnings', appearance: 'warning', autoClose: 8000 });
    }

    if (rules.length === 0) {
      this.toasts.show('No valid rules found in CSV', { label: 'Parse Error', appearance: 'negative' });
      return null;
    }

    return rules;
  }

  /** Handle quoted CSV fields (e.g. expressions containing commas) */
  private splitCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  private async batchAddRules(rules: RulePayload[]): Promise<void> {
    this.uploading.set(true);
    let successCount = 0;
    const errors: string[] = [];

    for (const rule of rules) {
      try {
        const response = await addRule(this.clientId, rule);
        if (response.ok) {
          successCount++;
        } else {
          const text = await response.text();
          errors.push(`${rule.id}: ${text}`);
        }
      } catch {
        errors.push(`${rule.id}: network error`);
      }
    }

    this.uploading.set(false);

    if (successCount > 0) {
      this.toasts.show(`${successCount} of ${rules.length} rule(s) added successfully`, {
        label: 'Upload Complete',
        appearance: 'positive'
      });
      this.rulesTable()?.loadRules();
    }

    if (errors.length > 0) {
      this.toasts.show(errors.join('; '), { label: 'Upload Errors', appearance: 'negative', autoClose: 8000 });
    }
  }

  private async downloadRulesAsCsv(): Promise<void> {
    this.downloading.set(true);

    try {
      const response = await getRulesByClientId(this.clientId);
      if (!response.ok) {
        this.toasts.show('Failed to fetch rules', { label: 'Download Error', appearance: 'negative' });
        this.downloading.set(false);
        return;
      }

      const data: RulesResponse = await response.json();
      const rules = data.client_rules;

      if (rules.length === 0) {
        this.toasts.show('No rules to export', { label: 'No Rules', appearance: 'info' });
        this.downloading.set(false);
        return;
      }

      // TODO: add description and uploaded_by columns once backend supports them
      const header = CSV_HEADERS.join(',');
      const rows = rules.map((r) =>
        [this.escapeCsvCell(r.id), this.escapeCsvCell(r.topic), this.escapeCsvCell(r.expr), String(r.debounce_time)].join(
          ','
        )
      );

      const csvContent = [header, ...rows].join('\n');
      downloadAsFile(
        `notification-rules-${new Date().toISOString().slice(0, 10)}.csv`,
        csvContent,
        'text/csv;charset=utf-8;'
      );
      this.toasts.show(`Exported ${rules.length} rule(s)`, { label: 'Downloaded', appearance: 'positive' });
    } catch {
      this.toasts.show('Failed to download rules', { label: 'Download Error', appearance: 'negative' });
    }

    this.downloading.set(false);
  }

  /** Escape a CSV cell value, preventing formula injection and handling special characters */
  private escapeCsvCell(value: string): string {
    // Prevent CSV formula injection by prefixing with single-quote
    if (/^[=+\-@\t\r]/.test(value)) {
      return `"'${value.replace(/"/g, '""')}"`;
    }
    // Quote fields containing commas, quotes, or newlines
    if (/[,"\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
