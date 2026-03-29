import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { MatGridList, MatGridTile } from '@angular/material/grid-list';
import { InfoBackgroundComponent } from 'src/components/info-background/info-background.component';
import TypographyComponent from 'src/components/typography/typography.component';
import HStackComponent from 'src/components/hstack/hstack.component';
import HalfGaugeComponent from 'src/components/half-gauge/half-gauge.component';
import LapTimerService from 'src/services/lap-timer.service';
import Storage from 'src/services/storage.service';
import { topics } from 'src/utils/topic.utils';

@Component({
  selector: 'lap-timer-page',
  templateUrl: './lap-timer-page.component.html',
  styleUrl: './lap-timer-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatGridList,
    MatGridTile,
    InfoBackgroundComponent,
    TypographyComponent,
    HStackComponent,
    HalfGaugeComponent,
    DecimalPipe
  ]
})
export default class LapTimerPageComponent implements OnInit, OnDestroy {
  readonly timer = inject(LapTimerService);
  private storage = inject(Storage);

  readonly liveSpeed = signal(0);
  readonly liveMotorTemp = signal(0);
  readonly liveSoc = signal(0);

  private subs: Subscription[] = [];

  ngOnInit(): void {
    this.subs.push(
      this.storage.get(topics.speed()).subscribe((v) => {
        this.liveSpeed.set(parseFloat(v.values[0]) || 0);
      }),
      this.storage.get(topics.motorTemp()).subscribe((v) => {
        this.liveMotorTemp.set(parseFloat(v.values[0]) || 0);
      }),
      this.storage.get(topics.stateOfCharge()).subscribe((v) => {
        this.liveSoc.set(parseFloat(v.values[0]) || 0);
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

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
