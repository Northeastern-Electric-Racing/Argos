import { Component, OnInit, inject, input } from '@angular/core';
import Storage from 'src/services/storage.service';

@Component({
  selector: 'current-run-display',
  templateUrl: './current-run-display.component.html',
  styleUrl: './current-run-display.component.css'
})
export class CurrentRunDisplayComponent implements OnInit {
  private storage = inject(Storage);
  currentRun: number = 0;
  navBarStyle = input<boolean>(false);

  ngOnInit() {
    this.storage.getCurrentRunId().subscribe((runId) => {
      if (runId) {
        this.currentRun = runId;
      }
    });
  }
}
