import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import Theme from 'src/services/theme.service';

const src = resolve(process.cwd(), 'src');
const read = (path: string) => readFileSync(join(src, path), 'utf8');

/** Every .ts, .html and .css file under src except specs and the theme itself, as one string. */
const readers = (): string => {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(ts|html|css|scss)$/.test(name) && !name.endsWith('.spec.ts') && !path.endsWith('theme.css'))
        out.push(readFileSync(path, 'utf8'));
    }
  };
  walk(src);
  return out.join('\n');
};

// The global stylesheet after the migration: tokens, the base shim, the CDK's a11y CSS and utilities, nothing else.
describe('global stylesheets', () => {
  it('has no legacy layer and imports no #909 legacy CSS', () => {
    const styles = read('styles.css');
    expect(styles).toMatch(/^@layer theme, base, vendor, cdk, components, utilities;$/m);
    expect(styles).not.toMatch(/ui\/legacy|layer\(legacy\)/);
  });

  // Third-party CSS sits in the vendor layer, so utilities beat it; only the CDK overlay's runtime CSS is unlayered.
  it('layers the installed Mapbox GL stylesheet in vendor, as a bundle the map page links', () => {
    expect(read('styles/mapbox.css')).toMatch(/^@import 'mapbox-gl\/dist\/mapbox-gl\.css' layer\(vendor\);$/m);
    const angular = JSON.parse(readFileSync(resolve(process.cwd(), 'angular.json'), 'utf8'));
    const { styles } = angular.projects['angular-client'].architect.build.options;
    expect(styles).toEqual(['src/styles.css', { input: 'src/styles/mapbox.css', bundleName: 'mapbox', inject: false }]);
    expect(read('index.html')).not.toMatch(/mapbox/i);
  });

  it('keeps only the legacy aliases something still reads', () => {
    const theme = read('styles/theme.css');
    const aliases = [...theme.matchAll(/^\s*(--(?:ui|color-text)-[a-z0-9-]+):/gm)].map((m) => m[1]);
    const used = readers();
    expect(aliases.filter((alias) => !used.includes('var(' + alias))).toEqual([]);
    // the unused segment-summary's "See More" pill is the last reader
    expect(aliases).toEqual(['--ui-radius-full']);
  });

  it('paints the Theme colour constants in the token colours', () => {
    const theme = read('styles/theme.css');
    const token = (name: string) => theme.match(new RegExp('^\\s*--color-' + name + ':\\s*(#[0-9a-f]+);', 'im'))?.[1];
    const pairs: [string, string][] = [
      [Theme.battteryLow, 'battery-low'],
      [Theme.battteryHigh, 'battery-high'],
      [Theme.infoBackground, 'panel'],
      [Theme.page, 'page'],
      [Theme.secondaryBorder, 'secondary-border']
    ];
    for (const [value, name] of pairs) expect([name, value.toLowerCase()]).toEqual([name, token(name)?.toLowerCase()]);
  });
});
