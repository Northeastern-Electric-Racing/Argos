import { Component } from '@angular/core';
import { io } from 'socket.io-client';
import { SocketService } from 'src/services/socket.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  socket = io('http://localhost:3000');
  socketService = new SocketService(this.socket);

  title = 'angular-client';
}
