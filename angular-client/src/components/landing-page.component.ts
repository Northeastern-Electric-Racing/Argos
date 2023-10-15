import { Component, OnInit } from '@angular/core';
import { io } from 'socket.io-client';
import APIService from 'src/services/api.service';
import { SocketService } from 'src/services/socket.service';
import Storage from 'src/services/storage.service';
import { QueryResponse } from 'src/utils/api.utils';
import { DataValue } from 'src/utils/socket.utils';
import { Node } from 'src/utils/types.utils';

@Component({
  selector: 'app-root',
  templateUrl: './landing-page.component.html'
})
export default class LandingPage implements OnInit {
  serverService = new APIService();
  driverQueryResponse!: QueryResponse<Node[]>; // Declare a property to store the query response
  storageMap = new Map<string, DataValue[]>();
  storage = new Storage(this.storageMap);
  socket = io('http://localhost:3000');
  socketService = new SocketService(this.socket);
  time = new Date();
  currentDriver = this.storage.get('driver')?.[0].value ?? 'No Driver Selected';
  currentLocation = this.storage.get('location')?.[0].value ?? 'No Location Selected';
  currentSystem = this.storage.get('system')?.[0].value ?? 'No System Selected';

  ngOnInit() {
    this.socketService.receiveData(this.storage);
    // Perform the query and subscribe to the result
    setInterval(() => {
      this.time = new Date();
    }, 1000);
  }
}
