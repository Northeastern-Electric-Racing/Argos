import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import { getDataByDataTypeNameAndRunId } from 'src/api/data.api';
import { getAllDatatypes } from 'src/api/datatype.api';
import APIService from 'src/services/api.service';
import { FaultService } from 'src/services/fault.service';
import { DataValue } from 'src/utils/socket.utils';
import { DataType, FaultData, GraphData } from 'src/utils/types.utils';

@Component({
  selector: 'fault-graph',
  styleUrls: ['./fault-graph.component.css'],
  templateUrl: './fault-graph.component.html'
})
export default class FaultGraphComponent implements OnInit {
  private faultService = inject(FaultService);
  private serverService = inject(APIService);
  private router = inject(Router);

  selectedFault?: FaultData;

  dataTypes?: DataType[];
  dataTypesIsLoading = true;
  dataTypesIsError = false;
  dataTypesError?: Error;

  selectedDataType: Subject<DataType> = new Subject<DataType>();
  selectedDataTypeValuesSubject: BehaviorSubject<GraphData[]> = new BehaviorSubject<GraphData[]>([]);
  currentValue: Subject<DataValue | undefined> = new Subject<DataValue | undefined>();
  selectedDataTypeValuesIsLoading = false;
  selectedDataTypeValuesIsError = false;
  selectedDataTypeValuesError?: Error;

  ngOnInit(): void {
    this.queryDataTypes();

    const selectedFaultSubscription = this.faultService.getSelectedFault();
    this.selectedFault = selectedFaultSubscription.value;
    if (!this.selectedFault) {
      this.router.navigate(['/faults']);
    }
    selectedFaultSubscription.subscribe((fault) => (this.selectedFault = fault));
  }

  /**
   * Queries the datatypes from the server.
   */
  private queryDataTypes() {
    const dataTypesQueryResponse = this.serverService.query<DataType[]>(getAllDatatypes);
    dataTypesQueryResponse.isLoading.subscribe((isLoading: boolean) => {
      this.dataTypesIsLoading = isLoading;
    });
    dataTypesQueryResponse.error.subscribe((error) => {
      if (error) {
        this.dataTypesIsError = true;
        this.dataTypesError = error;
      }
    });
    dataTypesQueryResponse.data.subscribe((data) => {
      if (data) {
        this.dataTypes = data;
      }
    });
  }

  /**
   * Sets the selected data type.
   * @param dataType The data type to set.
   */
  setSelectedDataType = (dataType: DataType) => {
    const fault = this.selectedFault;
    if (fault) {
      this.selectedDataType.next(dataType);
      this.selectedDataTypeValuesSubject = new BehaviorSubject<GraphData[]>([]);

      this.selectedDataTypeValuesIsLoading = true;
      this.selectedDataTypeValuesIsError = false;
      this.selectedDataTypeValuesError = undefined;

      const dataQueryResponse = this.serverService.query<DataValue[]>(() =>
        getDataByDataTypeNameAndRunId(dataType.name, 0, { time: fault.lastSeen.getTime(), before: 1, after: 1 })
      );
      dataQueryResponse.isLoading.subscribe((isLoading: boolean) => {
        this.selectedDataTypeValuesIsLoading = isLoading;
      });
      dataQueryResponse.error.subscribe((error) => {
        if (error) {
          this.selectedDataTypeValuesError = error;
          this.selectedDataTypeValuesIsError = true;
        }
      });
      dataQueryResponse.data.subscribe((data) => {
        if (data) {
          this.selectedDataTypeValuesSubject.next(data.map((value) => ({ x: +value.time, y: +value.values[0] })));
          this.currentValue.next(data.pop());
        }
      });
    }
  };

  clearDataType = () => {
    this.selectedDataTypeValuesSubject.next([]);
  };
}
