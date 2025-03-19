import { Component, inject, input, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { FaultService } from 'src/services/fault.service';
import { DataType, FaultData } from 'src/utils/types.utils';

@Component({
  selector: 'fault-graph-caption',
  styleUrls: ['./fault-graph-caption.component.css'],
  templateUrl: './fault-graph-caption.component.html'
})
export default class FaultGraphCaptionComponent implements OnInit {
  private faultService = inject(FaultService);
  dataType = input.required<Subject<DataType | undefined>>();
  onClearDataType = input.required<() => void>();
  dataTypeName?: string | string[];
  dataTypeUnit?: string | string[];
  value?: string | number;
  selectedFault?: FaultData;

  ngOnInit(): void {
    this.dataType().subscribe((dataType: DataType | undefined) => {
      this.dataTypeName = dataType?.name ?? '';
      this.dataTypeUnit = dataType?.unit ?? '';
    });
    const subscription = this.faultService.getSelectedFault();
    this.selectedFault = subscription.value;
    subscription.subscribe((fault) => (this.selectedFault = fault));
  }

  onClearDataTypeWrapper = () => {
    this.onClearDataType()();
  };
}
