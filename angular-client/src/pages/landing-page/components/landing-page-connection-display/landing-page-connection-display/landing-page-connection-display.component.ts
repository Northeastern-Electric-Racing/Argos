import { Component } from '@angular/core';

@Component({
  selector: 'app-landing-page-connection-display',
  standalone: true,
  imports: [],
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
