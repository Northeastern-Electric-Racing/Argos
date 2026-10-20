import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { NZ_MODAL_DATA, NzModalRef } from 'ng-zorro-antd/modal';
import { GraphData } from 'src/utils/types.utils';
import { GraphComponent } from '../graph/graph.component';

@Component({
  selector: 'graph-dialog',
  templateUrl: './graph-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [GraphComponent]
})
export class GraphDialogComponent {
  private dialogData = inject(NZ_MODAL_DATA);
  public ref = inject(NzModalRef);
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
