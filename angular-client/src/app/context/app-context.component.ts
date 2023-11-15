import { Component, OnInit } from '@angular/core';
import { io } from 'socket.io-client';
import APIService from 'src/services/api.service';
import { SocketService } from 'src/services/socket.service';
import Storage from 'src/services/storage.service';
import { DataValue } from 'src/utils/socket.utils';

/**
 * Container for the entire application, contains the socket service, API serivce, and storage service.
 */
@Component({
  selector: 'app-context',
  templateUrl: './app-context.component.html'
})
export default class AppContext implements OnInit {
  title = 'angular-client';
  serverService = new APIService();
  storageMap = new Map<string, DataValue[]>();
  storage = new Storage(this.storageMap);
  socket = io('http://localhost:8000');
  socketService = new SocketService(this.socket);
  showLandingPage = false;

  ngOnInit(): void {
    this.socketService.receiveData(this.storage);
  }
}
