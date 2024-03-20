import { Component, Input } from '@angular/core';

@Component({
  selector: 'server-status',
  templateUrl: './server-status.html',
  styleUrls: ['./server-status.css']
})
export default class ServerStatus {
  @Input() connected: number = 0;

  getStatusMessage(): string {
    // Assuming 1 for connected and 0 for disconnected
    return this.connected === 1 ? 'CONNECTED' : 'DISCONNECTED';
  }

  buttonColor(): string {
    // Assuming 1 for connected and 0 for disconnected
    return this.connected === 1 ? 'green' : 'red';
  }
}
