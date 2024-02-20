import { Component, Input, OnInit } from '@angular/core';
import Theme from 'src/services/theme.service';
import { StyleVariant } from 'src/utils/enumerations/StyleVariant';

/**
 * Custom typography component that allows for the use of different styles of text.
 * @param variant - The variant of the typography component.
 * @param content - The content of the typography component.
 * @param additionalStyles - Additional styles to apply to the typography component.
 * @example
 * <typography variant="header" content="Hello World!" additionalStyles="color: red;"/>
 * Add general styles to the Theme Service and classify it as a StyleVariant and link it in the switch statement.
 */
@Component({
  selector: 'typography',
  templateUrl: './typography.component.html'
})
export default class Typography implements OnInit {
  @Input() variant!: StyleVariant;
  @Input() content?: string | null;
  @Input() additionalStyles?: string;
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
