import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import { getDataByDatatTypeNameAndTiming, getDataByDataTypeNameAndRunId } from 'src/api/data.api';
import { getAllDatatypes } from 'src/api/datatype.api';
import { getAllRuns } from 'src/api/run.api';
import APIService from 'src/services/api.service';
import { FaultService } from 'src/services/fault.service';
import Storage from 'src/services/storage.service';
import { DataValue } from 'src/utils/socket.utils';
import { DataType, FaultData, GraphData, GraphInfo, Run } from 'src/utils/types.utils';

@Component({
  selector: 'graph-page',
  templateUrl: './graph-page.component.html',
  styleUrls: ['./graph-page.component.css']
})
export default class GraphPageComponent implements OnInit {
  private serverService = inject(APIService);
  private storage = inject(Storage);
  private toastService = inject(MessageService);
  private faultService = inject(FaultService);
  private router = inject(Router);

  dataTypes?: DataType[];
  dataTypesIsLoading = true;
  dataTypesIsError = false;
  dataTypesError?: Error;

  allRuns!: Run[];
  runsIsLoading = true;

  previousDataType?: DataType;

  selectedDataType = new Subject<DataType | undefined>();
  selectedDataTypeValuesSubject: BehaviorSubject<GraphInfo | undefined> = new BehaviorSubject<GraphInfo | undefined>(
    undefined
  );
  currentValue: Subject<DataValue | undefined> = new Subject<DataValue | undefined>();
  selectedDataTypeValuesIsLoading = false;
  selectedDataTypeValuesIsError = false;
  selectedDataTypeValuesError?: Error;
  subscription?: Subscription;

  onFaultPage?: boolean;
  selectedFault?: FaultData;

  realTime?: boolean;
  run?: Run;

  renderFaultPage = false;
  rightHeader: string = '';

  ngOnInit(): void {
    this.queryDataTypes();
    this.run = undefined;

    this.onFaultPage = this.router.url.includes('/faults');

    if (this.onFaultPage) this.initFaultPage();
    else this.initGeneralPage();
  }

  private initFaultPage = () => {
    this.realTime = undefined;
    this.renderFaultPage = true;

    const selectedFaultSubscription = this.faultService.getSelectedFault();
    this.selectedFault = selectedFaultSubscription.value;
    if (!this.selectedFault) {
      this.router.navigate(['/faults']);
    }
    selectedFaultSubscription.subscribe((fault) => (this.selectedFault = fault));
    this.rightHeader = `Fault ${this.selectedFault?.name}`;
  };

  private initGeneralPage = () => {
    this.realTime = true;
    this.selectedFault = undefined;
    this.renderFaultPage = false;
    this.rightHeader = `Real Time`;

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
  };

  onRunSelected = (run: Run) => {
    this.run = run;
    this.realTime = false;
    this.selectedDataTypeValuesSubject.next(undefined);
    this.selectedDataTypeValuesIsLoading = false;
    this.selectedDataTypeValuesIsError = false;
    this.selectedDataTypeValuesError = undefined;
    this.rightHeader = 'Run #' + run.id;
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
      this.rightHeader = 'Real Time';
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

  private processRealTimeDataTypeSelection = (dataType: DataType) => {
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
  };

  private processHistoricalDataTypeSelection = (dataType: DataType, queryFunction: () => Promise<Response>) => {
    this.selectedDataTypeValuesIsLoading = true;
    this.selectedDataTypeValuesIsError = false;
    this.selectedDataTypeValuesError = undefined;

    const dataQueryResponse = this.serverService.query<DataValue[]>(queryFunction);
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
        const graphData: GraphData[][] = [];
        data.forEach((dataValue) => {
          dataValue.values.forEach((value, i) => {
            if (graphData[i]) {
              graphData[i].push({ x: +dataValue.time, y: +value });
            } else {
              graphData[i] = [{ x: +dataValue.time, y: +value }];
            }
          });
        });
        this.selectedDataTypeValuesSubject.next({
          label: dataType.name,
          data: graphData
        });
        this.currentValue.next(data.pop());
      }
    });
  };

  /**
   * Sets the selected data type.
   * @param dataType The data type to set.
   */
  setSelectedDataType: (dataType: DataType) => void = (dataType: DataType) => {
    this.clearDataType();
    this.selectedDataType.next(dataType);
    this.selectedDataTypeValuesSubject = new BehaviorSubject<GraphInfo | undefined>({ label: dataType.name, data: [] });

    if (this.subscription) this.subscription.unsubscribe();

    if (this.realTime) this.processRealTimeDataTypeSelection(dataType);
    else if (this.run !== undefined)
      this.processHistoricalDataTypeSelection(dataType, () => getDataByDataTypeNameAndRunId(dataType.name, this.run!.id));
    else if (this.selectedFault !== undefined)
      this.processHistoricalDataTypeSelection(dataType, () =>
        getDataByDatatTypeNameAndTiming(dataType.name, { time: this.selectedFault!.lastSeen.getTime(), before: 1, after: 1 })
      );
    else {
      this.toastService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No run selected Please select a run. Choose most recent for real time.'
      });
    }
  };

  clearDataType: () => void = () => {
    if (this.subscription) this.subscription.unsubscribe();
    this.selectedDataType.next(undefined);
    this.selectedDataTypeValuesSubject.next(undefined);
  };
}
