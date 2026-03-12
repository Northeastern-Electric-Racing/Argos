import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { MessageService } from 'primeng/api';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputText } from 'primeng/inputtext';
import { take } from 'rxjs';
import TypographyComponent from 'src/components/typography/typography.component';
import { ButtonComponent } from 'src/components/argos-button/argos-button.component';
import {
  addRule,
  deleteRule,
  getRulesByClientId,
  RulePayload,
  RulesResponse,
  subscribeToRules
} from 'src/api/rules.api';
import { UploadConfirmDialogComponent } from './upload-confirm-dialog/upload-confirm-dialog.component';
import { AddRuleDialogComponent } from './add-rule-dialog/add-rule-dialog.component';
import { RulesTableComponent } from './rules-table/rules-table.component';

const CLIENT_ID_KEY = 'notification_rules_client_id';

/** CSV columns: id, topic, expr, debounce_time */
// TODO: add description and uploaded_by columns once backend supports them
const CSV_HEADERS = ['id', 'topic', 'expr', 'debounce_time'] as const;

@Component({
  selector: 'notification-rules-page',
  templateUrl: './notification-rules-page.component.html',
  styleUrls: ['./notification-rules-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TypographyComponent, ButtonComponent, InputText, RulesTableComponent]
})
export default class NotificationRulesPageComponent implements OnInit {
  private messageService = inject(MessageService);
  private dialogService = inject(DialogService);

  clientId!: string;
  fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  uploading = signal(false);
  downloading = signal(false);
  searchTerm = signal('');
  /** Selected rule IDs — populated by the rules table (#535) */
  selectedRuleIds = signal<string[]>([]);

  rulesTable = viewChild<RulesTableComponent>('rulesTable');
  hasSelection = computed(() => this.selectedRuleIds().length > 0);

  private confirmRef: DynamicDialogRef | undefined;
  private addRuleRef: DynamicDialogRef | undefined;

  ngOnInit(): void {
    this.clientId = this.getOrCreateClientId();
  }

  onUpload = () => {
    this.fileInput()?.nativeElement.click();
  };

  onDownload = () => {
    this.downloadRulesAsCsv();
  };

  onAddRule = () => {
    this.addRuleRef = this.dialogService.open(AddRuleDialogComponent, {
      header: 'Add New Rule',
      width: '500px',
      closable: true,
      closeAriaLabel: 'Close'
    });

    this.addRuleRef.onClose.pipe(take(1)).subscribe(async (rule: RulePayload | null) => {
      if (!rule) return;

      try {
        const response = await addRule(this.clientId, rule);
        if (response.ok) {
          this.messageService.add({ severity: 'success', summary: 'Rule Added', detail: `Rule "${rule.id}" created` });
          this.rulesTable()?.loadRules();
        } else {
          const text = await response.text();
          this.messageService.add({ severity: 'error', summary: 'Add Failed', detail: text });
        }
      } catch {
        this.messageService.add({ severity: 'error', summary: 'Add Failed', detail: 'Network error' });
      }
    });
  };

  onRemoveSelected = async () => {
    const ids = this.selectedRuleIds();
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} selected rule(s)?`)) return;

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
      this.messageService.add({ severity: 'error', summary: 'Delete Error', detail: `Failed to delete: ${errors.join(', ')}` });
    } else {
      this.messageService.add({ severity: 'success', summary: 'Deleted', detail: `${ids.length} rule(s) removed` });
    }

    this.selectedRuleIds.set([]);
    this.rulesTable()?.loadRules();
  };

  onToggleSubscription = async () => {
    const ids = this.selectedRuleIds();
    if (ids.length === 0) return;

    const request = { rule_ids: ids, client_id: this.clientId };
    try {
      const response = await subscribeToRules(request);
      if (response.ok) {
        this.messageService.add({ severity: 'success', summary: 'Subscribed', detail: `Subscribed to ${ids.length} rule(s)` });
        this.rulesTable()?.loadRules();
      } else {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update subscriptions' });
      }
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Network error' });
    }
  };

  onSelectionChanged(ruleIds: string[]): void {
    this.selectedRuleIds.set(ruleIds);
  }

  onSearchInput(event: Event): void {
    const { value } = event.target as HTMLInputElement;
    this.searchTerm.set(value);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Reset input so same file can be re-selected
    input.value = '';

    if (!file.name.endsWith('.csv')) {
      this.messageService.add({ severity: 'error', summary: 'Invalid File', detail: 'Please select a .csv file' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      this.parseCsvAndConfirm(text);
    };
    reader.onerror = () => {
      this.messageService.add({ severity: 'error', summary: 'Read Error', detail: 'Failed to read file' });
    };
    reader.readAsText(file);
  }

  private parseCsvAndConfirm(csv: string): void {
    const result = this.parseCsv(csv);
    if (!result) return;

    this.confirmRef = this.dialogService.open(UploadConfirmDialogComponent, {
      header: 'Confirm Rule Upload',
      width: '600px',
      closable: true,
      closeAriaLabel: 'Close',
      data: { rules: result }
    });

    this.confirmRef.onClose.pipe(take(1)).subscribe((confirmed: boolean | undefined) => {
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
      this.messageService.add({
        severity: 'error',
        summary: 'Parse Error',
        detail: 'CSV must have a header row and at least one data row'
      });
      return null;
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

    for (const required of CSV_HEADERS) {
      if (!headers.includes(required)) {
        this.messageService.add({
          severity: 'error',
          summary: 'Parse Error',
          detail: `Missing required column: ${required}. Expected: ${CSV_HEADERS.join(', ')}`
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
      this.messageService.add({
        severity: 'warn',
        summary: 'Parse Warnings',
        detail: errors.join('; '),
        life: 8000
      });
    }

    if (rules.length === 0) {
      this.messageService.add({ severity: 'error', summary: 'Parse Error', detail: 'No valid rules found in CSV' });
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
      this.messageService.add({
        severity: 'success',
        summary: 'Upload Complete',
        detail: `${successCount} of ${rules.length} rule(s) added successfully`
      });
      this.rulesTable()?.loadRules();
    }

    if (errors.length > 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Upload Errors',
        detail: errors.join('; '),
        life: 8000
      });
    }
  }

  private async downloadRulesAsCsv(): Promise<void> {
    this.downloading.set(true);

    try {
      const response = await getRulesByClientId(this.clientId);
      if (!response.ok) {
        this.messageService.add({ severity: 'error', summary: 'Download Error', detail: 'Failed to fetch rules' });
        this.downloading.set(false);
        return;
      }

      const data: RulesResponse = await response.json();
      const rules = data.client_rules;

      if (rules.length === 0) {
        this.messageService.add({ severity: 'info', summary: 'No Rules', detail: 'No rules to export' });
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
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `notification-rules-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();

      URL.revokeObjectURL(url);
      this.messageService.add({ severity: 'success', summary: 'Downloaded', detail: `Exported ${rules.length} rule(s)` });
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Download Error', detail: 'Failed to download rules' });
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

  private getOrCreateClientId(): string {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  }
}
