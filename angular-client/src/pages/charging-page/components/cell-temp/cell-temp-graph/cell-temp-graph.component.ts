import { Component, Input, inject } from '@angular/core';
import Storage from 'src/services/storage.service';
import { GraphData } from 'src/utils/types.utils';
import { GraphComponent } from '../../../../../components/graph/graph.component';

@Component({
    selector: 'cell-temp-graph',
    templateUrl: './cell-temp-graph.component.html',
    styleUrls: ['./cell-temp-graph.component.css'],
    standalone: true,
    imports: [GraphComponent]
})
export default class CellTempGraphComponent {
  private storage = inject(Storage);
  @Input() maxCellTempData: GraphData[] = [];
}
