import { Component, Input, inject } from '@angular/core';
import Storage from 'src/services/storage.service';
import { GraphData } from 'src/utils/types.utils';
import { DoubleLineGraphComponent } from '../../../../../components/double-line-graph/double-line-graph.component';

@Component({
  selector: 'high-low-cell-graph',
  templateUrl: './high-low-cell-graph.component.html',
  styleUrls: ['./high-low-cell-graph.component.css'],
  standalone: true,
  imports: [DoubleLineGraphComponent]
})
export default class HighLowCellGraphComponent {
  private storage = inject(Storage);
  @Input() highVoltsData: GraphData[] = [];
  @Input() lowVoltsData: GraphData[] = [];
}
