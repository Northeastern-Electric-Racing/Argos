import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { InfoBackgroundComponent } from '../info-background/info-background.component';
import TypographyComponent from '../typography/typography.component';
import HStackComponent from '../hstack/hstack.component';
import VStackComponent from '../vstack/vstack.component';
import { tw } from 'src/ui/recipes/tw';

@Component({
  selector: 'current-total-timer',
  templateUrl: './current-total-timer.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [InfoBackgroundComponent, TypographyComponent, HStackComponent, VStackComponent]
})
export default class CurrentTotalTimerComponent {
  currentTime = input<number>(0);
  totalTime = input<number>(0);

  /** The times in full-strength text with #909's faint light glow (a 30% tint of the label grey). */
  protected readonly readout = tw('text-fg [text-shadow:0_0_5px_color-mix(in_srgb,var(--color-fg-label)_30%,transparent)]');

  getCurrentTime() {
    return this.formatTime(this.currentTime());
  }

  getTotalTime() {
    return this.formatTime(this.totalTime());
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
