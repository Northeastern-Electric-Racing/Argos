import { Component, OnInit } from '@angular/core';
import { io } from 'socket.io-client';
import { ImportantDataType } from 'src/enumeration/ImportantDataType';
import APIService from 'src/services/api.service';
import { SocketService } from 'src/services/socket.service';
import Storage from 'src/services/storage.service';
import { DataValue } from 'src/utils/socket.utils';

@Component({
  selector: 'landing-page',
  styleUrls: ['./landing-page.component.css'],
  templateUrl: './landing-page.component.html'
})
export default class LandingPage implements OnInit {
  serverService = new APIService();
  storageMap = new Map<string, DataValue[]>();
  storage = new Storage(this.storageMap);
  socket = io('http://localhost:3000');
  socketService = new SocketService(this.socket);
  time = new Date();
  currentDriver = this.storage.get(ImportantDataType.DRIVER)?.[0].value ?? 'No Driver Selected';
  currentLocation = this.storage.get(ImportantDataType.LOCATION)?.[0].value ?? 'No Location Selected';
  currentSystem = this.storage.get(ImportantDataType.SYSTEM)?.[0].value ?? 'No System Selected';

  ngOnInit() {
    this.socketService.receiveData(this.storage);
    // Perform the query and subscribe to the result
    setInterval(() => {
      this.time = new Date();
    }, 1000);
  }
}
