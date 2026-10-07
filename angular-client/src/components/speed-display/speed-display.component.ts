import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import Storage from 'src/services/storage.service';
import { topics } from 'src/utils/topic.utils';
import { InfoBackgroundComponent } from '../info-background/info-background.component';
import HalfGaugeComponent from '../half-gauge/half-gauge.component';

@Component({
  selector: 'speed-display',
  templateUrl: './speed-display.component.html',
  styleUrls: ['./speed-display.component.css'],
  standalone: true,
  imports: [InfoBackgroundComponent, HalfGaugeComponent]
})
export default class SpeedDisplayComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private storage = inject(Storage);
  speed: number = 0;

  ngOnInit() {
    this.storage
      .get(topics.speed())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.speed = parseInt(value.values[0]);
      });
  }
}
