import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * Aura with NER red as the primary and the app's neutral dark greys as surfaces.
 * Component looks that used to be global `.p-*` overrides in styles.css (dialog, select)
 * live here as design tokens instead. The app always runs in dark mode, so only the
 * dark color scheme is customized.
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
        background: '{surface.800}',
        color: '#ffffff',
        borderRadius: '20px',
        shadow: '0 1px 4px rgba(0, 0, 0, 0.1)'
      },
      header: {
        padding: '1rem'
      },
      title: {
        fontWeight: '700'
      }
    },
    select: {
      root: {
        background: '#5a5a5a',
        color: '#ffffff',
        placeholderColor: '#ffffff',
        borderColor: 'transparent',
        hoverBorderColor: 'transparent',
        focusBorderColor: 'transparent',
        shadow: '0 1px 4px rgba(0, 0, 0, 0.1)'
      },
      overlay: {
        background: '#5a5a5a',
        borderColor: 'transparent',
        color: '#ffffff',
        borderRadius: '0 0 5px 5px'
      },
      list: {
        gap: '0'
      },
      option: {
        padding: '8px 16px',
        borderRadius: '0',
        color: '#ffffff',
        focusBackground: '#45454594',
        focusColor: '#ffffff',
        selectedBackground: 'rgba(0, 122, 255, 0.4)',
        selectedColor: '#ffffff',
        selectedFocusBackground: 'rgba(0, 122, 255, 0.55)',
        selectedFocusColor: '#ffffff'
      }
    }
  }
});

export default ArgosPreset;
