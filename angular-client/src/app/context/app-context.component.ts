import { Component, OnInit } from '@angular/core';
import { io } from 'socket.io-client';
import { environment } from 'src/environment/environment';
import SocketService from 'src/services/socket.service';
import Storage from 'src/services/storage.service';

/**
 * Container for the entire application, contains the socket service, API serivce, and storage service.
 */
@Component({
  selector: 'app-context',
  templateUrl: './app-context.component.html'
})
export default class AppContext implements OnInit {
  socket = io(environment.url);
  socketService = new SocketService(this.socket);

  constructor(
    private storage: Storage,
  ) {}

  ngOnInit(): void {
    this.socketService.receiveData(this.storage);
  }
}
