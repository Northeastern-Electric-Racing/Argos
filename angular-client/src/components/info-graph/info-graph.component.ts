import { Component, Input } from '@angular/core';
import { DialogService } from 'primeng/dynamicdialog';
import { GraphDialog } from '../graph-dialog/graph-dialog.component';
import { GraphData } from 'src/utils/types.utils';

@Component({
  selector: 'info-graph',
  templateUrl: './info-graph.component.html',
  styleUrls: ['./info-graph.component.css'],
  providers: [DialogService]
})
export class InfoGraph {
  @Input() data!: GraphData[];
  @Input() icon!: string;
  @Input() title!: string;
  @Input() color!: string;
  @Input() subTitle?: string;
  @Input() graphContainerId!: string;

  constructor(public dialogService: DialogService) {}

  openDialog = () => {
    this.dialogService.open(GraphDialog, {
      header: this.title,
      data: {
        data: this.data,
        color: this.color,
        title: this.title,
        subTitle: this.subTitle,
        graphContainerId: this.graphContainerId + 'big'
      }
    });
  };
}
