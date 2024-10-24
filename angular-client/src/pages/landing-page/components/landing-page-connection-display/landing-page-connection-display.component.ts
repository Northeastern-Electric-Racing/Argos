import { Component } from '@angular/core';
import Storage from 'src/services/storage.service';

@Component({
  selector: 'landing-page-connection-display',
  templateUrl: './landing-page-connection-display.component.html',
  styleUrl: './landing-page-connection-display.component.css'
})
export default class LandingPageConnectionDisplay {
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
