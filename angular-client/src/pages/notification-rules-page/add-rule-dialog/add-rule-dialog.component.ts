import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { HlmAutocompleteImports } from '@spartan-ng/helm/autocomplete';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { RulePayload } from 'src/api/rules.api';
import { getAllDatatypes } from 'src/api/datatype.api';
import APIService from 'src/services/api.service';
import { DataType } from 'src/utils/types.utils';
import { filter, take } from 'rxjs';

@Component({
  selector: 'add-rule-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, HlmInput, HlmFieldImports, HlmAutocompleteImports, HlmButton, HlmDialogImports],
  host: { class: 'grid gap-6 min-w-0' },
  templateUrl: './add-rule-dialog.component.html'
})
export class AddRuleDialogComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private ref = inject(BrnDialogRef);
  private fb = inject(FormBuilder);
  private serverService = inject(APIService);

  allTopics = signal<string[]>([]);
  /** What the user has typed into the topic box; drives the suggestion list. */
  topicSearch = signal('');
  filteredTopics = computed(() => {
    const search = this.topicSearch().toLowerCase();
    const lower = (t: string) => t.toLowerCase();
    return this.allTopics().filter(
      (topic) => lower(topic).includes(search) || topic.split('/').some((seg) => lower(seg).includes(search))
    );
  });

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
