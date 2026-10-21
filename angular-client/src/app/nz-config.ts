import { NzConfig } from 'ng-zorro-antd/core/config';

/**
 * Global ng-zorro-antd configuration, shared by main.ts and the test setup.
 * Colours and other design tokens live in src/styles/ng-zorro-theme.less.
 */
export const nzConfig: NzConfig = {
  notification: { nzPlacement: 'topRight', nzDuration: 3000, nzMaxStack: 5 }
};
