import { Component } from '@angular/core';
import Storage from 'src/services/storage.service';

@Component({
  selector: 'connection-display',
  templateUrl: './connection-display.component.html',
  styleUrls: ['./connection-display.component.css']
})
export default class ConnectionDisplay {
  connected: boolean = false;
  constructor(private storage: Storage) {}

  ngOnInit() {
    this.storage.getCurrentRunId().subscribe((runId) => {
      this.connected = runId !== undefined;
    });
  }

  getConnectedStatus(connected: boolean) {
    return connected ? 'Connected' : 'Disconnected';
  }

  getConnectedColor(connected: boolean) {
    return connected ? 'green' : 'red';
  }
}
