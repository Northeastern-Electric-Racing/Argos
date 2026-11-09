import { cx, tw } from './tw';

/*
 * The data-table and checkbox recipes, for CDK tables (`<table cdk-table>`, `*cdkHeaderRowDef="cols; sticky: true"`
 * for a sticky header, `[trackBy]`, `*cdkNoDataRow` for the empty row) and plain tables alike: the rules
 * table, the upload preview, and wave 2's lap timer, BMS chip faults, faults and notification log tables.
 *
 *   wrapper   the scroll box, positioned (sr-only labels in its cells are absolute, and would otherwise escape it
 *             and widen the page); add the height cap (max-h-*) for a sticky header to stick inside: a CDK table's
 *             `sticky: true` header row, or `headerCellClass(density, { sticky: true })` on a plain table's <th>s
 *   table     md (0.9rem) or sm (0.8125rem) text
 *   th / td   md, phone (tighter 6px cells and smaller text below 768px, long values wrap) or roomy (814's
 *             notification log: 10px by 14px cells of 14px text over faint dividers, 8px by 10px below 768px;
 *             values don't wrap, so a narrow screen scrolls the table inside its wrapper); a header cell aligns left or right (numbers), can stick to the top of the wrapper, and
 *             takes a tone: fill (surface-3, the cell's own text) or caps (814's log header: 12px semibold uppercase
 *             fg-label labels on an opaque surface-2, so it can stick too)
 *   light th  the lap timer's header: no fill, 12px semibold uppercase fg-muted labels on the card (#909's
 *             lap tables); not sticky, since rows would show through it
 *   row       striped and/or hover (tint and pointer for clickable rows, or 'tint' alone for rows that only
 *             highlight: 814's faint log hover, on the cells so it stacks over the stripe); selected from
 *             data-selected="true", focus from a solid inset ring
 *   empty     the cell of the empty (or loading) row
 */
export const TABLE_SIZES = ['md', 'sm'] as const;
export type TableSize = (typeof TABLE_SIZES)[number];
export const TABLE_DENSITIES = ['md', 'phone', 'roomy'] as const;
export type TableDensity = (typeof TABLE_DENSITIES)[number];

const tableSizeClasses: Record<TableSize, string> = {
  md: tw('w-full border-collapse text-ctrl text-fg'),
  sm: tw('w-full border-collapse text-ctrl-sm text-fg')
};

export const TABLE_ALIGNS = ['left', 'right'] as const;
export type TableAlign = (typeof TABLE_ALIGNS)[number];

export const TABLE_HEADER_TONES = ['fill', 'caps'] as const;
export type TableHeaderTone = (typeof TABLE_HEADER_TONES)[number];

/** A header cell is the base, its tone (fill and type) and its density's padding. */
const headerCellBase = tw('border-b border-solid border-border font-semibold');
const headerToneClasses: Record<TableHeaderTone, string> = {
  fill: tw('bg-surface-3'),
  caps: tw('bg-surface-2 text-xs tracking-[0.04em] text-fg-label uppercase')
};
const headerPaddingClasses: Record<TableDensity, string> = {
  md: tw('p-3'),
  phone: tw('p-3 max-md:p-1.5'),
  roomy: tw('px-3.5 py-2.5')
};
/** The phone density's smaller header text, on the fill tone only: caps keeps its 12px. */
const phoneHeaderText = tw('max-md:text-ctrl-sm');
const headerAlignClasses: Record<TableAlign, string> = { left: tw('text-left'), right: tw('text-right') };
const lightHeaderCellBase = tw(
  'border-b border-solid border-border px-3 py-2 text-xs font-semibold tracking-[0.04em] text-fg-muted uppercase'
);
/** A plain table's sticky header cell; its opaque fill (either tone) covers the rows scrolling under it. */
const stickyHeaderCell = tw('sticky top-0 z-1');

const cellMd = tw('border-b border-solid border-border px-3 py-2');
const cellClasses: Record<TableDensity, string> = {
  md: cellMd,
  phone: cx(cellMd, tw('max-md:p-1.5 max-md:text-ctrl-sm max-md:wrap-anywhere')),
  roomy: tw('border-b border-solid border-border/40 px-3.5 py-2.5 text-sm max-md:px-2.5 max-md:py-2 max-md:text-ctrl-sm')
};

const rowBase = tw(
  'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus data-[selected=true]:bg-accent/18'
);

export const tableClasses = {
  wrapper: tw('relative overflow-auto rounded-md'),
  empty: tw('border-b border-solid border-border p-8 text-center text-fg-muted')
} as const;

export function tableClass(size: TableSize = 'md'): string {
  return tableSizeClasses[size];
}

export function headerCellClass(
  density: TableDensity = 'md',
  { align = 'left', sticky = false, tone = 'fill' }: { align?: TableAlign; sticky?: boolean; tone?: TableHeaderTone } = {}
): string {
  return cx(
    headerCellBase,
    headerToneClasses[tone],
    headerPaddingClasses[density],
    tone === 'fill' && density === 'phone' && phoneHeaderText,
    headerAlignClasses[align],
    sticky && stickyHeaderCell
  );
}

/** The light header cell (no fill, small uppercase muted labels), aligned like its column. */
export function lightHeaderCellClass({ align = 'left' }: { align?: TableAlign } = {}): string {
  return cx(lightHeaderCellBase, headerAlignClasses[align]);
}

export function cellClass(density: TableDensity = 'md'): string {
  return cellClasses[density];
}

/**
 * A body row: striped (every even row tinted) and/or hover: `true` tints it and shows the pointer (clickable
 * rows), `'tint'` only tints it (rows that highlight under the mouse but don't open anything), at 814's faint
 * 3%. That tint goes on the cells, which paint over the row's fill: a 3% row fill would either replace the 4% stripe
 * (darkening a striped row on hover) or lose to it, where 3% over it lightens every row.
 */
export function rowClass({ striped = false, hover = false }: { striped?: boolean; hover?: boolean | 'tint' } = {}): string {
  return cx(
    rowBase,
    striped && tw('even:bg-fg/4'),
    hover === true && tw('cursor-pointer hover:bg-fg/8'),
    hover === 'tint' && tw('hover:*:bg-fg/3')
  );
}

/**
 * A native checkbox (`<input type="checkbox">`) drawn in the tokens: a grey edge, the accent fill and a white
 * tick when checked, a white dash when indeterminate (set `[indeterminate]`), the solid focus ring, faded when
 * disabled (select-all over an empty table, as PrimeNG's header checkbox was). The edge is
 * fg-muted (5:1 on the surface-3 table header), a step lighter than control-border's 3.2:1 there.
 * The box is 18px like #909's; as a control in a table cell it meets WCAG 2.5.8 through the spacing exception.
 */
export const checkboxClass = tw(
  "m-0 inline-grid size-4.5 cursor-pointer appearance-none place-content-center rounded-xs border-[1.5px] border-solid border-fg-muted bg-transparent align-middle before:h-1.5 before:w-2.5 before:-translate-y-px before:scale-0 before:-rotate-45 before:border-b-2 before:border-l-2 before:border-solid before:border-on-accent before:transition-transform before:duration-120 before:content-[''] checked:border-accent checked:bg-accent checked:before:scale-100 indeterminate:border-accent indeterminate:bg-accent indeterminate:before:h-0 indeterminate:before:translate-y-0 indeterminate:before:scale-100 indeterminate:before:rotate-0 indeterminate:before:border-l-0 focus-visible:focus-ring disabled:cursor-not-allowed disabled:opacity-50"
);
