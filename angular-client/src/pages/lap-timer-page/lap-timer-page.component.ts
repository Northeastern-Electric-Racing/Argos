import { Component, inject } from '@angular/core';
import { InfoBackgroundComponent } from 'src/components/info-background/info-background.component';
import TypographyComponent from 'src/components/typography/typography.component';
import HStackComponent from 'src/components/hstack/hstack.component';
import LapTimerService from 'src/services/lap-timer.service';

@Component({
  selector: 'lap-timer-page',
  templateUrl: './lap-timer-page.component.html',
  styleUrl: './lap-timer-page.component.css',
  standalone: true,
  imports: [InfoBackgroundComponent, TypographyComponent, HStackComponent]
})
export default class LapTimerPageComponent {
  readonly timer = inject(LapTimerService);

  onStartResume(): void {
    if (this.timer.isIdle()) {
      this.timer.start();
    } else if (this.timer.isPaused()) {
      this.timer.resume();
    }
  }

  onPause(): void {
    this.timer.pause();
  }

  onLap(): void {
    this.timer.lap();
  }

  onStop(): void {
    this.timer.stop();
  }

  onReset(): void {
    this.timer.reset();
  }
}
