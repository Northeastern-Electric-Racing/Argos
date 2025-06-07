import { Component, OnDestroy, OnInit, inject } from '@angular/core';
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
    TypographyComponent
  ]
})
export default class GraphPageComponent implements OnInit, OnDestroy {
  private serverService = inject(APIService);
  private storage = inject(Storage);
  private toastService = inject(MessageService);
  private faultService = inject(FaultService);
  private router = inject(Router); // for fault page navigation

  // keep track of the subscriptions, that way we cancel all subs anywhere anytime
  subscriptions: Subscription[] = [];

  // the local tracking of selected data types
  selectedDataTypes: DataType[] = [];

  // available data types queried from the server
  dataTypes: DataType[] = [];
  dataTypesIsLoading = true;
  dataTypesIsError = false;
  dataTypesError?: Error;

  // all Runs queried from the server
  allRuns: Run[] = [];
  runsIsLoading = true;

  // UI state variables
  showSideBar = true;
  toggleSideBar = () => {
    console.log('selectedDataTypes', this.selectedDataTypes);
    this.showSideBar = !this.showSideBar;
  };
  selectedFault?: FaultData;
  onFaultPage: boolean = false;
  renderFaultPage = false;
  rightHeader: string = '';

  // GRAPH State variables
  realTime: boolean = true;
  run?: Run;
  minutesToQuery: number | undefined = undefined;
  showMultiYaxis = false;
  toggleMultiYaxis = () => {
    this.showMultiYaxis = !this.showMultiYaxis;
  };
  isPaused = false;
  togglePause = () => {
    this.isPaused = !this.isPaused;
  };

  // Selector config for querying time ranges form now.
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

  // store the values for each selected data type.
  // When we are in live mode the data  is constantly udpated.
  // The Behvaorial subject is update just a single time when querying for data.
  // these should always be reset when switching between modes.
  selectedDataTypeValuesSubject = [new BehaviorSubject<GraphInfo>({ label: '', data: [] })];
  selectedDataTypeValuesIsLoading = false; // specifically used for querying updates.
  selectedDataTypeValuesIsError = false;
  selectedDataTypeValuesError?: Error;

  // Run when page starts up
  ngOnInit(): void {
    this.queryDataTypes();
    this.run = undefined;

    this.onFaultPage = this.router.url.includes(appRoutes.faultsRoute());
    if (this.onFaultPage) this.initFaultPage();
    else this.initGeneralPage();
  }

