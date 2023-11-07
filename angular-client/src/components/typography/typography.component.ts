import { Component, Input, OnInit } from '@angular/core';
import Theme from 'src/services/theme.service';
import { StyleVariant } from 'src/utils/enumerations/StyleVariant';
@Component({
  selector: 'typography',
  templateUrl: './typography.component.html'
})
export default class Typography implements OnInit {
  @Input() variant!: StyleVariant;
  @Input() content!: string;
  style!: string;

  ngOnInit(): void {
    switch (this.variant) {
      case 'header':
        this.style = Theme.HEADER + 'margin: 0px;';
    }
  }
}
