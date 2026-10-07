import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import Storage from 'src/services/storage.service';
import { topics } from 'src/utils/topic.utils';
import { GraphData } from 'src/utils/types.utils';
import { InfoGraphComponent } from '../info-graph/info-graph.component';

@Component({
  selector: 'acceleration-over-time-display',
  templateUrl: './acceleration-over-time-display.component.html',
  styleUrls: ['./acceleration-over-time-display.component.css'],
  standalone: true,
  imports: [InfoGraphComponent]
})
export default class AccelerationOverTimeDisplayComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private storage = inject(Storage);
  data: GraphData[] = [];

  ngOnInit() {
    this.storage
      .get(topics.acceleration())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.data.push({ x: new Date().getTime(), y: parseInt(value.values[0]) });
      });
  }
}
