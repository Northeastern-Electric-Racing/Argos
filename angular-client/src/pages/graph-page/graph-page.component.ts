import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BehaviorSubject, Subscription } from 'rxjs';
import { getDataByDatatTypeNameAndTiming, getDataByDataTypeNameAndRunId } from 'src/api/data.api';
import { getAllDatatypes } from 'src/api/datatype.api';
import { getAllRuns } from 'src/api/run.api';
import { appRoutes } from 'src/app/app-routing.module';
import { SelectorConfig } from 'src/components/select-dropdown/select-dropdown.component';
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

  selectedDataTypes: DataType[] = [];
  dataTypes: DataType[] = [];
  dataTypesIsLoading = true;
  dataTypesIsError = false;
  dataTypesError?: Error;

  allRuns: Run[] = [];
  runsIsLoading = true;
  showSideBar = true;
  showMultiYaxis = true;

  toggleMultiYaxis = () => {
    this.showMultiYaxis = !this.showMultiYaxis;
  };

  toggleSideBar = () => {
    this.showSideBar = !this.showSideBar;
  };

  previousDataType?: DataType;

  selectedDataTypeValuesSubject = [new BehaviorSubject<GraphInfo>({ label: '', data: [] })];
  currentValues: DataValue[] = [];
  selectedDataTypeValuesIsLoading = false;
  selectedDataTypeValuesIsError = false;
  selectedDataTypeValuesError?: Error;
  subscriptions: Subscription[] = [];

  onFaultPage?: boolean;
  selectedFault?: FaultData;

  realTime?: boolean;
  run?: Run;

  renderFaultPage = false;
  rightHeader: string = '';

  ngOnInit(): void {
    this.queryDataTypes();
    this.run = undefined;

    this.onFaultPage = this.router.url.includes(appRoutes.faultsRoute());
    if (this.onFaultPage) this.initFaultPage();
    else this.initGeneralPage();
  }

  private initFaultPage = () => {
    this.realTime = undefined;
    this.renderFaultPage = true;

    const selectedFaultSubscription = this.faultService.getSelectedFault();
    this.selectedFault = selectedFaultSubscription.value;
    if (!this.selectedFault) {
      this.router.navigate([appRoutes.faultsRoute()]);
    }
    selectedFaultSubscription.subscribe((fault) => (this.selectedFault = fault));
    this.rightHeader = `Fault: ${this.selectedFault?.name}`;
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

  // reset shit when a run is selected.
  onRunSelected = (run: Run) => {
    this.run = run;
    this.realTime = false;
    this.selectedDataTypeValuesSubject = [];
    this.selectedDataTypeValuesIsLoading = false;
    this.selectedDataTypeValuesIsError = false;
    this.selectedDataTypeValuesError = undefined;
    this.rightHeader = 'Run #' + run.id;
    this.setSelectedDataTypes(this.selectedDataTypes);
  };

  // get real time ready
  onSetRealtime = () => {
    this.queryDataTypes();
    this.run = undefined;
    this.minutesToQuery = undefined;

    this.onFaultPage = this.router.url.includes(appRoutes.faultsRoute());
    if (this.onFaultPage) this.initFaultPage();
    else this.initGeneralPage();
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

  private processRealTimeDataTypeSelection = (dataTypes: DataType[]) => {
    const dataTypeValues = this.selectedDataTypeValuesSubject.map((subject) => subject.getValue());
    dataTypes.forEach((dataType) => {
      const key = dataType.name;
      const graphInfo = dataTypeValues.find((dtV) => dtV.label === key);
      const valuesSubject = this.storage.get(key);
      if (graphInfo !== undefined) {
        this.subscriptions.push(
          valuesSubject.subscribe((value: DataValue) => {
            const now = new Date();
            const lastMinute = now.getTime() - 60000;
            const storedValues = graphInfo.data;
            value.values.forEach((val, i) => {
              const graphData = { x: +value.time, y: +val, label: dataType.name };
              if (storedValues[i]) storedValues[i].push(graphData);
              else storedValues[i] = [graphData];
            });
            const nextValue = storedValues.map((val) => {
              return val.filter((v) => {
                return new Date(v.x).getTime() > lastMinute;
              });
            });

            this.currentValues.push(value);
            this.selectedDataTypeValuesSubject.forEach((subject) => {
              subject.next({
                label: dataType.name,
                data: nextValue
              });
            });
          })
        );
      }
    });
  };

  minutesToQuery: number | undefined = undefined;

  queryMinutesConfig: SelectorConfig = {
    options: [
      {
        name: '1 minute',
        function: () => {
          this.minutesToQuery = 1;
          this.realTime = false;
        }
      },
      {
        name: '2 minutes',
        function: () => {
          this.minutesToQuery = 2;
          this.realTime = false;
        }
      },
      {
        name: '5 minutes',
        function: () => {
          this.minutesToQuery = 5;
          this.realTime = false;
        }
      },
      {
        name: '10 minutes',
        function: () => {
          this.minutesToQuery = 10;
          this.realTime = false;
        }
      },
      {
        name: '15 minutes',
        function: () => {
          this.minutesToQuery = 15;
          this.realTime = false;
        }
      },
      {
        name: '30 minutes',
        function: () => {
          this.minutesToQuery = 30;
          this.realTime = false;
        }
      },
      {
        name: '1 hour',
        function: () => {
          this.minutesToQuery = 60;
          this.realTime = false;
        }
      }
    ],
    placeholder: 'Select Range'
  };

  private processHistoricalDataTypeSelection = (dataTypes: DataType[]) => {
    this.selectedDataTypeValuesIsLoading = true;
    this.selectedDataTypeValuesIsError = false;
    this.selectedDataTypeValuesError = undefined;
    dataTypes.forEach((dataType) => {
      let queryFn: () => Promise<Response>;
      if (this.run !== undefined) {
        queryFn = () => getDataByDataTypeNameAndRunId(dataType.name, this.run!.id);
      } else if (this.minutesToQuery !== undefined) {
        const realMinutes = this.minutesToQuery;
        queryFn = () =>
          getDataByDatatTypeNameAndTiming(dataType.name, {
            time: new Date().getTime(),
            before: realMinutes,
            after: 0
          });
      } else {
        queryFn = () => {
          return getDataByDatatTypeNameAndTiming(dataType.name, {
            time: this.selectedFault?.lastSeen.getTime() ?? 0,
            before: 2,
            after: 2
          });
        };
      }

      const dataQueryResponse = this.serverService.query<DataValue[]>(queryFn);

      dataQueryResponse.error.subscribe((error) => {
        if (error) {
          this.selectedDataTypeValuesIsError = true;
          this.selectedDataTypeValuesError = error;
        }
      });

      dataQueryResponse.isLoading.subscribe((isLoading: boolean) => {
        this.selectedDataTypeValuesIsLoading = isLoading;
      });

      /* ---- data handler ------------------------------------------------------- */
      dataQueryResponse.data.subscribe((data) => {
        if (data) {
          /* ---------- reshape → GraphData[][] (unchanged logic) ---------------- */
          const graphData: GraphData[][] = [];
          data.forEach((dataValue) => {
            dataValue.values.forEach((val, i) => {
              if (graphData[i]) {
                graphData[i].push({ x: +dataValue.time, y: +val });
              } else {
                graphData[i] = [{ x: +dataValue.time, y: +val }];
              }
            });
          });

          /* ---------- push into the BehaviorSubject that matches by .label ----- */
          let target = this.selectedDataTypeValuesSubject.find((subj) => subj.getValue().label === dataType.name);

          if (!target) {
            // (shouldn’t normally happen, but keep it safe)
            target = new BehaviorSubject<GraphInfo>({ label: dataType.name, data: [] });
            this.selectedDataTypeValuesSubject.push(target);
          }

          target.next({ label: dataType.name, data: graphData });

          /* ---------- keep raw values if you use them elsewhere ---------------- */
          this.currentValues.push(...data);
          // If you still have a single-value subject called currentValue, keep this:
          // this.currentValue?.next(data[data.length - 1]);
        }
      });
    });
  };

  /**
   * Sets the selected data type.
   * @param dataType The data type to set.
   */
  setSelectedDataTypes = (dataTypes: DataType[]) => {
    this.clearDataType();
    this.selectedDataTypes = dataTypes;

    this.selectedDataTypeValuesSubject = dataTypes.map((dt) => new BehaviorSubject<GraphInfo>({ label: dt.name, data: [] }));

    if (this.realTime) {
      this.processRealTimeDataTypeSelection(dataTypes);
    } else if (this.run !== undefined || this.selectedFault !== undefined || this.minutesToQuery !== undefined) {
      this.processHistoricalDataTypeSelection(dataTypes); // ← pass whole array
    } else {
      this.toastService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No run selected. Please select a run or choose “Real Time”.'
      });
    }
  };

  clearDataType: () => void = () => {
    // Unsubscribe from all previous subscriptions
    this.subscriptions.forEach((sub) => {
      if (sub) {
        sub.unsubscribe();
      }
    });
    this.subscriptions = [];

    // Reset all subjects and data
    this.selectedDataTypeValuesSubject.forEach((subject) => {
      subject.next({ label: '', data: [] });
      subject.complete();
    });
    this.selectedDataTypeValuesSubject = [];
    this.currentValues = [];
    this.selectedDataTypeValuesIsLoading = false;
    this.selectedDataTypeValuesIsError = false;
    this.selectedDataTypeValuesError = undefined;
  };
}
