import { Component, ChangeDetectionStrategy } from '@angular/core';
import { type TuiDialogContext } from '@taiga-ui/core';
import { injectContext } from '@taiga-ui/polymorpheus';
import { GraphData } from 'src/utils/types.utils';
import { GraphComponent } from '../graph/graph.component';

export interface GraphDialogData {
  data: GraphData[];
  color: string;
  title?: string;
  subTitle?: string;
  graphContainerId: string;
}

@Component({
  selector: 'graph-dialog',
  templateUrl: './graph-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [GraphComponent]
})
export class GraphDialogComponent {
  readonly context = injectContext<TuiDialogContext<void, GraphDialogData>>();
  data: GraphData[] = this.context.data.data;
  color: string = this.context.data.color;
  title: string | undefined = this.context.data.title;
  graphContainerId: string = this.context.data.graphContainerId;
}
