import { cx, tw } from './tw';
import { StyleVariant } from 'src/utils/style-variant';

/**
 * The typography recipe: the text styles that used to be CSS strings in Theme (theme.service.ts), as Tailwind
 * classes. Sizes, weights, colours and margins are what the 814 build actually rendered (measured on #909, whose
 * strings are 814's): `fontSize: 20px` did apply, through Angular's camelCase style binding, and a `<p>` without
 * `margin: 0` kept the browser's 1em block margins. Muted headers move from #808080 to the AA muted token.
 *
 * Each variant is split into families (size, weight, colour, ...), each a complete literal class list, so that
 * extra classes from a consumer can replace a family instead of fighting it: Tailwind orders utilities by its
 * own rules, not by their order in `class`, so `text-lg text-[36px]` on one element is a coin toss.
 */
export const TYPOGRAPHY_VARIANTS = [
  'header',
  'secondary-header',
  'subheader',
  'xx-large-title',
  'large-secondary-header',
  'large-header',
  'info-title',
  'info-subtitle',
  'value',
  'info-value-mobile',
  'info-value',
  'info-unit',
  'sidebar-label',
  'x-large-title'
] as const satisfies readonly StyleVariant[];

type Family = 'size' | 'weight' | 'color' | 'align' | 'margin' | 'padding' | 'self';
type Parts = Partial<Record<Family, string>>;

const base = tw('font-sans select-none [-webkit-touch-callout:none]');

const variants: Record<StyleVariant, Parts> = {
  header: { size: tw('text-lg'), weight: tw('font-bold'), color: tw('text-fg'), margin: tw('my-[1em]') },
  'secondary-header': {
    size: tw('text-lg'),
    weight: tw('font-bold'),
    color: tw('text-fg-muted'),
    margin: tw('my-[1em]')
  },
  subheader: { size: tw('text-base'), color: tw('text-fg'), margin: tw('my-[1em]') },
  'xx-large-title': {
    size: tw('text-[7.5rem]'),
    weight: tw('font-bold'),
    color: tw('text-fg'),
    margin: tw('m-0'),
    padding: tw('p-0')
  },
  'large-secondary-header': {
    size: tw('text-[2rem]'),
    weight: tw('font-bold'),
    color: tw('text-fg-muted'),
    margin: tw('my-[1em]')
  },
  'large-header': { size: tw('text-[2rem]'), weight: tw('font-bold'), color: tw('text-fg'), margin: tw('my-[1em]') },
  'info-title': { size: tw('text-lg'), weight: tw('font-normal'), color: tw('text-fg'), margin: tw('m-0') },
  'info-subtitle': { size: tw('text-ctrl'), color: tw('text-fg-label'), align: tw('text-center'), margin: tw('m-0') },
  value: {
    size: tw('text-[85px]'),
    weight: tw('font-bold'),
    color: tw('text-fg'),
    margin: tw('m-0'),
    padding: tw('p-0')
  },
  'info-value-mobile': {
    size: tw('text-[25px]'),
    weight: tw('font-bold'),
    color: tw('text-fg'),
    margin: tw('m-0'),
    self: tw('self-center')
  },
  'info-value': {
    size: tw('text-2xl'),
    weight: tw('font-bold'),
    color: tw('text-fg'),
    margin: tw('m-0'),
    self: tw('self-center')
  },
  'info-unit': { size: tw('text-[1.5rem]'), color: tw('text-fg-muted'), margin: tw('my-[1em]'), padding: tw('pt-5.5') },
  // No colour: the label takes its parent's (the nav chips colour it on hover and when active).
  'sidebar-label': { size: tw('text-base'), weight: tw('font-bold'), margin: tw('m-0') },
  'x-large-title': {
    size: tw('text-[2.5rem]'),
    weight: tw('font-bold'),
    color: tw('text-fg'),
    margin: tw('m-0'),
    padding: tw('p-0')
  }
};

const textSizes = 'xs|sm|base|lg|xl|2xl|badge|ctrl|ctrl-sm|ctrl-lg';
// Order matters: size and alignment are text-* too, so they are matched before colour.
const families: [Family, RegExp][] = [
  ['size', new RegExp(`^text-(${textSizes}|\\[(length:.+|[\\d.]+(px|r?em|vw|vh|%)|(x|xx)-large)\\])$`)],
  ['align', /^text-(left|center|right|justify|start|end)$/],
  ['color', /^text-/],
  ['weight', /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black|\[\d+\])$/],
  ['margin', /^-?m[trblxyse]?-/],
  ['padding', /^p[trblxyse]?-/],
  ['self', /^self-/]
];

/** Which families a class list sets without a variant prefix (`max-md:text-lg` layers on top, so it is ignored). */
function familiesOf(extra: string): Set<Family> {
  const found = new Set<Family>();
  for (const cls of extra.split(/\s+/)) {
    if (!cls || cls.includes(':')) continue;
    const family = families.find(([, re]) => re.test(cls));
    if (family) found.add(family[0]);
  }
  return found;
}

/**
 * The classes for a typography variant. `extra` (layout, alignment, or a size/colour/margin override) is
 * appended, and any variant family it sets is dropped: `text-[36px]` replaces the variant's size, `m-0` its
 * margins, `text-inherit` its colour. Responsive and state variants (`max-md:…`) layer on top instead.
 */
export function typographyClass(variant: StyleVariant, extra = ''): string {
  const parts = variants[variant] ?? {};
  const overridden = familiesOf(extra);
  const kept = (Object.keys(parts) as Family[]).filter((f) => !overridden.has(f)).map((f) => parts[f]);
  return cx(base, ...kept, extra.trim());
}
