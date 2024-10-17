import { Component, Input } from '@angular/core';
import { DialogService, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { GraphData } from 'src/utils/types.utils';

@Component({
  selector: 'graph-dialog',
  templateUrl: './graph-dialog.component.html',
  providers: [DialogService]
})
export class GraphDialog {
  @Input() data!: GraphData[];
  @Input() color!: string;
  @Input() title!: string;
  @Input() graphContainerId!: string;

  constructor(
    public dialogService: DialogService,
    public config: DynamicDialogConfig
  ) {
    this.data = this.config.data.data;
    this.color = this.config.data.color;
    this.title = this.config.data.title;
    this.graphContainerId = this.config.data.graphContainerId;
  }
}
