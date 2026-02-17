import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
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
import { TopicSelectionService } from 'src/services/topic-selection.service';
import { DataValue } from 'src/utils/socket.utils';
import { DataType, FaultData, GraphData, ObservableGraphInfo, Run } from 'src/utils/types.utils';
import { ButtonComponent } from '../../components/argos-button/argos-button.component';
import { FaultButtonsComponent } from './graph-caption/fault-buttons/fault-buttons.component';
import { GeneralButtonsComponent } from './graph-caption/general-buttons/general-buttons.component';
import GraphSidebarComponent from './graph-sidebar/graph-sidebar.component';
import HStackComponent from 'src/components/hstack/hstack.component';
import CustomGraphComponent from './graph/graph.component';
import LoadingPageComponent from 'src/components/loading-page/loading-page.component';
import ErrorPageComponent from 'src/components/error-page/error-page.component';
import TypographyComponent from '../../components/typography/typography.component';
import { InputNumberModule } from 'primeng/inputnumber';
import { FormsModule } from '@angular/forms';

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
    TypographyComponent,
    InputNumberModule,
    FormsModule
  ]
})
export default class GraphPageComponent implements OnInit, OnDestroy {
  private serverService = inject(APIService);
  private storage = inject(Storage);
  private toastService = inject(MessageService);
  private faultService = inject(FaultService);
  private topicSelectionService = inject(TopicSelectionService);
  private router = inject(Router); // for fault page navigation
  private route = inject(ActivatedRoute);

  // keep track of the subscriptions, that way we cancel all subs anywhere anytime
  subscriptions: Subscription[] = [];
  // Persistent subscriptions that should not be cleared when switching data modes
  persistentSubscriptions: Subscription[] = [];

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
  selectedDataTypeValuesSubject: ObservableGraphInfo[] = [];
  selectedDataTypeValuesIsLoading = false; // specifically used for querying updates.
  selectedDataTypeValuesIsError = false;
  selectedDataTypeValuesError?: Error;
  dataPoints: number = 100;
  dataPointsChanged = false;
  yAxisMin: number | null = null;
  yAxisMax: number | null = null;
  // Range mode: 'time' for time-based range, 'points' for data point-based range
  rangeMode: 'time' | 'points' = 'time'; // Default to time-based
  timeRangeSeconds: number = 30; // Default to 30 seconds
  graphConfig = {
    maxPoints: this.dataPoints,
    yMin: this.yAxisMin,
    yMax: this.yAxisMax,
    rangeMode: this.rangeMode,
    timeRangeMs: this.timeRangeSeconds * 1000
  };
  onGraphConfigChange = () => {
    if (this.realTime) {
      this.onSetRealtime();
    }
    this.graphConfig = {
      maxPoints: this.dataPoints,
      yMin: this.yAxisMin,
      yMax: this.yAxisMax,
      rangeMode: this.rangeMode,
      timeRangeMs: this.timeRangeSeconds * 1000
    };
  };
  // Getter/setter to allow same function input for ngModel in template.
  get rangeValue(): number {
    return this.rangeMode === 'time' ? this.timeRangeSeconds : this.dataPoints;
  }
  set rangeValue(val: number) {
    if (this.rangeMode === 'time') {
      this.timeRangeSeconds = val;
    } else {
      this.dataPoints = val;
    }
  }

  toggleRangeMode = () => {
    this.rangeMode = this.rangeMode === 'time' ? 'points' : 'time';
    this.onGraphConfigChange();
  };

  // Run when page starts up
  ngOnInit(): void {
    this.queryDataTypes();
    this.run = undefined;

    // Subscribe to the topic selection service (persistent - should not be cleared)
    this.persistentSubscriptions.push(
      this.topicSelectionService.getSelectedDataTypes().subscribe((dataTypes) => {
        // Only process if we have data types AND they're different from current selection
        if (dataTypes.length > 0 || this.selectedDataTypes.length > 0) {
          this.processDataTypeSelection(dataTypes);
        }
        this.updateUrl(dataTypes);
      })
    );

    // Subscribe to URL changes to sync back to service
    this.persistentSubscriptions.push(
      this.route.queryParamMap.subscribe((params) => {
        this.syncUrlToService(params);
      })
    );

    this.onFaultPage = this.router.url.includes(appRoutes.faultsRoute());
    if (this.onFaultPage) this.initFaultPage();
    else this.initGeneralPage();
  }

