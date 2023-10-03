import { Component, OnInit } from '@angular/core';
import { getAllNodes } from 'src/api/node.api';
import APIService from 'src/services/api.service';
import { QueryResponse } from 'src/utils/api.utils';
import { Node } from 'src/utils/types.utils';

@Component({
  selector: 'app-root',
  templateUrl: './welcome.component.html'
})
export default class Welcome implements OnInit {
  serverService = new APIService();
  title = 'Welcome to Scylla';
  queryResponse!: QueryResponse<Node[]>; // Declare a property to store the query response

  ngOnInit() {
    // Perform the query and subscribe to the result
    this.queryResponse = this.serverService.query<Node[]>(getAllNodes);
  }
}
