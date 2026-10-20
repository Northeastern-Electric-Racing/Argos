import { Component, ChangeDetectionStrategy } from '@angular/core';
import { injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { GraphData } from 'src/utils/types.utils';
import { GraphComponent } from '../graph/graph.component';

export interface GraphDialogContext {
  /** Dialog heading; falls back to the graph title. */
  header?: string;
  data: GraphData[];
  color: string;
  title: string;
  subTitle?: string;
  graphContainerId: string;
}

@Component({
  selector: 'graph-dialog',
  templateUrl: './graph-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [GraphComponent, HlmDialogImports]
})
export class GraphDialogComponent {
  private context = injectBrnDialogContext<GraphDialogContext>();
  data: GraphData[] = this.context.data;
  color: string = this.context.color;
  title: string = this.context.title;
  header: string = this.context.header ?? this.context.title;
  graphContainerId: string = this.context.graphContainerId;
}
