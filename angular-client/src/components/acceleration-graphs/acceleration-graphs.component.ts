import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import Storage from 'src/services/storage.service';
import { topics } from 'src/utils/topic.utils';
import { decimalPipe } from 'src/utils/pipes.utils';
import { GraphData } from 'src/utils/types.utils';
import { InfoBackgroundComponent } from '../info-background/info-background.component';
import { GraphComponent } from '../graph/graph.component';
import TypographyComponent from '../typography/typography.component';
import HStackComponent from '../hstack/hstack.component';
import VStackComponent from '../vstack/vstack.component';
import { Subscription } from 'rxjs';

/**
 * Component that displays acceleration data from the storage service
 * onto graphs
 *
 */
@Component({
  selector: 'acceleration-graphs',
  templateUrl: './acceleration-graphs.component.html',
  styleUrls: ['./acceleration-graphs.component.css'],
  standalone: true,
  imports: [InfoBackgroundComponent, GraphComponent, TypographyComponent, HStackComponent, VStackComponent]
})
export class AccelerationGraphsComponent implements OnInit, OnDestroy {
  private storage = inject(Storage);
  xData: GraphData[] = [];
  yData: GraphData[] = [];

  xMax: number = 0;
  yMax: number = 0;

  maxDataPoints = 400;

  private subscriptions: Subscription[] = [];

  ngOnInit() {
    this.subscriptions.push(
      this.storage.get(topics.xyzAcceleration()).subscribe((value) => {
        const x1 = decimalPipe(value.values[0]);
        const y1 = decimalPipe(value.values[1]);
        const time = +value.time;
        this.xData.push({
          x: time,
          y: x1
        });

        this.yData.push({
          x: time,
          y: y1
        });

        //checks if there is a new max
        this.xMax = Math.max(Math.abs(x1), this.xMax);
        this.yMax = Math.max(Math.abs(y1), this.yMax);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}