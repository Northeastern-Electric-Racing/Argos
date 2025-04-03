import { Component, ContentChild, input, OnInit, TemplateRef } from '@angular/core';
import { Subject } from 'rxjs';
import { DataValue } from 'src/utils/socket.utils';
import { DataType } from 'src/utils/types.utils';

@Component({
  selector: 'graph-caption',
  styleUrls: ['./graph-caption.component.css'],
  templateUrl: './graph-caption.component.html'
})
export default class GraphInfoComponent implements OnInit {
  dataType = input.required<Subject<DataType | undefined>>();
  currentValue = input<Subject<DataValue | undefined>>();
  @ContentChild('rightInfo', { static: true }) rightInfo!: TemplateRef<void>;
  @ContentChild('buttons', { static: true }) buttons!: TemplateRef<void>;

  dataTypeName?: string;
  dataTypeUnit?: string;
  value?: string | number;

  ngOnInit(): void {
    this.dataType().subscribe((dataType: DataType | undefined) => {
      this.dataTypeName = dataType?.name;
      this.dataTypeUnit = dataType?.unit;
    });
    this.currentValue()?.subscribe((pvalue?: DataValue) => {
      const value = pvalue?.values[0];
      this.value = value !== undefined ? parseFloat(value).toFixed(2) : 'No Values';
    });
  }
}
