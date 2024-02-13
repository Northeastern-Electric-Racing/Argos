import { Component, Input } from '@angular/core';
import { Subject } from 'rxjs';
import { DataValue } from 'src/utils/socket.utils';
import { DataType } from 'src/utils/types.utils';

@Component({
  selector: 'graph-caption',
  styleUrls: ['./graph-caption.component.css'],
  templateUrl: './graph-caption.component.html'
})
export default class GraphInfo {
  @Input() dataType!: Subject<DataType>;
  @Input() currentValue!: Subject<DataValue | undefined>;
  @Input() currentDriver?: string;
  @Input() currentSystem?: string;
  @Input() currentLocation?: string;
  dataTypeName?: string | string[];
  dataTypeUnit?: string | string[];
  value?: string | number | string[] | number[];

  ngOnInit(): void {
    this.dataType.subscribe((dataType: DataType) => {
      this.dataTypeName = dataType.name;
      this.dataTypeUnit = dataType.unit;
    });
    this.currentValue.subscribe((value?: DataValue) => {
      this.value = value?.value ?? 'No Values';
    });
  }
}
