import { Component } from '@angular/core';
import Storage from 'src/services/storage.service';

@Component({
  selector: 'landing-page-current-run-display',
  templateUrl: './landing-page-current-run-display.component.html',
  styleUrl: './landing-page-current-run-display.component.css'
})
export class LandingPageCurrentRunDisplay {
  currentRun: number = 0;
  constructor(private storage: Storage) {}

  ngOnInit() {
    this.storage.getCurrentRunId().subscribe((runId) => {
      if (runId) { this.currentRun = runId}
    });
  }
}
