import { Component, inject, input, ChangeDetectionStrategy } from '@angular/core';
import { NzModalService } from 'ng-zorro-antd/modal';
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
  private modal = inject(NzModalService);
  data = input.required<GraphData[]>();
  icon = input.required<string>();
  title = input.required<string>();
  color = input.required<string>();
  subTitle = input<string | undefined>(undefined);
  graphContainerId = input.required<string>();
  openDialog = () => {
    this.modal.create({
      nzContent: GraphDialogComponent,
      nzWidth: '75vw',
      nzFooter: null,
      nzTitle: this.title(),
      nzData: {
        data: this.data(),
        color: this.color(),
        title: this.title(),
        subTitle: this.subTitle(),
        graphContainerId: this.graphContainerId() + 'big'
      },
      nzMaskClosable: true // auto-close on outside click
    });
  };
}
