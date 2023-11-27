import { Component, Input } from '@angular/core';

/**
 * Graph Header Component to display the graph page header.
 * Utilizes the header component to display the header.
 */
@Component({
  selector: 'graph-header',
  templateUrl: './graph-header.component.html',
  styleUrls: ['./graph-header.component.css']
})
export default class GraphHeader {
  @Input() realTime?: boolean;
  @Input() runId!: number;
}
