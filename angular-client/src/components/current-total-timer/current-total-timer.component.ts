import { Component, Input } from '@angular/core';
import { InfoBackgroundComponent } from '../info-background/info-background.component';
import TypographyComponent from '../typography/typography.component';
import HStackComponent from '../hstack/hstack.component';
import VStackComponent from '../vstack/vstack.component';

@Component({
  selector: 'current-total-timer',
  templateUrl: './current-total-timer.component.html',
  styleUrls: ['./current-total-timer.component.css'],
  standalone: true,
  imports: [InfoBackgroundComponent, TypographyComponent, HStackComponent, VStackComponent]
})
export default class CurrentTotalTimerComponent {
  @Input() currentTime: number = 0;
  @Input() totalTime: number = 0;

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
    const seconds = Math.floor(time % 60);

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}
