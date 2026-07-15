import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputText } from 'primeng/inputtext';
import { AutoComplete, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { ButtonDirective } from 'primeng/button';
import { RulePayload } from 'src/api/rules.api';
import { getAllDatatypes } from 'src/api/datatype.api';
import APIService from 'src/services/api.service';
import { DataType } from 'src/utils/types.utils';
import { filter, take } from 'rxjs';

@Component({
  selector: 'add-rule-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, InputText, AutoComplete, ButtonDirective],
  templateUrl: './add-rule-dialog.component.html',
  styleUrls: ['./add-rule-dialog.component.css']
})
export class AddRuleDialogComponent implements OnInit {
  private ref = inject(DynamicDialogRef);
  private fb = inject(FormBuilder);
  private serverService = inject(APIService);

  allTopics: string[] = [];
  filteredTopics = signal<string[]>([]);

  form = this.fb.group({
    id: ['', Validators.required],
    topic: ['', Validators.required],
    expr: ['', Validators.required],
    debounce_time: [60, [Validators.required, Validators.min(0)]]
  });

  ngOnInit(): void {
    const query = this.serverService.query<DataType[]>(getAllDatatypes);
    query.data
      .pipe(
        filter((d): d is DataType[] => d !== null && d !== undefined),
        take(1)
      )
      .subscribe((dataTypes) => {
        this.allTopics = dataTypes.map((dt) => dt.name);
      });
  }

  filterTopics(event: AutoCompleteCompleteEvent): void {
    const search = event.query.toLowerCase();
    const lower = (t: string) => t.toLowerCase();
    this.filteredTopics.set(
      this.allTopics.filter(
        (topic) => lower(topic).includes(search) || topic.split('/').some((seg) => lower(seg).includes(search))
      )
    );
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const rule: RulePayload = {
      id: value.id!,
      topic: value.topic!,
      expr: value.expr!,
      debounce_time: Number(value.debounce_time)
    };

    this.ref.close(rule);
  }

  onCancel(): void {
    this.ref.close(null);
  }
}
