import { Component, Input, OnInit } from '@angular/core';
import { getAllNodes } from 'src/api/node.api';
import APIService from 'src/services/api.service';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/ImportantDataType';
import { Node } from 'src/utils/types.utils';

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

  dataType: string;
  currentValue: number;
  unit: string;
  currentDriver: string;
  currentSystem: string;
  currentLocation: string;

  constructor() {
    this.dataType = 'Some DataType';
    this.currentValue = 0;
    this.unit = 'Some Unit';
    this.currentDriver = 'Some Driver';
    this.currentSystem = 'Some System';
    this.currentLocation = 'Some Location';
  }

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
      this.nodes = data;
    });
  }
}
