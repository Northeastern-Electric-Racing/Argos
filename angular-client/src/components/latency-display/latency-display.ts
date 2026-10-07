import { Component, Input, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import Storage from 'src/services/storage.service';
import { topics } from 'src/utils/topic.utils';
import { InfoBackgroundComponent } from '../info-background/info-background.component';

import { DividerComponent } from '../divider/divider';
import TypographyComponent from '../typography/typography.component';
import VStackComponent from '../vstack/vstack.component';
import HStackComponent from '../hstack/hstack.component';

@Component({
  selector: 'latency-display',
  templateUrl: './latency-display.html',
  styleUrls: ['./latency-display.css'],
  standalone: true,
  imports: [InfoBackgroundComponent, DividerComponent, TypographyComponent, VStackComponent, HStackComponent]
})
export default class LatencyDisplayComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private storage = inject(Storage);
  @Input() lowVal: number = 0;
  @Input() medVal: number = 50;
  @Input() highVal: number = 100;
  latency: number = 0;
  newLatency: number = 0;

  ngOnInit(): void {
    this.storage
      .get(topics.latency())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.latency = parseInt(value.values[0]);
      });
    this.storage
      .get(topics.newLatency())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.newLatency = parseInt(value.values[0]);
      });
  }

  mapColor = (latency: number, medVal: number): string => {
    if (latency < (3 * medVal) / 4) {
      return '#53e400';
    }
    if (latency > (3 * medVal) / 4 && latency < (3 * medVal) / 2) {
      return 'yellow';
    }
    return 'red';
  };
}
