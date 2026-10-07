import { Component, ContentChild, input, OnInit, TemplateRef, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { DataValue } from 'src/utils/socket.utils';
import { DataType } from 'src/utils/types.utils';

import { NgTemplateOutlet } from '@angular/common';
import TypographyComponent from 'src/components/typography/typography.component';

@Component({
  selector: 'graph-caption',
  styleUrls: ['./graph-caption.component.css'],
  templateUrl: './graph-caption.component.html',
  standalone: true,
  imports: [NgTemplateOutlet, TypographyComponent]
})
export default class GraphInfoComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  dataType = input.required<Subject<DataType[] | undefined>>();
  currentValue = input<DataValue[]>();
  @ContentChild('rightInfo', { static: true }) rightInfo!: TemplateRef<void>;
  @ContentChild('buttons', { static: true }) buttons!: TemplateRef<void>;

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
