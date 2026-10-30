import { DialogRef } from '@angular/cdk/dialog';
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
  viewChild,
  DestroyRef
} from '@angular/core';
import { Combobox, ComboboxPopup, ComboboxWidget } from '@angular/aria/combobox';
import { Listbox, Option } from '@angular/aria/listbox';
import { OverlayModule } from '@angular/cdk/overlay';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RulePayload } from 'src/api/rules.api';
import { getAllDatatypes } from 'src/api/datatype.api';
import APIService from 'src/services/api.service';
import { DataType } from 'src/utils/types.utils';
import { filter, take } from 'rxjs';

@Component({
  selector: 'add-rule-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Combobox, ComboboxPopup, ComboboxWidget, Listbox, Option, OverlayModule],
  templateUrl: './add-rule-dialog.component.html'
})
export class AddRuleDialogComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private ref = inject(DialogRef);
  private fb = inject(FormBuilder);
  private serverService = inject(APIService);

  private allTopics = signal<string[]>([]);
  private listbox = viewChild(Listbox);
  /** Text typed in the topic combobox; the form's topic is only set to an exact topic (forceSelection). */
  query = signal('');
  popupExpanded = signal(false);
  selectedTopic = signal<string[]>([]);
  filteredTopics = computed(() => {
    const search = this.query().toLowerCase();
    const lower = (t: string) => t.toLowerCase();
    return this.allTopics()
      .filter((topic) => lower(topic).includes(search) || topic.split('/').some((seg) => lower(seg).includes(search)))
      .slice(0, 100);
  });

  constructor() {
    afterRenderEffect(() => {
      if (this.popupExpanded()) this.listbox()?.scrollActiveItemIntoView();
    });
  }

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
        take(1),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((dataTypes) => {
        this.allTopics.set(dataTypes.map((dt) => dt.name));
      });
  }

  onQueryChange(value: string): void {
    this.query.set(value);
    this.form.controls.topic.setValue(this.allTopics().includes(value) ? value : '');
    if (value) this.popupExpanded.set(true);
  }

  onCommit(): void {
    const [topic] = this.selectedTopic();
    if (topic) {
      this.query.set(topic);
      this.form.controls.topic.setValue(topic);
    }
    this.popupExpanded.set(false);
  }

  /** Like PrimeNG's forceSelection: free text that isn't a topic is cleared on blur. */
  onTopicBlur(): void {
    this.form.controls.topic.markAsTouched();
    if (!this.allTopics().includes(this.query())) {
      this.query.set('');
      this.form.controls.topic.setValue('');
    }
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
