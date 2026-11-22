import { Component, inject, input, ChangeDetectionStrategy } from '@angular/core';
import Storage from 'src/services/storage.service';
import { GraphData } from 'src/utils/types.utils';
import { GraphComponent } from '../../../../../components/graph/graph.component';

@Component({
  selector: 'pack-voltage-graph',
  templateUrl: './pack-voltage-graph.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [GraphComponent]
})
export default class PackVoltageGraphComponent {
  private storage = inject(Storage);
  packVoltData = input<GraphData[]>([]);
}
