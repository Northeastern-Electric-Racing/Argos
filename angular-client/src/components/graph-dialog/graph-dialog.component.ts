import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { UiDialogService } from 'src/ui/dialog/dialog.service';
import { Component, inject, ChangeDetectionStrategy, forwardRef } from '@angular/core';
import { GraphData } from 'src/utils/types.utils';
import { GraphComponent } from '../graph/graph.component';

@Component({
  selector: 'graph-dialog',
  templateUrl: './graph-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [forwardRef(() => GraphComponent)]
})
export class GraphDialogComponent {
  public dialogService = inject(UiDialogService);
  public dialogData = inject(DIALOG_DATA);
  public ref = inject(DialogRef);
  data: GraphData[];
  color: string;
  title: string;
  graphContainerId: string;

  constructor() {
    this.data = this.dialogData.data;
    this.color = this.dialogData.color;
    this.title = this.dialogData.title;
    this.graphContainerId = this.dialogData.graphContainerId;
  }
}
