import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import Theme from 'src/services/theme.service';

const src = resolve(process.cwd(), 'src');
const read = (path: string) => readFileSync(join(src, path), 'utf8');

// The global stylesheet after the migration: tokens, the base shim, the CDK's a11y CSS and utilities, nothing else.
describe('global stylesheets', () => {
  it('has no legacy layer and imports no #909 legacy CSS', () => {
    const styles = read('styles.css');
    expect(styles).toMatch(/^@layer theme, base, cdk, components, utilities;$/m);
    expect(styles).not.toMatch(/ui\/legacy|layer\(legacy\)/);
  });

  it('paints the Theme colour constants in the token colours', () => {
    const theme = read('styles/theme.css');
    const token = (name: string) => theme.match(new RegExp('^\\s*--color-' + name + ':\\s*(#[0-9a-f]+);', 'im'))?.[1];
    const pairs: [string, string][] = [
      [Theme.battteryLow, 'battery-low'],
      [Theme.battteryMed, 'battery-med'],
      [Theme.battteryHigh, 'battery-high'],
      [Theme.batteryBack, 'battery-shell'],
      [Theme.infoBackground, 'panel']
    ];
    for (const [value, name] of pairs) expect([name, value.toLowerCase()]).toEqual([name, token(name)?.toLowerCase()]);
  });
});
