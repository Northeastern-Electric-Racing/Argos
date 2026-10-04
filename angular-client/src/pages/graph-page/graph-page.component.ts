import { ChangeDetectorRef, Component, computed, OnDestroy, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BehaviorSubject, Subscription } from 'rxjs';
import { getDataByDatatTypeNameAndTiming, getDataByDataTypeNameAndRunId } from 'src/api/data.api';
import { getAllDatatypes } from 'src/api/datatype.api';
import { getAllRuns } from 'src/api/run.api';
import { appRoutes } from 'src/app/app-routes';
import APIService from 'src/services/api.service';
import { FaultService } from 'src/services/fault.service';
import Storage from 'src/services/storage.service';
import { TopicSelectionService } from 'src/services/topic-selection.service';
import { DataValue } from 'src/utils/socket.utils';
import { DataType, FaultData, GraphData, ObservableGraphInfo, Run } from 'src/utils/types.utils';
import { ButtonComponent } from '../../components/argos-button/argos-button.component';
import { FaultButtonsComponent } from './graph-caption/fault-buttons/fault-buttons.component';
import { GeneralButtonsComponent, RangePreset } from './graph-caption/general-buttons/general-buttons.component';
import GraphSidebarComponent from './graph-sidebar/graph-sidebar.component';
import CustomGraphComponent from './graph/graph.component';
import LiveValueStripComponent from './live-value-strip/live-value-strip.component';
import LoadingPageComponent from 'src/components/loading-page/loading-page.component';
import ErrorPageComponent from 'src/components/error-page/error-page.component';
import TypographyComponent from '../../components/typography/typography.component';
import { InputNumberModule } from 'primeng/inputnumber';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'graph-page',
  templateUrl: './graph-page.component.html',
  styleUrls: ['./graph-page.component.css'],
  imports: [
    LoadingPageComponent,
    ErrorPageComponent,
    ButtonComponent,
    FaultButtonsComponent,
    GeneralButtonsComponent,
    GraphSidebarComponent,
    CustomGraphComponent,
    LiveValueStripComponent,
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
  // Required: forces CD when the isLoading BehaviorSubject transitions during the initial CD cycle
  // (removing this re-introduces NG0100 on the loading→content branch flip). See PR #550 review thread.
  private cdr = inject(ChangeDetectorRef);

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
  // Historical-range state. Exactly one of these is set when the user is in historical mode.
  // Signals so derived computeds and downstream OnPush children update reliably even if
  // graph-page itself is later switched to OnPush change detection.
  selectedPresetMinutes = signal<number | undefined>(undefined);
  customLastXMinutes = signal<number | undefined>(undefined);
  customDateRange = signal<{ startMs: number; endMs: number } | undefined>(undefined);
  showMultiYaxis = false;
  toggleMultiYaxis = () => {
    this.showMultiYaxis = !this.showMultiYaxis;
  };
  isPaused = false;
  togglePause = () => {
    this.isPaused = !this.isPaused;
  };

  rangePresets: RangePreset[] = [
    { label: '1 minute', minutes: 1 },
    { label: '2 minutes', minutes: 2 },
    { label: '5 minutes', minutes: 5 },
    { label: '10 minutes', minutes: 10 },
    { label: '15 minutes', minutes: 15 },
    { label: '30 minutes', minutes: 30 },
    { label: '1 hour', minutes: 60 },
    { label: '2 hours', minutes: 120 },
    { label: '4 hours', minutes: 240 },
    { label: '8 hours', minutes: 480 },
    { label: '24 hours', minutes: 1440 }
  ];

  historicalRangeActive = computed<boolean>(
    () =>
      this.selectedPresetMinutes() !== undefined ||
      this.customLastXMinutes() !== undefined ||
      this.customDateRange() !== undefined
  );

  customRangeActive = computed<boolean>(
    () => this.customLastXMinutes() !== undefined || this.customDateRange() !== undefined
  );

  customRangeCaption = computed<string | null>(() => {
    const lastX = this.customLastXMinutes();
    if (lastX !== undefined) return `Last ${this.formatMinutes(lastX)}`;
    const range = this.customDateRange();
    if (range !== undefined) return this.formatDateRange(range.startMs, range.endMs);
    return null;
  });

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
    this.clearHistoricalRangeState();
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
    this.clearHistoricalRangeState();

    const selectedFaultSubscription = this.faultService.getSelectedFault();
    this.selectedFault = selectedFaultSubscription.value;
    if (!this.selectedFault) {
      this.router.navigate([appRoutes.faultsRoute()]);
    }
    this.persistentSubscriptions.push(selectedFaultSubscription.subscribe((fault) => (this.selectedFault = fault)));
    this.rightHeader = `Fault: ${this.selectedFault?.name}`;
  };

  private clearHistoricalRangeState() {
    this.selectedPresetMinutes.set(undefined);
    this.customLastXMinutes.set(undefined);
    this.customDateRange.set(undefined);
  }

  // Reset graph state and switch into Run mode when a run is selected.
  onRunSelected = (run: Run) => {
    this.isPaused = false;

    // Clear existing state first
    this.clearDataType();

    this.run = run;
    this.realTime = false;
    this.clearHistoricalRangeState();
    this.selectedDataTypeValuesSubject = [];
    this.selectedDataTypeValuesIsLoading = false;
    this.selectedDataTypeValuesIsError = false;
    this.selectedDataTypeValuesError = undefined;
    this.rightHeader = 'Run #' + run.id;

    // Re-apply current selection from service to trigger data load for this run
    const currentSelection = this.topicSelectionService.getSelectedDataTypes().value;
    this.processDataTypeSelection(currentSelection);
  };

  private startHistoricalQuery() {
    this.isPaused = false;
    this.run = undefined;
    this.realTime = false;
    this.selectedDataTypeValuesIsLoading = false;
    this.selectedDataTypeValuesIsError = false;
    this.selectedDataTypeValuesError = undefined;
    this.rightHeader = 'Historical';

    // Re-apply current selection from service to trigger data load for this time range
    const currentSelection = this.topicSelectionService.getSelectedDataTypes().value;
    this.processDataTypeSelection(currentSelection);
  }

  onSelectPreset = (minutes: number) => {
    this.clearDataType();
    this.clearHistoricalRangeState();
    this.selectedPresetMinutes.set(minutes);
    this.startHistoricalQuery();
  };

  onApplyCustomLastX = (totalMinutes: number) => {
    this.clearDataType();
    this.clearHistoricalRangeState();
    this.customLastXMinutes.set(totalMinutes);
    this.startHistoricalQuery();
  };

  onApplyCustomDateRange = (startMs: number, endMs: number) => {
    this.clearDataType();
    this.clearHistoricalRangeState();
    this.customDateRange.set({ startMs, endMs });
    this.startHistoricalQuery();
  };

  private formatMinutes(mins: number): string {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }

  private formatDateRange(startMs: number, endMs: number): string {
    const start = new Date(startMs);
    const end = new Date(endMs);
    const sameDay =
      start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth() && start.getDate() === end.getDate();
    const dateOpts: Intl.DateTimeFormatOptions = { month: 'numeric', day: 'numeric' };
    const timeOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
    const startStr = `${start.toLocaleDateString('en-US', dateOpts)} ${start.toLocaleTimeString('en-US', timeOpts)}`;
    const endStr = sameDay
      ? end.toLocaleTimeString('en-US', timeOpts)
      : `${end.toLocaleDateString('en-US', dateOpts)} ${end.toLocaleTimeString('en-US', timeOpts)}`;
    return `${startStr} → ${endStr}`;
  }

  // get real time ready
  onSetRealtime = () => {
    // Clear existing state first
    this.clearDataType();

    this.run = undefined;
    this.realTime = true;
    // Clear pause explicitly: today the only path back to RT is via the historical-mode
    // Realtime button (which goes through startHistoricalQuery — also clears pause), but
    // making the reset explicit here keeps the invariant local to the transition itself.
    this.isPaused = false;
    this.clearHistoricalRangeState();
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
        this.cdr.detectChanges();
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

    const topicsParam = params.get('topics');
    if (!topicsParam) return;

    // URL → service is additive only. The service is source of truth; the URL is a view of
    // it (kept in sync by updateUrl). When URL and service diverge, we only add what the URL
    // contributes (deep-link hydration) — never remove. Removals come from explicit UI actions.
    const topicNames = new Set(topicsParam.split(','));
    const topicsFromUrl = this.dataTypes.filter((dt) => topicNames.has(dt.name));
    this.topicSelectionService.addDataTypes(topicsFromUrl);
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
      } else if (this.customDateRange() !== undefined) {
        // Anchor the lookback at endMs and treat the span as `before` minutes. The backend's
        // Timing payload is minute-granularity, so we ceil; this can return up to ~60s of
        // extra data on the start side relative to the picker (which exposes seconds), which
        // is preferable to losing data — a "5:00:30 → 5:05:15" pick fetches "5:00:15 → 5:05:15".
        const { startMs, endMs } = this.customDateRange()!;
        const beforeMinutes = Math.max(1, Math.ceil((endMs - startMs) / 60000));
        queryFn = () =>
          getDataByDatatTypeNameAndTiming(dataType.name, {
            time: endMs,
            before: beforeMinutes,
            after: 0
          });
      } else if (this.selectedPresetMinutes() !== undefined || this.customLastXMinutes() !== undefined) {
        const minutes = (this.selectedPresetMinutes() ?? this.customLastXMinutes())!;
        queryFn = () =>
          getDataByDatatTypeNameAndTiming(dataType.name, {
            time: new Date().getTime(),
            before: minutes,
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
    } else if (this.run !== undefined || this.selectedFault !== undefined || this.historicalRangeActive()) {
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
