import { Component, OnInit, TemplateRef, contentChild, input } from '@angular/core';
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
  dataType = input.required<Subject<DataType[] | undefined>>();
  currentValue = input<DataValue[]>();
  rightInfo = contentChild.required<TemplateRef<void>>('rightInfo');
  buttons = contentChild.required<TemplateRef<void>>('buttons');

  dataTypeName?: string;
  dataTypeUnit?: string;
  value?: string | number;

  ngOnInit(): void {
    this.dataType().subscribe((dataType: DataType[] | undefined) => {
      this.dataTypeName = dataType?.at(0)?.name;
      this.dataTypeUnit = dataType?.at(0)?.unit;
    });
    const currentValues = this.currentValue();
    this.value = currentValues?.[0]?.values?.[0];
  }
}
