import { ChangeDetectionStrategy, Component, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzAutocompleteModule } from 'ng-zorro-antd/auto-complete';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { RulePayload } from 'src/api/rules.api';
import { getAllDatatypes } from 'src/api/datatype.api';
import APIService from 'src/services/api.service';
import { DataType } from 'src/utils/types.utils';
import { filter, take } from 'rxjs';

@Component({
  selector: 'add-rule-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NzInputModule, NzAutocompleteModule, NzButtonModule],
  templateUrl: './add-rule-dialog.component.html',
  styleUrls: ['./add-rule-dialog.component.css']
})
export class AddRuleDialogComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private ref = inject(NzModalRef);
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
        take(1),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((dataTypes) => {
        this.allTopics = dataTypes.map((dt) => dt.name);
      });
  }

  filterTopics(query: string): void {
    const search = query.toLowerCase();
    const lower = (t: string) => t.toLowerCase();
    this.filteredTopics.set(
      this.allTopics.filter(
        (topic) => lower(topic).includes(search) || topic.split('/').some((seg) => lower(seg).includes(search))
      )
    );
  }

  /** Only known topics are accepted: anything typed that isn't one is cleared when the field loses focus. */
  enforceKnownTopic(): void {
    const control = this.form.controls.topic;
    // Picking an option also blurs the input first, so let the selection land before checking.
    setTimeout(() => {
      if (control.value && !this.allTopics.includes(control.value)) control.setValue('');
    }, 200);
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
