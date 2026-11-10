import { tw } from 'src/ui/recipes/tw';

/**
 * The Wi-Fi RSSI unit, shared by the desktop and phone layouts. #909's #158eff icon has no token, so it is the
 * info blue, which also clears 3:1 on the card. `unit` is #909's 18px dBM label.
 */
export const wifi = {
  icon: tw('text-info'),
  unit: tw('pt-5.5 text-md text-fg-muted select-none [-webkit-touch-callout:none]')
} as const;
