import { ChangeDetectionStrategy, Component, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { RulePayload } from 'src/api/rules.api';
import { getAllDatatypes } from 'src/api/datatype.api';
import APIService from 'src/services/api.service';
import { DataType } from 'src/utils/types.utils';
import { revalidateOnTouch } from 'src/utils/form.utils';
import { filter, take } from 'rxjs';

@Component({
  selector: 'add-rule-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NzFormModule, NzInputModule, NzSelectModule, NzButtonModule],
  templateUrl: './add-rule-dialog.component.html',
  styleUrls: ['./add-rule-dialog.component.css']
})
export class AddRuleDialogComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private ref = inject(NzModalRef);
  private fb = inject(FormBuilder);
  private serverService = inject(APIService);

  allTopics = signal<string[]>([]);

  form = this.fb.group({
    id: ['', Validators.required],
    topic: [null as string | null, Validators.required],
    expr: ['', Validators.required],
    debounce_time: [60, [Validators.required, Validators.min(0)]]
  });

  constructor() {
    revalidateOnTouch(this.form, this.destroyRef);
  }

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
