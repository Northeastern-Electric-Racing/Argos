import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import { getDataByDataTypeNameAndRunId } from 'src/api/data.api';
import { getAllNodes } from 'src/api/node.api';
import { getRunById } from 'src/api/run.api';
import APIService from 'src/services/api.service';
import Storage from 'src/services/storage.service';
import { DataValue } from 'src/utils/socket.utils';
import { DataType, Node, Run } from 'src/utils/types.utils';

@Component({
  selector: 'graph-page',
  templateUrl: './graph-page.component.html',
  styleUrls: ['./graph-page.component.css']
})
export default class GraphPage implements OnInit {
  paramsError?: Error;
  runId?: number;
  realTime!: boolean;

  nodes?: Node[];
  nodesIsLoading = true;
  nodesIsError = false;
  nodesError?: Error;

  run?: Run;
  runIsLoading = true;

  selectedDataType: Subject<DataType> = new Subject<DataType>();
  selectedDataTypeValuesSubject: BehaviorSubject<DataValue[]> = new BehaviorSubject<DataValue[]>([]);
  currentValue: Subject<DataValue | undefined> = new Subject<DataValue | undefined>();
  selectedDataTypeValuesIsLoading = false;
  selectedDataTypeValuesIsError = false;
  selectedDataTypeValuesError?: Error;

  constructor(
    private serverService: APIService,
    private storage: Storage,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.parseParams();
    this.queryNodes();
    this.queryRuns();

    this.setSelectedDataType = (dataType: DataType) => {
      this.selectedDataType.next(dataType);
      this.selectedDataTypeValuesSubject.next([]);
      if (this.realTime) {
        const key = dataType.name;
        const valuesSubject = this.storage.get(key);
        valuesSubject.subscribe((value: DataValue) => {
          /* Take only data from the last minute */
          const now = new Date();
          const lastMinute = new Date(now.getTime() - 60000);
          const storedValues = this.selectedDataTypeValuesSubject.getValue();
          storedValues.push(value);
          const nextValue = storedValues.filter((v) => new Date(v.time) > lastMinute);

          this.currentValue.next(value);
          this.selectedDataTypeValuesSubject.next(nextValue);
        });
      } else if (this.runId) {
        this.selectedDataTypeValuesIsLoading = true;
        this.selectedDataTypeValuesIsError = false;
        this.selectedDataTypeValuesError = undefined;

        const dataQueryResponse = this.serverService.query<DataValue[]>(() =>
          getDataByDataTypeNameAndRunId(dataType.name, this.runId!)
        );
        dataQueryResponse.isLoading.subscribe((isLoading: boolean) => {
          this.selectedDataTypeValuesIsLoading = isLoading;
        });
        dataQueryResponse.error.subscribe((error: Error) => {
          this.selectedDataTypeValuesIsError = true;
          this.selectedDataTypeValuesError = error;
        });
        dataQueryResponse.data.subscribe((data: DataValue[]) => {
          this.selectedDataTypeValuesSubject.next(data);
          this.currentValue.next(data.pop());
        });
      }
    };
  }

  /**
   * Queries the nodes from the server.
   */
  private queryNodes() {
    const nodeQueryResponse = this.serverService.query<Node[]>(getAllNodes);
    nodeQueryResponse.isLoading.subscribe((isLoading: boolean) => {
      this.nodesIsLoading = isLoading;
    });
    nodeQueryResponse.error.subscribe((error: Error) => {
      this.nodesIsError = true;
      this.nodesError = error;
    });
    nodeQueryResponse.data.subscribe((data: Node[]) => {
      this.nodes = data;
    });
  }

  /**
   * Queries the runs from the server.
   */
  private queryRuns() {
    if (!this.runId) {
      return;
    }
    const runQueryResponse = this.serverService.query<Run>(() => getRunById(this.runId!));

    runQueryResponse.isLoading.subscribe((isLoading: boolean) => {
      this.runIsLoading = isLoading;
    });

    runQueryResponse.data.subscribe((run) => {
      this.run = run;
    });
  }

  private parseParams() {
    const realTime = this.route.snapshot.paramMap.get('realTime');
    if (realTime) this.realTime = realTime === 'true';
    else {
      this.paramsError = new Error('No real time value provided');
      return;
    }
    const runId = this.route.snapshot.paramMap.get('runId');
    if (runId) {
      if (runId === 'undefined' && this.realTime) {
        this.paramsError = new Error('No Real Time Data Available');
        return;
      }
      this.runId = parseInt(runId);
      if (isNaN(this.runId)) {
        this.paramsError = new Error('Run Id must be a number');
        return;
      }
    } else {
      this.paramsError = new Error('No run id provided');
      return;
    }
  }

  /**
   * Sets the selected data type.
   * @param dataType The data type to set.
   */
  setSelectedDataType!: (dataType: DataType) => void;
}
