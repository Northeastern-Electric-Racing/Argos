import { Component, HostListener, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import { getDataByDataTypeNameAndRunId } from 'src/api/data.api';
import { getAllNodes } from 'src/api/node.api';
import { getAllRuns } from 'src/api/run.api';
import APIService from 'src/services/api.service';
import Storage from 'src/services/storage.service';
import { DataValue } from 'src/utils/socket.utils';
import { DataType, GraphData, Node, Run } from 'src/utils/types.utils';

@Component({
  selector: 'graph-page',
  templateUrl: './graph-page.component.html',
  styleUrls: ['./graph-page.component.css']
})
export default class GraphPage implements OnInit {
  realTime: boolean = true;

  nodes?: Node[];
  nodesIsLoading = true;
  nodesIsError = false;
  nodesError?: Error;

  run?: Run;

  allRuns!: Run[];
  runsIsLoading = true;

  previousDataType?: DataType;

  selectedDataType: Subject<DataType> = new Subject<DataType>();
  selectedDataTypeValuesSubject: BehaviorSubject<GraphData[]> = new BehaviorSubject<GraphData[]>([]);
  currentValue: Subject<DataValue | undefined> = new Subject<DataValue | undefined>();
  selectedDataTypeValuesIsLoading = false;
  selectedDataTypeValuesIsError = false;
  selectedDataTypeValuesError?: Error;
  subscription?: Subscription;

  dataTypeName?: string;

  constructor(
    private serverService: APIService,
    private storage: Storage,
    private toastService: MessageService
  ) {}

  ngOnInit(): void {
    this.queryNodes();

    const runsQueryResponse = this.serverService.query<Run[]>(() => getAllRuns());
    runsQueryResponse.isLoading.subscribe((isLoading: boolean) => {
      this.runsIsLoading = isLoading;
    });
    runsQueryResponse.error.subscribe((error: Error) => {
      this.toastService.add({ severity: 'error', summary: 'Error', detail: error.message });
    });
    runsQueryResponse.data.subscribe((data: Run[]) => {
      this.allRuns = data;
    });

    this.clearDataType = () => {
      if (this.subscription) this.subscription.unsubscribe();
      this.selectedDataType.next({ name: '', unit: '' });
      this.selectedDataTypeValuesSubject = new BehaviorSubject<GraphData[]>([]);
    };

    this.setSelectedDataType = (dataType: DataType) => {
      this.selectedDataType.next(dataType);
      this.selectedDataTypeValuesSubject = new BehaviorSubject<GraphData[]>([]);
      if (this.realTime) {
        if (this.subscription) this.subscription.unsubscribe();
        const key = dataType.name;
        const valuesSubject = this.storage.get(key);
        this.subscription = valuesSubject.subscribe((value: DataValue) => {
          /* Take only data from the last minute */
          const now = new Date();
          const lastMinute = new Date(now.getTime() - 60000);
          const storedValues = this.selectedDataTypeValuesSubject.getValue();
          storedValues.push({ x: +value.time, y: +value.values[0] });
          const nextValue = storedValues.filter((v) => new Date(v.x) > lastMinute);

          this.currentValue.next(value);
          this.selectedDataTypeValuesSubject.next(nextValue);
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
        dataQueryResponse.error.subscribe((error: Error) => {
          this.selectedDataTypeValuesError = error;
          this.selectedDataTypeValuesIsError = true;
        });
        dataQueryResponse.data.subscribe((data: DataValue[]) => {
          console.log(data);
          this.selectedDataTypeValuesSubject.next(data.map((value) => ({ x: +value.time, y: +value.values[0] })));
          this.currentValue.next(data.pop());
        });
      } else {
        this.toastService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No run selected Please select a run. Choose most recent for real time.'
        });
      }
    };

    this.selectedDataType.subscribe((dataType: DataType) => {
      this.dataTypeName = dataType.name;
    });
  }

  onRunSelected = (run: Run) => {
    this.run = run;
    this.realTime = run.id === this.storage.getCurrentRunId().value;
    this.selectedDataTypeValuesSubject.next([]);
    this.selectedDataTypeValuesIsLoading = false;
    this.selectedDataTypeValuesIsError = false;
    this.selectedDataTypeValuesError = undefined;
  };

  onSetRealtime = () => {
    const currentRunId = this.storage.getCurrentRunId().value;
    if (currentRunId) {
      this.run = this.allRuns.find((run) => run.id === currentRunId);
      this.realTime = true;
      this.selectedDataTypeValuesSubject.next([]);
      this.selectedDataTypeValuesIsLoading = false;
      this.selectedDataTypeValuesIsError = false;
      this.selectedDataTypeValuesError = undefined;
    }
  };

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
   * Sets the selected data type.
   * @param dataType The data type to set.
   */
  setSelectedDataType!: (dataType: DataType) => void;

  clearDataType!: () => void;

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (this.dataTypeName == undefined) {
      this.setSelectedDataType(this.nodes?.at(0)?.dataTypes[0] as DataType);
    } else {
      const node = this.getNode(this.dataTypeName as string);
      const nodeIndex = this.getNodeIndex(this.getNode(this.dataTypeName as string));
      const dataTypeIndex = this.getDataTypeIndex(
        this.getNode(this.dataTypeName as string),
        this.getDataType(this.getNode(this.dataTypeName as string), this.dataTypeName as string)
      );
      if (event.key == 'ArrowDown') {
        if (dataTypeIndex + 1 == node.dataTypes.length && nodeIndex + 1 == this.nodes?.length) {
          this.setSelectedDataType(this.nodes?.at(0)?.dataTypes[0] as DataType);
        } else if (dataTypeIndex + 1 == node.dataTypes.length) {
          this.setSelectedDataType(this.nodes?.at(nodeIndex + 1)?.dataTypes[0] as DataType);
        } else {
          this.setSelectedDataType(node.dataTypes[dataTypeIndex + 1]);
        }
      } else if (event.key == 'ArrowUp') {
        if (dataTypeIndex == 0 && nodeIndex == 0) {
          const lastNode = this.nodes?.at(this.nodes.length - 1) as Node;
          this.setSelectedDataType(lastNode.dataTypes[(lastNode.dataTypes.length as number) - 1] as DataType);
        } else if (dataTypeIndex == 0) {
          const lastNode = this.nodes?.at(nodeIndex - 1) as Node;
          this.setSelectedDataType(lastNode.dataTypes[(lastNode.dataTypes.length as number) - 1] as DataType);
        } else {
          this.setSelectedDataType(node.dataTypes[dataTypeIndex - 1]);
        }
      }
    }
  }

  private getNode(name: string): Node {
    return this.nodes?.filter(
      (node: Node) => node.dataTypes.filter((dataType: DataType) => dataType.name == name)[0]
    )[0] as Node;
  }

  private getNodeIndex(node: Node): number {
    return this.nodes?.indexOf(node) as number;
  }

  private getDataType(node: Node, name: string) {
    return node.dataTypes.filter((dataType: DataType) => dataType.name == name)[0];
  }

  private getDataTypeIndex(node: Node, dataType: DataType) {
    return node.dataTypes.indexOf(dataType);
  }
}
