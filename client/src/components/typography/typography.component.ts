import { Component, Input, OnInit } from '@angular/core';
import Theme from 'src/services/theme.service';
import { StyleVariant } from 'src/utils/enumerations/style-variant';

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
  @Input() content?: string | string[] | null;
  @Input() additionalStyles?: string;
  style!: string;

  ngOnInit(): void {
    switch (this.variant) {
      case 'header':
        this.style = Theme.header;
        break;
      case 'secondary-header':
        this.style = Theme.secondaryHeader;
        break;
      case 'xx-large-title':
        this.style = Theme.xxLargeHeader;
        break;
      case 'large-header':
        this.style = Theme.largeHeader;
        break;
      case 'large-secondary-header':
        this.style = Theme.largeSecondaryHeader;
        break;
      case 'subheader':
        this.style = Theme.subheader;
        break;
      case 'info-title':
        this.style = Theme.infoTitle;
        break;
      case 'info-subtitle':
        this.style = Theme.infoSubtitle;
        break;
      case 'value':
        this.style = Theme.value;
        break;
      case 'info-value-mobile':
        this.style = Theme.infoValueMobile;
        break;
      case 'info-value':
        this.style = Theme.infoValue;
        break;
      case 'info-unit':
        this.style = Theme.infoUnit;
        break;
      case 'sidebar-label':
        this.style = Theme.sidebarLabel;
        break;
      case 'x-large-title':
        this.style = Theme.xLargeHeader;
        break;
    }

    if (this.additionalStyles) {
      this.style += this.additionalStyles;
    }
  }
}
