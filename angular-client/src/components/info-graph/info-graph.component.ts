import { Component, inject, input, ChangeDetectionStrategy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { GraphDialogComponent } from '../graph-dialog/graph-dialog.component';
import { GraphData } from 'src/utils/types.utils';
import { InfoBackgroundComponent } from '../info-background/info-background.component';
import { GraphComponent } from '../graph/graph.component';

@Component({
  selector: 'info-graph',
  templateUrl: './info-graph.component.html',
  styleUrls: ['./info-graph.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [InfoBackgroundComponent, GraphComponent]
})
export class InfoGraphComponent {
  private dialog = inject(MatDialog);
  data = input.required<GraphData[]>();
  icon = input.required<string>();
  title = input.required<string>();
  color = input.required<string>();
  subTitle = input<string | undefined>(undefined);
  graphContainerId = input.required<string>();
  openDialog = () => {
    this.dialog.open(GraphDialogComponent, {
      maxWidth: '90vw',
      data: {
        header: this.title(),
        data: this.data(),
        color: this.color(),
        title: this.title(),
        subTitle: this.subTitle(),
        graphContainerId: this.graphContainerId() + 'big'
      }
    });
  };
}
