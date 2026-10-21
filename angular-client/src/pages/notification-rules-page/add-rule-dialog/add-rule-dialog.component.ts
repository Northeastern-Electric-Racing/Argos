import { ChangeDetectionStrategy, Component, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiButton, type TuiDialogContext, TuiError, TuiFilterByInputPipe, TuiInput } from '@taiga-ui/core';
import { TuiChevron, TuiComboBox, TuiDataListWrapper, TuiInputNumber } from '@taiga-ui/kit';
import { TuiForm } from '@taiga-ui/layout';
import { injectContext } from '@taiga-ui/polymorpheus';
import { RULE_VALIDATION_ERRORS } from '../edit-rule-dialog/edit-rule-dialog.component';
import { RulePayload } from 'src/api/rules.api';
import { getAllDatatypes } from 'src/api/datatype.api';
import APIService from 'src/services/api.service';
import { DataType } from 'src/utils/types.utils';
import { filter, take } from 'rxjs';

@Component({
  selector: 'add-rule-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    TuiButton,
    TuiError,
    TuiFilterByInputPipe,
    TuiInput,
    TuiChevron,
    TuiComboBox,
    TuiDataListWrapper,
    TuiInputNumber,
    TuiForm
  ],
  providers: [RULE_VALIDATION_ERRORS],
  templateUrl: './add-rule-dialog.component.html',
  styleUrls: ['./add-rule-dialog.component.css']
})
export class AddRuleDialogComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private readonly context = injectContext<TuiDialogContext<RulePayload | null>>();
  private fb = inject(FormBuilder);
  private serverService = inject(APIService);

  // Topic suggestions; the combo box filters them by what's typed (case-insensitive substring)
  allTopics = signal<string[]>([]);

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

    this.context.completeWith(rule);
  }

  onCancel(): void {
    this.context.completeWith(null);
  }
}
