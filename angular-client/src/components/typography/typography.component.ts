import { Component, Input, OnInit } from '@angular/core';
import Theme from 'src/services/theme.service';
import { StyleVariant } from 'src/utils/enumerations/StyleVariant';
@Component({
  selector: 'typography',
  templateUrl: './typography.component.html'
})
export default class Typography implements OnInit {
  @Input() variant!: StyleVariant;
  @Input() content?: string | null;
  @Input() additionalStyles?: string | null;
  style!: string;

  ngOnInit(): void {
    switch (this.variant) {
      case 'header':
        this.style = Theme.HEADER;
        break;
      case 'xx-large-title':
        this.style = Theme.XXLARGEHEADER;
        break;
      case 'large-header':
        this.style = Theme.LARGEHEADER;
        break;
      case 'subheader':
        this.style = Theme.SUBHEADER;
        break;
    }

    if (this.additionalStyles) {
      this.style += this.additionalStyles;
    }
  }
}
