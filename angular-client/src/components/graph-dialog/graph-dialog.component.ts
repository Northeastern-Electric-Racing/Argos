import { Component, inject, input } from '@angular/core';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { GraphData } from 'src/utils/types.utils';
import { GraphComponent } from '../graph/graph.component';

@Component({
  selector: 'graph-dialog',
  templateUrl: './graph-dialog.component.html',
  providers: [DialogService],
  standalone: true,
  imports: [GraphComponent]
})
export class GraphDialogComponent {
  public dialogService = inject(DialogService);
  public config = inject(DynamicDialogConfig);
  public ref = inject(DynamicDialogRef); // Inject the dialog reference for closing
  data = input.required<GraphData[]>();
  color = input.required<string>();
  title = input.required<string>();
  graphContainerId = input.required<string>();

  constructor() {
    this.data = this.config.data.data;
    this.color = this.config.data.color;
    this.title = this.config.data.title;
    this.graphContainerId = this.config.data.graphContainerId;
  }
}
