import { Component, Input, inject } from '@angular/core';
import Storage from 'src/services/storage.service';
import { GraphData } from 'src/utils/types.utils';
import { GraphComponent } from '../../../../../components/graph/graph.component';

@Component({
    selector: 'pack-voltage-graph',
    templateUrl: './pack-voltage-graph.component.html',
    styleUrls: ['./pack-voltage-graph.component.css'],
    standalone: true,
    imports: [GraphComponent]
})
export default class PackVoltageGraphComponent {
  private storage = inject(Storage);
  @Input() packVoltData: GraphData[] = [];
}