  // All memory in use should be discarded here.
  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => {
      sub.unsubscribe();
    });
    this.selectedDataTypeValuesSubject.forEach((subject) => {
      subject.complete();
    });
    this.selectedDataTypeValuesSubject = [];
    this.selectedDataTypeValuesSubject.length = 0;
  }

  // INITIALIZE PAGES (NgOninit options)
  private initGeneralPage = () => {
    // init
    this.realTime = true;
    this.selectedFault = undefined;
    this.renderFaultPage = false;
    this.minutesToQuery = undefined;
    this.rightHeader = `Real Time`;

    const runsQueryResponse = this.serverService.query<Run[]>(() => getAllRuns(), { queryKey: ['runs'] });
    this.subscriptions.push(
      runsQueryResponse.isLoading.subscribe((isLoading: boolean) => {
        this.runsIsLoading = isLoading;
      })
    );
    this.subscriptions.push(
      runsQueryResponse.error.subscribe((error) => {
        if (error) {
          this.toastService.add({ severity: 'error', summary: 'Error', detail: error.message });
        }
      })
    );
    this.subscriptions.push(
      runsQueryResponse.data.subscribe((data) => {
        if (data) {
          this.allRuns = data;
        }
      })
    );
  };
  private initFaultPage = () => {
    this.renderFaultPage = true;
    this.minutesToQuery = undefined;

    const selectedFaultSubscription = this.faultService.getSelectedFault();
    this.selectedFault = selectedFaultSubscription.value;
    if (!this.selectedFault) {
      this.router.navigate([appRoutes.faultsRoute()]);
    }
    this.subscriptions.push(selectedFaultSubscription.subscribe((fault) => (this.selectedFault = fault)));
    this.rightHeader = `Fault: ${this.selectedFault?.name}`;
  };

  // reset shit when a run is selected.
  onRunSelected = (run: Run) => {
    this.isPaused = false;

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

    this.setSelectedDataTypes(this.selectedDataTypes);
  };

  onQueryTimeSelected = (queryTime: number) => {
    // Clear existing state first
    this.clearDataType();

    this.isPaused = false;
    this.run = undefined;
    this.minutesToQuery = queryTime;
    this.realTime = false;
    this.selectedDataTypeValuesIsLoading = false;
    this.selectedDataTypeValuesIsError = false;
    this.selectedDataTypeValuesError = undefined;
    this.rightHeader = 'Historical Range';

    this.setSelectedDataTypes(this.selectedDataTypes);
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

    this.setSelectedDataTypes(this.selectedDataTypes);
  };

  /**
   * Queries the datatypes from the server.
   */
  private queryDataTypes() {
    const dataTypesQueryResponse = this.serverService.query<DataType[]>(getAllDatatypes);
    this.subscriptions.push(
      dataTypesQueryResponse.isLoading.subscribe((isLoading: boolean) => {
        this.dataTypesIsLoading = isLoading;
      })
    );
    this.subscriptions.push(
      dataTypesQueryResponse.error.subscribe((error) => {
        if (error) {
          this.dataTypesIsError = true;
          this.dataTypesError = error;
        }
      })
    );
    this.subscriptions.push(
      dataTypesQueryResponse.data.subscribe((data) => {
        if (data) {
          this.dataTypes = data;
        }
      })
    );
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
            // Skip processing if paused
            if (this.isPaused) {
              return;
            }

            const now = new Date();
            const lastMinute = now.getTime() - 60000; // Keep 1 minute of data
            const storedValues = graphInfo.data;

            // Process new values and filter in one pass for better performance
            value.values.forEach((val, i) => {
              const graphData = { x: +value.time, y: +val, label: dataType.name };

              if (storedValues[i]) {
                storedValues[i].push(graphData);

                // Efficiently filter and limit in one operation
                const filtered = storedValues[i].filter((v) => new Date(v.x).getTime() > lastMinute);

                // Limit to prevent memory buildup (keep last 400 points if over 500)
                if (filtered.length > 500) {
                  storedValues[i] = filtered.slice(-400);
                } else {
                  storedValues[i] = filtered;
                }
              } else {
                storedValues[i] = [graphData];
              }
            });

            // Update the subject with the already filtered data
            const targetSubject = this.selectedDataTypeValuesSubject.find((s) => s.getValue().label === dataType.name);
            if (targetSubject) {
              targetSubject.next({
                label: dataType.name,
                data: storedValues
              });
            }
          })
        );
      }
    });
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

      // Track all subscriptions to prevent memory leaks
      this.subscriptions.push(
        dataQueryResponse.error.subscribe((error) => {
          if (error) {
            this.selectedDataTypeValuesIsError = true;
            this.selectedDataTypeValuesError = error;
          }
        })
      );

      this.subscriptions.push(
        dataQueryResponse.isLoading.subscribe((isLoading: boolean) => {
          this.selectedDataTypeValuesIsLoading = isLoading;
        })
      );

      this.subscriptions.push(
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
              // (shouldn't normally happen, but keep it safe)
              target = new BehaviorSubject<GraphInfo>({ label: dataType.name, data: [] });
              this.selectedDataTypeValuesSubject.push(target);
            }

            target.next({ label: dataType.name, data: graphData });
          }
        })
      );
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

  clearGraph = false;

  clearDataType: () => void = () => {
    // Unsubscribe from all previous subscriptions
    this.subscriptions.forEach((sub) => {
      sub.unsubscribe();
    });
    this.subscriptions = [];

    // Clear and complete existing subjects to prevent memory leaks
    this.selectedDataTypeValuesSubject.forEach((subject) => {
      subject.complete();
    });
    this.selectedDataTypeValuesSubject = []; // More explicit reset

    // Reset loading states
    this.selectedDataTypeValuesIsLoading = false;
    this.selectedDataTypeValuesIsError = false;
    this.selectedDataTypeValuesError = undefined;
    this.clearGraph = true;
  };
}
