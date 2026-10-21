import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { take } from 'rxjs';
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
import { UploadConfirmDialogComponent } from './upload-confirm-dialog/upload-confirm-dialog.component';
import { AddRuleDialogComponent } from './add-rule-dialog/add-rule-dialog.component';
import { RulesTableComponent } from './rules-table/rules-table.component';
import { NotificationListComponent } from 'src/components/notification-list/notification-list.component';
import { downloadAsFile, FileReadError, readTextFile } from 'src/utils/file.utils';

const CLIENT_ID_KEY = 'notification_rules_client_id';

/** CSV columns: id, topic, expr, debounce_time */
// TODO: add description and uploaded_by columns once backend supports them
const CSV_HEADERS = ['id', 'topic', 'expr', 'debounce_time'] as const;

@Component({
  selector: 'notification-rules-page',
  templateUrl: './notification-rules-page.component.html',
  styleUrls: ['./notification-rules-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TypographyComponent,
    ButtonComponent,
    NzInputModule,
    NzIconModule,
    RulesTableComponent,
    NotificationListComponent
  ]
})
export default class NotificationRulesPageComponent implements OnInit {
  private notification = inject(NzNotificationService);
  private modal = inject(NzModalService);
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

  private confirmRef: NzModalRef | undefined;
  private addRuleRef: NzModalRef | undefined;

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
    this.addRuleRef = this.modal.create({
      nzContent: AddRuleDialogComponent,
      nzFooter: null,
      nzTitle: 'Add New Rule',
      nzWidth: 500
    });

    // eslint-disable-next-line rxjs-angular-x/prefer-takeuntil -- one-shot dialog result; take(1) ends it, and tying it to destroy could drop the result
    this.addRuleRef.afterClose.pipe(take(1)).subscribe(async (rule: RulePayload | null) => {
      if (!rule) return;

      try {
        const response = await addRule(this.clientId, rule);
        if (response.ok) {
          this.notification.create('success', 'Rule Added', `Rule "${rule.id}" created`);
          this.rulesTable()?.loadRules();
        } else {
          const text = await response.text();
          this.notification.create('error', 'Add Failed', text);
        }
      } catch {
        this.notification.create('error', 'Add Failed', 'Network error');
      }
    });
  };

  onRemoveSelected = () => {
    const selected = this.selectedRules();
    if (selected.length === 0) return;
    this.modal.confirm({
      nzTitle: 'Delete Rules',
      nzContent: `Delete ${selected.length} selected rule(s)?`,
      nzOkText: 'Delete',
      nzOkDanger: true,
      nzCancelText: 'Cancel',
      nzOnOk: () => this.removeRules(selected)
    });
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
      this.notification.create('error', 'Delete Error', `Failed to delete: ${errors.join(', ')}`);
      // Keep failed rules selected so the user can retry
      const failedSet = new Set(errors);
      this.selectedRules.set(selected.filter((r) => failedSet.has(r.id)));
    } else {
      this.notification.create('success', 'Deleted', `${selected.length} rule(s) removed`);
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
        this.notification.create('success', 'Updated', `Toggled: ${parts.join(', ')}`);
        this.rulesTable()?.loadRules();
      } else {
        this.notification.create('error', 'Error', 'Failed to update some subscriptions');
        this.rulesTable()?.loadRules();
      }
    } catch {
      this.notification.create('error', 'Error', 'Network error');
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
        this.notification.create('error', 'Invalid File', 'Please select a .csv file');
      } else {
        this.notification.create('error', 'Read Error', 'Failed to read file');
      }
    }
  }

  private parseCsvAndConfirm(csv: string): void {
    const result = this.parseCsv(csv);
    if (!result) return;

    this.confirmRef = this.modal.create({
      nzContent: UploadConfirmDialogComponent,
      nzFooter: null,
      nzTitle: 'Confirm Rule Upload',
      nzWidth: 600,
      nzData: { rules: result }
    });

    // eslint-disable-next-line rxjs-angular-x/prefer-takeuntil -- one-shot dialog result; take(1) ends it, and tying it to destroy could drop the result
    this.confirmRef.afterClose.pipe(take(1)).subscribe((confirmed: boolean | undefined) => {
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
      this.notification.create('error', 'Parse Error', 'CSV must have a header row and at least one data row');
      return null;
    }

    const headers = this.splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());

    for (const required of CSV_HEADERS) {
      if (!headers.includes(required)) {
        this.notification.create(
          'error',
          'Parse Error',
          `Missing required column: ${required}. Expected: ${CSV_HEADERS.join(', ')}`
        );
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
      this.notification.create('warning', 'Parse Warnings', errors.join('; '), { nzDuration: 8000 });
    }

    if (rules.length === 0) {
      this.notification.create('error', 'Parse Error', 'No valid rules found in CSV');
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
      this.notification.create(
        'success',
        'Upload Complete',
        `${successCount} of ${rules.length} rule(s) added successfully`
      );
      this.rulesTable()?.loadRules();
    }

    if (errors.length > 0) {
      this.notification.create('error', 'Upload Errors', errors.join('; '), { nzDuration: 8000 });
    }
  }

  private async downloadRulesAsCsv(): Promise<void> {
    this.downloading.set(true);

    try {
      const response = await getRulesByClientId(this.clientId);
      if (!response.ok) {
        this.notification.create('error', 'Download Error', 'Failed to fetch rules');
        this.downloading.set(false);
        return;
      }

      const data: RulesResponse = await response.json();
      const rules = data.client_rules;

      if (rules.length === 0) {
        this.notification.create('info', 'No Rules', 'No rules to export');
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
      this.notification.create('success', 'Downloaded', `Exported ${rules.length} rule(s)`);
    } catch {
      this.notification.create('error', 'Download Error', 'Failed to download rules');
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
