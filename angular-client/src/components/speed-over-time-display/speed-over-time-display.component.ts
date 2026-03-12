import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import Storage from 'src/services/storage.service';
import { DataTypeEnum } from 'src/data-type.enum';
import { GraphData } from 'src/utils/types.utils';
import { InfoGraphComponent } from '../info-graph/info-graph.component';

@Component({
  selector: 'speed-over-time-display',
  templateUrl: './speed-over-time-display.component.html',
  styleUrls: ['./speed-over-time-display.component.css'],
  standalone: true,
  imports: [InfoGraphComponent]
})
export default class SpeedOverTimeDisplayComponent implements OnInit, OnDestroy {
  private storage = inject(Storage);
  private subscriptions: Subscription[] = [];
  data: GraphData[] = [];

  ngOnInit() {
    this.subscriptions.push(
      this.storage.get(DataTypeEnum.SPEED).subscribe((value) => {
        this.data.push({ x: new Date().getTime(), y: parseInt(value.values[0]) });
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