  // All memory in use should be discarded here.
  ngOnDestroy(): void {
    // Clean up regular subscriptions
    this.subscriptions.forEach((sub) => {
      sub.unsubscribe();
    });

    // Clean up persistent subscriptions
    this.persistentSubscriptions.forEach((sub) => {
      sub.unsubscribe();
    });

    this.selectedDataTypeValuesSubject.forEach((item) => {
      item.updates.complete();
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
    this.persistentSubscriptions.push(
      runsQueryResponse.isLoading.subscribe((isLoading: boolean) => {
        this.runsIsLoading = isLoading;
      })
    );
    this.persistentSubscriptions.push(
      runsQueryResponse.error.subscribe((error) => {
        if (error) {
          this.toastService.add({ severity: 'error', summary: 'Error', detail: error.message });
        }
      })
    );
    this.persistentSubscriptions.push(
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
    this.persistentSubscriptions.push(selectedFaultSubscription.subscribe((fault) => (this.selectedFault = fault)));
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

    // Re-apply current selection from service to trigger data load for this run
    const currentSelection = this.topicSelectionService.getSelectedDataTypes().value;
    this.processDataTypeSelection(currentSelection);
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
    this.rightHeader = 'Hist Range';

    // Re-apply current selection from service to trigger data load for this time range
    const currentSelection = this.topicSelectionService.getSelectedDataTypes().value;
    this.processDataTypeSelection(currentSelection);
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

    // Re-apply current selection from service to trigger real-time data subscription
    const currentSelection = this.topicSelectionService.getSelectedDataTypes().value;
    this.processDataTypeSelection(currentSelection);
  };

  /**
   * Queries the datatypes from the server.
   */
  private queryDataTypes() {
    const dataTypesQueryResponse = this.serverService.query<DataType[]>(getAllDatatypes);
    this.persistentSubscriptions.push(
      dataTypesQueryResponse.isLoading.subscribe((isLoading: boolean) => {
        this.dataTypesIsLoading = isLoading;
      })
    );
    this.persistentSubscriptions.push(
      dataTypesQueryResponse.error.subscribe((error) => {
        if (error) {
          this.dataTypesIsError = true;
          this.dataTypesError = error;
        }
      })
    );
    this.persistentSubscriptions.push(
      dataTypesQueryResponse.data.subscribe((data) => {
        if (data) {
          this.dataTypes = data;
          // Once the datatypes are actually loaded, sync to url
          this.syncUrlToService(this.route.snapshot.queryParamMap);
          this.updateUrl(this.topicSelectionService.getSelectedDataTypes().value);
        }
      })
    );
  }

  private syncUrlToService(params: ParamMap) {
    if (this.dataTypes.length === 0) return;

    const topicNames = new Set(params.get('topics')?.split(',') ?? []);
    const topics = this.dataTypes.filter((dt) => topicNames.has(dt.name));

    this.topicSelectionService.setSelectedDataTypes(topics);
  }

  private updateUrl(selectedDataTypes: DataType[]) {
    if (this.dataTypes.length === 0) return;

    const topics = selectedDataTypes.map((dt) => dt.name).join(',') || null;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { topics },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  private processRealTimeDataTypeSelection = (dataTypes: DataType[]) => {
    dataTypes.forEach((dataType) => {
      const key = dataType.name;
      const target = this.selectedDataTypeValuesSubject.find((s) => s.label === key);
      const valuesSubject = this.storage.get(key);

      if (target !== undefined) {
        this.subscriptions.push(
          valuesSubject.subscribe((value: DataValue) => {
            // Skip processing if paused
            if (this.isPaused) {
              return;
            }

            const newPoints: GraphData[][] = value.values.map((val) => {
              return [{ x: +value.time, y: +val }];
            });

            target.updates.next(newPoints);
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

            let target = this.selectedDataTypeValuesSubject.find((s) => s.label === dataType.name);

            if (!target) {
              // (shouldn't normally happen, but keep it safe)
              target = { label: dataType.name, updates: new BehaviorSubject<GraphData[][]>([]) };
              this.selectedDataTypeValuesSubject.push(target);
            }

            target.updates.next(graphData);
          }
        })
      );
    });
  };

  /**
   * Processes data type selection changes from the service.
   * This is called when the service emits a new selection.
   * @param dataTypes The new array of selected data types
   */
  private processDataTypeSelection = (dataTypes: DataType[]) => {
    this.clearDataType();
    this.selectedDataTypes = dataTypes;

    this.selectedDataTypeValuesSubject = dataTypes.map((dt) => ({
      label: dt.name,
      updates: new BehaviorSubject<GraphData[][]>([])
    }));

    if (this.realTime) {
      this.processRealTimeDataTypeSelection(dataTypes);
    } else if (this.run !== undefined || this.selectedFault !== undefined || this.minutesToQuery !== undefined) {
      this.processHistoricalDataTypeSelection(dataTypes); // ← pass whole array
    } else {
      this.toastService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No run selected. Please select a run or choose "Real Time".'
      });
    }
  };

  clearGraph = 0;

  clearDataType: () => void = () => {
    // Unsubscribe from all previous subscriptions
    this.subscriptions.forEach((sub) => {
      sub.unsubscribe();
    });
    this.subscriptions = [];

    // Clear and complete existing subjects to prevent memory leaks
    this.selectedDataTypeValuesSubject.forEach((item) => {
      item.updates.complete();
    });
    this.selectedDataTypeValuesSubject = []; // More explicit reset

    // Reset loading states
    this.selectedDataTypeValuesIsLoading = false;
    this.selectedDataTypeValuesIsError = false;
    this.selectedDataTypeValuesError = undefined;
    this.clearGraph++;
  };
}
