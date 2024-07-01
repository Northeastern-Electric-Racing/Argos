import { Component } from '@angular/core';
import Storage from 'src/services/storage.service';

@Component({
  selector: 'battery-status-display',
  templateUrl: './battery-status-display.component.html',
  styleUrls: ['./battery-status-display.component.css']
})
export default class BatteryStatusDisplay {
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
