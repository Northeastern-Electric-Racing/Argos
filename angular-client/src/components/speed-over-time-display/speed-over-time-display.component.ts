import { Component, OnInit, inject } from '@angular/core';
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
export default class SpeedOverTimeDisplayComponent implements OnInit {
  private storage = inject(Storage);
  data: GraphData[] = [];

  ngOnInit() {
    this.storage.get(DataTypeEnum.SPEED).subscribe((value) => {
      this.data.push({ x: new Date().getTime(), y: parseInt(value.values[0]) });
    });
  }
}
