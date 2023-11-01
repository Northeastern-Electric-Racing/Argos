import { Component, OnInit } from '@angular/core';
import { io } from 'socket.io-client';
import APIService from 'src/services/api.service';
import { SocketService } from 'src/services/socket.service';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/ImportantDataType';
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
  currentDriver = this.storage.get(IdentifierDataType.DRIVER)?.[0].value ?? 'No Driver Selected';
  currentLocation = this.storage.get(IdentifierDataType.LOCATION)?.[0].value ?? 'No Location Selected';
  currentSystem = this.storage.get(IdentifierDataType.SYSTEM)?.[0].value ?? 'No System Selected';

  dataType: string = 'Place holder data type';
  currentValue: string = 'Place holder Current Value';
  unit: string = 'Place holder Unit';

  ngOnInit() {
    this.socketService
      .receiveData(this.storage)
      .subscribe((data: { dataType: string; currentValue: string; unit: string }) => {
        this.dataType = data.dataType;
        this.currentValue = data.currentValue;
        this.unit = data.unit;
      });

    // Perform the query and subscribe to the result
    setInterval(() => {
      this.time = new Date();
    }, 1000);
  }
}
