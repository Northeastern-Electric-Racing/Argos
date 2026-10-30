import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * Aura with NER red as the primary and the app's neutral dark greys as surfaces.
 * Component looks live here as design tokens rather than `.p-*` overrides in component CSS.
 * The app always runs in dark mode, so only the dark color scheme is customized.
 */
const ArgosPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{red.50}',
      100: '{red.100}',
      200: '{red.200}',
      300: '{red.300}',
      400: '{red.400}',
      500: '{red.500}',
      600: '{red.600}',
      700: '{red.700}',
      800: '{red.800}',
      900: '{red.900}',
      950: '{red.950}'
    },
    colorScheme: {
      dark: {
        surface: {
          0: '#ffffff',
          50: '{neutral.50}',
          100: '{neutral.100}',
          200: '{neutral.200}',
          300: '{neutral.300}',
          400: '{neutral.400}',
          500: '{neutral.500}',
          600: '{neutral.600}',
          700: '{neutral.700}',
          800: '{neutral.800}',
          900: '{neutral.900}',
          950: '{neutral.950}'
        },
        // primary.600 keeps white button text above WCAG AA (about 4.8:1)
        primary: {
          color: '{primary.600}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.500}',
          activeColor: '{primary.400}'
        },
        highlight: {
          background: 'color-mix(in srgb, {primary.500}, transparent 84%)',
          focusBackground: 'color-mix(in srgb, {primary.500}, transparent 76%)',
          color: 'rgba(255,255,255,.87)',
          focusColor: 'rgba(255,255,255,.87)'
        },
        // A red primary would make a focused field look invalid, so focus uses the app's blue accent
        formField: {
          focusBorderColor: '#027bd7'
        },
        // Panels, tables and overlays use the shade of the app's info cards (surface.800) instead of
        // Aura's near-black surface.900, so PrimeNG pieces sit in the same layer as Argos cards.
        content: {
          background: '{surface.800}',
          hoverBackground: '{surface.700}',
          borderColor: '{surface.700}'
        },
        overlay: {
          select: { background: '{surface.800}', borderColor: '{surface.700}' },
          popover: { background: '{surface.800}', borderColor: '{surface.700}' },
          modal: { background: '{surface.800}', borderColor: '{surface.700}' }
        },
        list: {
          option: { focusBackground: '{surface.700}' }
        },
        navigation: {
          item: { focusBackground: '{surface.700}', activeBackground: '{surface.700}' }
        }
      }
    }
  },
  components: {
    // Text, outlined and link buttons put the primary on the dark surface, where primary.600 is too dim
    button: {
      colorScheme: {
        dark: {
          text: { primary: { color: '{primary.400}' } },
          outlined: { primary: { color: '{primary.400}' } },
          link: { color: '{primary.400}' }
        }
      }
    },
    dialog: {
      root: {
        borderRadius: '20px'
      },
      header: {
        padding: '1rem'
      },
      title: {
        fontWeight: '700'
      }
    },
    // Tables sit on cards or the page, so rows are see-through and stripes are a faint lift
    datatable: {
      headerCell: {
        background: 'transparent',
        color: '{text.muted.color}'
      },
      row: {
        background: 'transparent',
        hoverBackground: 'rgba(255, 255, 255, 0.04)'
      },
      colorScheme: {
        dark: {
          root: { borderColor: '{surface.700}' },
          row: { stripedBackground: 'rgba(255, 255, 255, 0.02)' }
        }
      }
    },
    // Toggle and select buttons look like secondary buttons, with the pressed option in the selection tint,
    // so on and off read apart at a glance (SelectButton shares these tokens)
    togglebutton: {
      colorScheme: {
        dark: {
          root: {
            background: '{surface.800}',
            checkedBackground: '{surface.800}',
            hoverBackground: '{surface.700}',
            borderColor: '{surface.800}',
            checkedBorderColor: '{surface.800}',
            color: '{surface.300}',
            hoverColor: '{surface.0}'
          },
          content: { checkedBackground: '{highlight.focus.background}' },
          icon: { color: '{surface.300}', hoverColor: '{surface.0}', checkedColor: '{primary.400}' }
        }
      }
    },
    // Sidebar topic trees sit on the page background
    tree: {
      root: {
        background: 'transparent'
      }
    },
    // The option list is flush, without Aura's rounded, spaced options
    select: {
      list: {
        gap: '0'
      },
      option: {
        borderRadius: '0'
      }
    }
  }
});

export default ArgosPreset;
