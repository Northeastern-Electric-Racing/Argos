import { Component, OnInit, TemplateRef, contentChild, input, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { DataValue } from 'src/utils/socket.utils';
import { DataType } from 'src/utils/types.utils';

import { NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'graph-caption',
  templateUrl: './graph-caption.component.html',
  imports: [NgTemplateOutlet]
})
export default class GraphInfoComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  dataType = input.required<Subject<DataType[] | undefined>>();
  currentValue = input<DataValue[]>();
  rightInfo = contentChild<TemplateRef<void>>('rightInfo');
  buttons = contentChild<TemplateRef<void>>('buttons');

  dataTypeName?: string;
  dataTypeUnit?: string;
  value?: string | number;

  ngOnInit(): void {
    this.dataType()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((dataType: DataType[] | undefined) => {
        this.dataTypeName = dataType?.at(0)?.name;
        this.dataTypeUnit = dataType?.at(0)?.unit;
      });
    const currentValues = this.currentValue();
    this.value = currentValues?.[0]?.values?.[0];
  }
}
