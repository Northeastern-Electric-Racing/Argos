import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle
} from '@angular/material/dialog';
import { GraphData } from 'src/utils/types.utils';
import { GraphComponent } from '../graph/graph.component';

export interface GraphDialogData {
  header?: string;
  data: GraphData[];
  color: string;
  title?: string;
  subTitle?: string;
  graphContainerId: string;
}

@Component({
  selector: 'graph-dialog',
  templateUrl: './graph-dialog.component.html',
  styleUrl: './graph-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [GraphComponent, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButton]
})
export class GraphDialogComponent {
  private dialogData = inject<GraphDialogData>(MAT_DIALOG_DATA);
  header = this.dialogData.header;
  data: GraphData[] = this.dialogData.data;
  color: string = this.dialogData.color;
  title = this.dialogData.title;
  graphContainerId: string = this.dialogData.graphContainerId;
}
