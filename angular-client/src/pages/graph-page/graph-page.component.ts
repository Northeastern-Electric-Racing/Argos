import { Component, Input, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { getDataByDataTypeName } from 'src/api/data.api';
import { getAllNodes } from 'src/api/node.api';
import APIService from 'src/services/api.service';
import Storage from 'src/services/storage.service';
import { DataValue } from 'src/utils/socket.utils';
import { DataType, Node } from 'src/utils/types.utils';

@Component({
  selector: 'graph-page',
  templateUrl: './graph-page.component.html',
  styleUrls: ['./graph-page.component.css']
})
export default class GraphPage implements OnInit {
  @Input() serverService!: APIService;
  @Input() storage!: Storage;
  nodes?: Node[];
  nodesIsLoading = true;
  nodesIsError = false;
  nodesError?: Error;
  selectedDataType?: DataType;
  selectedDataTypeValuesSubject: Subject<DataValue[]> = new Subject<DataValue[]>();
  selectedDataTypeValuesIsLoading = false;
  selectedDataTypeValuesIsError = false;
  selectedDataTypeValuesError?: Error;
  realTime?: boolean;

  ngOnInit(): void {
    const nodeQueryResponse = this.serverService.query<Node[]>(getAllNodes);
    nodeQueryResponse.isLoading.subscribe((isLoading: boolean) => {
      this.nodesIsLoading = isLoading;
    });
    nodeQueryResponse.error.subscribe((error: Error) => {
      this.nodesIsError = true;
      this.nodesError = error;
    });
    nodeQueryResponse.data.subscribe((data: Node[]) => {
      console.log(data);
      this.nodes = data;
    });

    this.setSelectedDataType = (dataType: DataType) => {
      this.selectedDataType = dataType;
      if (this.realTime) {
        //   this.selectedDataTypeValuesSubject =
        //     this.storage.get(
        //       JSON.stringify({
        //         dataType: dataType.name,
        //         unit: dataType.unit
        //       })
        //     ) ?? [];
      } else {
        this.selectedDataTypeValuesIsLoading = true;
        this.selectedDataTypeValuesIsError = false;
        this.selectedDataTypeValuesError = undefined;

        const queryResponse = this.serverService.query<DataValue[]>(() => getDataByDataTypeName(dataType.name));
        queryResponse.isLoading.subscribe((isLoading: boolean) => {
          this.selectedDataTypeValuesIsLoading = isLoading;
        });
        queryResponse.error.subscribe((error: Error) => {
          this.selectedDataTypeValuesIsError = true;
          this.selectedDataTypeValuesError = error;
        });
        queryResponse.data.subscribe((data: DataValue[]) => {
          this.selectedDataTypeValuesSubject.next(data);
        });
      }
    };
  }

  /**
   * Sets the selected data type.
   * @param dataType The data type to set.
   */
  setSelectedDataType!: (dataType: DataType) => void;
}
