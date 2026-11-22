import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { cx, tw } from 'src/ui/recipes/tw';

/** Defines a row in the table: a label and a function to extract the display value from a data item. */
export interface TableRowConfig<T> {
  label: string;
  getValue: (item: T) => string;
  /** Classes for the value, such as a text colour token (`text-info`); the value is `text-fg` when it returns ''. */
  getClass?: (item: T) => string;
}

/** Defines a column header: a title and an optional subtitle. */
export interface TableColumnConfig<T> {
  title: (item: T) => string;
  subtitle?: (item: T) => string;
}

const valueCell = tw(
  'border-b border-solid border-border px-4.5 py-3 font-sans text-lg font-semibold whitespace-nowrap last:border-b-0'
);
const defaultValueColour = tw('text-fg');

@Component({
  selector: 'config-table',
  templateUrl: './config-table.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { class: 'block' }
})
export class ConfigTableComponent<T> {
  rows = input.required<TableRowConfig<T>[]>();
  columns = input.required<T[]>();
  columnConfig = input.required<TableColumnConfig<T>>();

  /** One colour per value: the row's own (getClass) or the default, never both on one element. */
  protected valueClass(row: TableRowConfig<T>, item: T): string {
    return cx(valueCell, row.getClass?.(item) || defaultValueColour);
  }
}
