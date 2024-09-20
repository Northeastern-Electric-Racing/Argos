import { Component, Input } from '@angular/core';
import Storage from 'src/services/storage.service';

@Component({
  selector: 'current-total-timer',
  templateUrl: './current-total-timer.component.html',
  styleUrls: ['./current-total-timer.component.css']
})
export default class CurrentTotalTimer {
  @Input() currentTime: number = 0;
  @Input() totalTime: number = 0;

  constructor(private storage: Storage) {}

  getCurrentTime() {
    return this.formatTime(this.currentTime);
  }

  getTotalTime() {
    return this.formatTime(this.totalTime);
  }

  /**
   * Formats the given time.
   *
   * @param time the time to format.
   * @returns the time as a string in the given format: 00:00 (leading zeros included).
   */
  formatTime(time: number) {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}
