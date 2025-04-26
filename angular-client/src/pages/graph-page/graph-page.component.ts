import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import { getAllDatatypes } from 'src/api/datatype.api';
import { getAllRuns } from 'src/api/run.api';
import { appRoutes } from 'src/app/app-routing.module';
import APIService from 'src/services/api.service';
import { FaultService } from 'src/services/fault.service';
import Storage from 'src/services/storage.service';
import { DataValue } from 'src/utils/socket.utils';
import { DataType, FaultData, GraphInfo, Run } from 'src/utils/types.utils';

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

  dataTypes: DataType[] = [];
  dataTypesIsLoading = true;
  dataTypesIsError = false;
  dataTypesError?: Error;

  allRuns: Run[] = [];
  runsIsLoading = true;

  previousDataType?: DataType;

  // this shit is only used for the fucking graph caption I hate it.
  selectedDataType = new Subject<DataType[] | undefined>();
  selectedDataTypeValuesSubject = new BehaviorSubject<GraphInfo[]>([]);
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
    this.selectedDataTypeValuesSubject.next([]);
    this.selectedDataTypeValuesIsLoading = false;
    this.selectedDataTypeValuesIsError = false;
    this.selectedDataTypeValuesError = undefined;
    this.rightHeader = 'Run #' + run.id;
  };

  // get real time ready
  onSetRealtime = () => {
    const currentRunId = this.storage.getCurrentRunId().value;
    if (currentRunId) {
      this.run = this.allRuns.find((run) => run.id === currentRunId);
      this.realTime = true;
      this.selectedDataTypeValuesSubject.next([]);
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
        console.log('Data types:', data);
        this.dataTypes = data;
      }
    });
  }

  private processRealTimeDataTypeSelection = (dataTypes: DataType[]) => {
    const dataTypeValues = this.selectedDataTypeValuesSubject.getValue();
    dataTypes.forEach((dataType) => {
      const key = dataType.name;
      const graphInfo = dataTypeValues.find((dtV) => dtV.label === key);
      const valuesSubject = this.storage.get(key);
      if (graphInfo !== undefined) {
        this.subscriptions.push(
          valuesSubject.subscribe((value: DataValue) => {
            /* Take only data from the last minute, fucking why? I WANT MORE DATA MORRRREEEEEEEEEEE */
            const now = new Date();
            const lastMinute = now.getTime() - 60000;
            // get the fucking GraphInfo for the current topic
            // ok right now... I'm thinking to myself (WHAT THE FUCK IS THE POINT OF HAVING A FUCKING 2-d ARRAY)
            // well unfortunately we try to track multiple values accross time, keeping track of all their points...
            // I for one think this is stupid, why the fuck would you do that, if instead you can just fucking add points on too
            // the graph, and let it take care of that. FUCK THIS SHIT ITS SO FUCKING STUPID.
            const storedValues = graphInfo.data;
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

            this.currentValues.push(value);
            this.selectedDataTypeValuesSubject.getValue().push({
              ...graphInfo,
              data: nextValue
            });
          })
        );
      }
    });
  };

  // private processHistoricalDataTypeSelection = (dataType: DataType, queryFunction: () => Promise<Response>) => {
  //   this.selectedDataTypeValuesIsLoading = true;
  //   this.selectedDataTypeValuesIsError = false;
  //   this.selectedDataTypeValuesError = undefined;

  //   const dataQueryResponse = this.serverService.query<DataValue[]>(queryFunction);
  //   dataQueryResponse.isLoading.subscribe((isLoading: boolean) => {
  //     this.selectedDataTypeValuesIsLoading = isLoading;
  //   });
  //   dataQueryResponse.error.subscribe((error) => {
  //     if (error) {
  //       this.selectedDataTypeValuesError = error;
  //       this.selectedDataTypeValuesIsError = true;
  //     }
  //   });
  //   dataQueryResponse.data.subscribe((data) => {
  //     if (data) {
  //       const graphData: GraphData[][] = [];
  //       data.forEach((dataValue) => {
  //         dataValue.values.forEach((value, i) => {
  //           if (graphData[i]) {
  //             graphData[i].push({ x: +dataValue.time, y: +value });
  //           } else {
  //             graphData[i] = [{ x: +dataValue.time, y: +value }];
  //           }
  //         });
  //       });
  //       this.selectedDataTypeValuesSubject.next({
  //         label: dataType.name,
  //         data: graphData
  //       });
  //       this.currentValue.next(data.pop());
  //     }
  //   });
  // };

  /**
   * Sets the selected data type.
   * @param dataType The data type to set.
   */
  setSelectedDataTypes = (dataTypes: DataType[]) => {
    // get rid of the fucking current data type, and it's fucking subscription
    this.clearDataType();
    // set the selected data type (is this the best way to update it? I don't fucking know...
    // I bet a better fucking way would be mutate a fucking behavorial subject
    // however, that could be fucking anoying to debug for those that use this subject.
    // I'll come back with a better undersanding...
    // update: selectedDataType has no fucking, fuck the graph caption.
    this.selectedDataType.next(dataTypes);

    // now this shit seems kinda crazzzzzy tooo me, MAKING A FUCKING NEW GRAPH INFO BEHAVORIAL SUBJECT FOR
    // EVERY FUCKING TIME WE CHANGE DATA TYPES FUCKKKKKK THIS.
    this.selectedDataTypeValuesSubject.next(
      dataTypes.map((dt) => ({
        label: dt.name,
        data: []
      }))
    );

    if (this.realTime) this.processRealTimeDataTypeSelection(dataTypes);
    // else if (this.run !== undefined)
    //   this.processHistoricalDataTypeSelection(dataType, () => getDataByDataTypeNameAndRunId(dataType.name, this.run!.id));
    // else if (this.selectedFault !== undefined)
    //   this.processHistoricalDataTypeSelection(dataType, () =>
    //     getDataByDatatTypeNameAndTiming(dataType.name, { time: this.selectedFault!.lastSeen.getTime(), before: 1, after: 1 })
    //   );
    else {
      this.toastService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No run selected Please select a run. Choose most recent for real time.'
      });
    }
  };

  clearDataType: () => void = () => {
    this.subscriptions.forEach((sub) => {
      if (sub) {
        sub.unsubscribe();
      }
    });
    this.selectedDataType.next([]);
    this.selectedDataTypeValuesSubject.next([]);
  };
}
