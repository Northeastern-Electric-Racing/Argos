import { Component, computed, input } from '@angular/core';
import Theme from 'src/services/theme.service';
import { StyleVariant } from 'src/utils/style-variant';

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
  templateUrl: './typography.component.html',
  styleUrls: ['./typography.component.css'],
  standalone: true
})
export default class TypographyComponent {
  variant = input.required<StyleVariant>();
  content = input<string | string[] | null>();
  additionalStyles = input<string>('');

  style = computed(() => {
    let baseStyle: string = '';

    switch (this.variant()) {
      case 'header':
        baseStyle = Theme.header;
        break;
      case 'secondary-header':
        baseStyle = Theme.secondaryHeader;
        break;
      case 'xx-large-title':
        baseStyle = Theme.xxLargeHeader;
        break;
      case 'large-header':
        baseStyle = Theme.largeHeader;
        break;
      case 'large-secondary-header':
        baseStyle = Theme.largeSecondaryHeader;
        break;
      case 'subheader':
        baseStyle = Theme.subheader;
        break;
      case 'info-title':
        baseStyle = Theme.infoTitle;
        break;
      case 'info-subtitle':
        baseStyle = Theme.infoSubtitle;
        break;
      case 'value':
        baseStyle = Theme.value;
        break;
      case 'info-value-mobile':
        baseStyle = Theme.infoValueMobile;
        break;
      case 'info-value':
        baseStyle = Theme.infoValue;
        break;
      case 'info-value-small':
        this.style = Theme.infoValueSmall;
        break;
      case 'info-value-large':
        this.style = Theme.infoValueLarge;
        break;
      case 'info-unit':
        baseStyle = Theme.infoUnit;
        break;
      case 'info-unit-small':
        this.style = Theme.infoUnitSmall;
        break;
      case 'info-unit-large':
        this.style = Theme.infoUnitLarge;
        break;
      case 'sidebar-label':
        baseStyle = Theme.sidebarLabel;
        break;
      case 'x-large-title':
        baseStyle = Theme.xLargeHeader;
        break;
      default:
        baseStyle = '';
        break;
    }

    if (this.additionalStyles()) {
      baseStyle += this.additionalStyles();
    }
    return baseStyle;
  });
}
