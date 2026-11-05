import { cx, tw } from './tw';

/*
 * The data-table and checkbox recipes, for CDK tables (`<table cdk-table>`, `*cdkHeaderRowDef="cols; sticky: true"`
 * for a sticky header, `[trackBy]`, `*cdkNoDataRow` for the empty row) and plain tables alike: the rules
 * table, the upload preview, and wave 2's lap timer, BMS chip faults, faults and notification log tables.
 *
 *   wrapper   the scroll box; add the height cap (max-h-*) for a sticky header to stick inside
 *   table     md (0.9rem) or sm (0.8125rem) text
 *   th / td   md, or phone (tighter 6px cells and smaller text below 768px, long values wrap)
 *   row       striped and/or hover; selected from data-selected="true", focus from a solid inset ring
 *   empty     the cell of the empty (or loading) row
 */
export const TABLE_SIZES = ['md', 'sm'] as const;
export type TableSize = (typeof TABLE_SIZES)[number];
export const TABLE_DENSITIES = ['md', 'phone'] as const;
export type TableDensity = (typeof TABLE_DENSITIES)[number];

const tableSizeClasses: Record<TableSize, string> = {
  md: tw('w-full border-collapse text-ctrl text-fg'),
  sm: tw('w-full border-collapse text-ctrl-sm text-fg')
};

const headerCellClasses: Record<TableDensity, string> = {
  md: tw('border-b border-solid border-border bg-surface-3 p-3 text-left font-semibold'),
  phone: tw('border-b border-solid border-border bg-surface-3 p-3 text-left font-semibold max-md:p-1.5 max-md:text-ctrl-sm')
};

const cellClasses: Record<TableDensity, string> = {
  md: tw('border-b border-solid border-border px-3 py-2'),
  phone: tw('border-b border-solid border-border px-3 py-2 max-md:p-1.5 max-md:text-ctrl-sm max-md:wrap-anywhere')
};

const rowBase = tw(
  'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus data-[selected=true]:bg-accent/18'
);

export const tableClasses = {
  wrapper: tw('overflow-auto rounded-md'),
  empty: tw('border-b border-solid border-border p-8 text-center text-fg-muted')
} as const;

export function tableClass(size: TableSize = 'md'): string {
  return tableSizeClasses[size];
}

export function headerCellClass(density: TableDensity = 'md'): string {
  return headerCellClasses[density];
}

export function cellClass(density: TableDensity = 'md'): string {
  return cellClasses[density];
}

/** A body row: striped (every even row tinted) and/or hover (tint and pointer, for clickable rows). */
export function rowClass({ striped = false, hover = false }: { striped?: boolean; hover?: boolean } = {}): string {
  return cx(rowBase, striped && tw('even:bg-fg/4'), hover && tw('cursor-pointer hover:bg-fg/8'));
}

/**
 * A native checkbox (`<input type="checkbox">`) drawn in the tokens: a grey edge, the accent fill and a white
 * tick when checked, a white dash when indeterminate (set `[indeterminate]`), the solid focus ring. The edge is
 * fg-muted, not control-border, so it reaches 3:1 on the surface-3 table header (#7a7a7a measured 2.94:1).
 * The box is 18px like #909's; as a table-cell control it meets WCAG 2.5.8 through the spacing exception.
 */
export const checkboxClass = tw(
  "m-0 inline-grid size-4.5 cursor-pointer appearance-none place-content-center rounded-xs border-[1.5px] border-solid border-fg-muted bg-transparent align-middle before:h-1.5 before:w-2.5 before:-translate-y-px before:scale-0 before:-rotate-45 before:border-b-2 before:border-l-2 before:border-solid before:border-on-accent before:transition-transform before:duration-120 before:content-[''] checked:border-accent checked:bg-accent checked:before:scale-100 indeterminate:border-accent indeterminate:bg-accent indeterminate:before:h-0 indeterminate:before:translate-y-0 indeterminate:before:scale-100 indeterminate:before:rotate-0 indeterminate:before:border-l-0 focus-visible:focus-ring"
);
