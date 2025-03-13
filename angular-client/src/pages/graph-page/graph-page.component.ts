import { Component, OnInit, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import { getDataByDataTypeNameAndRunId } from 'src/api/data.api';
import { getAllDatatypes } from 'src/api/datatype.api';
import { getAllRuns } from 'src/api/run.api';
import APIService from 'src/services/api.service';
import Storage from 'src/services/storage.service';
import { DataValue } from 'src/utils/socket.utils';
import { DataType, GraphInfo, Run } from 'src/utils/types.utils';

@Component({
  selector: 'graph-page',
  templateUrl: './graph-page.component.html',
  styleUrls: ['./graph-page.component.css']
})
export default class GraphPageComponent implements OnInit {
  private serverService = inject(APIService);
  private storage = inject(Storage);
  private toastService = inject(MessageService);
  realTime: boolean = true;

  dataTypes?: DataType[];
  dataTypesIsLoading = true;
  dataTypesIsError = false;
  dataTypesError?: Error;

  run?: Run;

  allRuns!: Run[];
  runsIsLoading = true;

  previousDataType?: DataType;

  selectedDataType: Subject<DataType> = new Subject<DataType>();
  selectedDataTypeValuesSubject: BehaviorSubject<GraphInfo | undefined> = new BehaviorSubject<GraphInfo | undefined>(
    undefined
  );
  currentValue: Subject<DataValue | undefined> = new Subject<DataValue | undefined>();
  selectedDataTypeValuesIsLoading = false;
  selectedDataTypeValuesIsError = false;
  selectedDataTypeValuesError?: Error;
  subscription?: Subscription;

  ngOnInit(): void {
    this.queryDataTypes();

    const runsQueryResponse = this.serverService.query<Run[]>(() => getAllRuns(), { queryKey: ['runs'] });
    runsQueryResponse.isLoading.subscribe((isLoading: boolean) => {
      this.runsIsLoading = isLoading;
    });
    runsQueryResponse.error.subscribe((error) => {
      if (error) {
        this.toastService.add({ severity: 'error', summary: 'Error', detail: error.message });
      }
    });
    runsQueryResponse.data.subscribe((data) => {
      if (data) {
        this.allRuns = data;
      }
    });

    this.clearDataType = () => {
      if (this.subscription) this.subscription.unsubscribe();
      this.selectedDataType.next({ name: '', unit: '' });
      this.selectedDataTypeValuesSubject = new BehaviorSubject<GraphInfo | undefined>(undefined);
    };

    this.setSelectedDataType = (dataType: DataType) => {
      this.selectedDataType.next(dataType);
      this.selectedDataTypeValuesSubject = new BehaviorSubject<GraphInfo | undefined>({ label: dataType.name, data: [] });
      if (this.realTime) {
        if (this.subscription) this.subscription.unsubscribe();
        const key = dataType.name;
        const valuesSubject = this.storage.get(key);
        this.subscription = valuesSubject.subscribe((value: DataValue) => {
          /* Take only data from the last minute */
          const now = new Date();
          const lastMinute = now.getTime() - 60000;
          const storedInfo = this.selectedDataTypeValuesSubject.getValue()!; // Defined earlier in this function
          const storedValues = storedInfo.data;
          value.values.forEach((val, i) => {
            const graphData = { x: +value.time, y: +val, label: dataType.name };
            if (storedValues[i]) storedValues[i].push(graphData);
            else storedValues[i] = [graphData];
          });
          const nextValue = storedValues.map((val) =>
            val.filter((v) => {
              return new Date(v.x).getTime() > lastMinute;
            })
          );

          this.currentValue.next(value);
          this.selectedDataTypeValuesSubject.next({ ...storedInfo, data: nextValue });
        });
      } else if (this.run !== undefined) {
        this.selectedDataTypeValuesIsLoading = true;
        this.selectedDataTypeValuesIsError = false;
        this.selectedDataTypeValuesError = undefined;

        const dataQueryResponse = this.serverService.query<DataValue[]>(() =>
          getDataByDataTypeNameAndRunId(dataType.name, this.run!.id)
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
            this.selectedDataTypeValuesSubject.next({
              label: dataType.name,
              data: data.map((value) => value.values.map((val) => ({ x: +value.time, y: +val })))
            });
            this.currentValue.next(data.pop());
          }
        });
      } else {
        this.toastService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No run selected Please select a run. Choose most recent for real time.'
        });
      }
    };
  }

  onRunSelected = (run: Run) => {
    this.run = run;
    this.realTime = run.id === this.storage.getCurrentRunId().value;
    this.selectedDataTypeValuesSubject.next(undefined);
    this.selectedDataTypeValuesIsLoading = false;
    this.selectedDataTypeValuesIsError = false;
    this.selectedDataTypeValuesError = undefined;
  };

  onSetRealtime = () => {
    const currentRunId = this.storage.getCurrentRunId().value;
    if (currentRunId) {
      this.run = this.allRuns.find((run) => run.id === currentRunId);
      this.realTime = true;
      this.selectedDataTypeValuesSubject.next(undefined);
      this.selectedDataTypeValuesIsLoading = false;
      this.selectedDataTypeValuesIsError = false;
      this.selectedDataTypeValuesError = undefined;
    }
  };

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
  setSelectedDataType!: (dataType: DataType) => void;

  clearDataType!: () => void;
}
