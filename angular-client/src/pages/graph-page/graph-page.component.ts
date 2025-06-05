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
import { ButtonComponent } from '../../components/argos-button/argos-button.component';
import { FaultButtonsComponent } from './graph-caption/fault-buttons/fault-buttons.component';
import { GeneralButtonsComponent } from './graph-caption/general-buttons/general-buttons.component';
import GraphSidebarComponent from './graph-sidebar/graph-sidebar.component';
import HStackComponent from 'src/components/hstack/hstack.component';
import CustomGraphComponent from './graph/graph.component';
import GraphHeaderComponent from './graph-header/graph-header.component';
import LoadingPageComponent from 'src/components/loading-page/loading-page.component';
import ErrorPageComponent from 'src/components/error-page/error-page.component';
import TypographyComponent from '../../components/typography/typography.component';

@Component({
  selector: 'graph-page',
  templateUrl: './graph-page.component.html',
  styleUrls: ['./graph-page.component.css'],
  standalone: true,
  imports: [
    LoadingPageComponent,
    ErrorPageComponent,
    ButtonComponent,
    FaultButtonsComponent,
    GeneralButtonsComponent,
    GraphSidebarComponent,
    HStackComponent,
    CustomGraphComponent,
    GraphHeaderComponent,
    TypographyComponent
  ]
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
  showMultiYaxis = false;

  toggleMultiYaxis = () => {
    this.showMultiYaxis = !this.showMultiYaxis;
  };

  toggleSideBar = () => {
    this.showSideBar = !this.showSideBar;
  };

  previousDataType?: DataType;

  selectedDataTypeValuesSubject = [new BehaviorSubject<GraphInfo>({ label: '', data: [] })];
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
    console.log('Switching to run mode:', run.id);

    // Clear existing state first
    this.clearDataType();

    this.run = run;
    this.realTime = false;
    this.minutesToQuery = undefined;
    this.selectedDataTypeValuesSubject = [];
    this.selectedDataTypeValuesIsLoading = false;
    this.selectedDataTypeValuesIsError = false;
    this.selectedDataTypeValuesError = undefined;
    this.rightHeader = 'Run #' + run.id;

    this.setSelectedDataTypes([...this.selectedDataTypes]);
  };

  onQueryTimeSelected = (queryTime: number) => {
    console.log('Switching to historical mode:', queryTime, 'minutes');

    // Clear existing state first
    this.clearDataType();

    this.run = undefined;
    this.minutesToQuery = queryTime;
    this.realTime = false;
    this.selectedDataTypeValuesIsLoading = false;
    this.selectedDataTypeValuesIsError = false;
    this.selectedDataTypeValuesError = undefined;
    this.rightHeader = 'Historical Range';

    this.setSelectedDataTypes([...this.selectedDataTypes]);
  };

  // get real time ready
  onSetRealtime = () => {
    // Clear existing state first
    this.clearDataType();

    this.run = undefined;
    this.realTime = true;
    this.minutesToQuery = undefined;
    this.selectedDataTypeValuesSubject = [];
    this.selectedDataTypeValuesIsLoading = false;
    this.selectedDataTypeValuesIsError = false;
    this.selectedDataTypeValuesError = undefined;
    this.rightHeader = 'Real Time';

    this.setSelectedDataTypes([...this.selectedDataTypes]);
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
    console.log(
      'Processing real-time data type selection for:',
      dataTypes.map((dt) => dt.name)
    );

    const dataTypeValues = this.selectedDataTypeValuesSubject.map((subject) => subject.getValue());

    dataTypes.forEach((dataType) => {
      const key = dataType.name;
      const graphInfo = dataTypeValues.find((dtV) => dtV.label === key);
      const valuesSubject = this.storage.get(key);

      if (graphInfo !== undefined) {
        console.log(`Setting up real-time subscription for ${key}`);

        this.subscriptions.push(
          valuesSubject.subscribe((value: DataValue) => {
            const now = new Date();
            const lastMinute = now.getTime() - 60000; // Keep 1 minute of data
            const storedValues = graphInfo.data;

            // Process new values
            value.values.forEach((val, i) => {
              const graphData = { x: +value.time, y: +val, label: dataType.name };
              if (storedValues[i]) {
                storedValues[i].push(graphData);
                // Limit stored values to prevent memory buildup
                if (storedValues[i].length > 500) {
                  storedValues[i] = storedValues[i].slice(-400); // Keep last 400 points
                }
              } else {
                storedValues[i] = [graphData];
              }
            });

            // Filter out old data points
            const nextValue = storedValues.map((val) => {
              return val.filter((v) => {
                return new Date(v.x).getTime() > lastMinute;
              });
            });

            // Update the subject
            const targetSubject = this.selectedDataTypeValuesSubject.find((s) => s.getValue().label === dataType.name);
            if (targetSubject) {
              console.log(`Updating real-time data for ${key}`, nextValue);
              targetSubject.next({
                label: dataType.name,
                data: nextValue
              });
            }
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
          this.onQueryTimeSelected(1);
        }
      },
      {
        name: '2 minutes',
        function: () => {
          this.onQueryTimeSelected(2);
        }
      },
      {
        name: '5 minutes',
        function: () => {
          this.onQueryTimeSelected(5);
        }
      },
      {
        name: '10 minutes',
        function: () => {
          this.onQueryTimeSelected(10);
        }
      },
      {
        name: '15 minutes',
        function: () => {
          this.onQueryTimeSelected(15);
        }
      },
      {
        name: '30 minutes',
        function: () => {
          this.onQueryTimeSelected(30);
        }
      },
      {
        name: '1 hour',
        function: () => {
          this.onQueryTimeSelected(60);
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
        console.log('Processing historical data type selection for run:', this.run.id, 'and data type:', dataType.name);
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

      dataQueryResponse.data.subscribe((data) => {
        if (data) {
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

          let target = this.selectedDataTypeValuesSubject.find((subj) => subj.getValue().label === dataType.name);

          if (!target) {
            // (shouldn’t normally happen, but keep it safe)
            target = new BehaviorSubject<GraphInfo>({ label: dataType.name, data: [] });
            this.selectedDataTypeValuesSubject.push(target);
          }

          target.next({ label: dataType.name, data: graphData });
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
    console.log('Clearing data type - unsubscribing from', this.subscriptions.length, 'subscriptions');

    // Unsubscribe from all previous subscriptions
    this.subscriptions.forEach((sub) => {
      if (sub && !sub.closed) {
        sub.unsubscribe();
      }
    });
    this.subscriptions = [];

    // Clear and complete existing subjects to prevent memory leaks
    this.selectedDataTypeValuesSubject.forEach((subject) => {
      if (subject && !subject.closed) {
        subject.complete();
      }
    });
    this.selectedDataTypeValuesSubject = [];

    // Reset loading states
    this.selectedDataTypeValuesIsLoading = false;
    this.selectedDataTypeValuesIsError = false;
    this.selectedDataTypeValuesError = undefined;

    console.log('Data type cleared successfully');
  };
}
