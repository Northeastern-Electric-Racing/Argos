import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import { getDataByDataTypeName } from 'src/api/data.api';
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
      if (this.realTime) {
        const key = JSON.stringify({
          name: dataType.name,
          unit: dataType.unit
        });
        const valuesSubject = this.storage.get(key);
        if (valuesSubject) {
          this.selectedDataTypeValuesSubject.next(valuesSubject.getValue());
        } else {
          this.storage.set(key, this.selectedDataTypeValuesSubject);
        }
      } else {
        this.selectedDataTypeValuesIsLoading = true;
        this.selectedDataTypeValuesIsError = false;
        this.selectedDataTypeValuesError = undefined;

        const dataQueryResponse = this.serverService.query<DataValue[]>(() => getDataByDataTypeName(dataType.name));
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
    const realtTime = this.route.snapshot.paramMap.get('realTime');
    if (realtTime) this.realTime = realtTime === 'true';
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
