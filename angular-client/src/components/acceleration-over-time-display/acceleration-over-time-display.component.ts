import { Component, OnInit, inject } from '@angular/core';
import Storage from 'src/services/storage.service';
import { DataTypeEnum } from 'src/data-type.enum';
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
  private storage = inject(Storage);
  data: GraphData[] = [];

  ngOnInit() {
    this.storage.get(DataTypeEnum.ACCELERATION).subscribe((value) => {
      this.data.push({ x: new Date().getTime(), y: parseInt(value.values[0]) });
    });
  }
}
