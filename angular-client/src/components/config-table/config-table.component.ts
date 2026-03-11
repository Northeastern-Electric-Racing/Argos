import { Component, input } from '@angular/core';

/** Defines a row in the table: a label and a function to extract the display value from a data item. */
export interface TableRowConfig<T> {
  label: string;
  getValue: (item: T) => string;
  getClass?: (item: T) => string;
}

/** Defines a column header: a title and an optional subtitle. */
export interface TableColumnConfig<T> {
  title: (item: T) => string;
  subtitle?: (item: T) => string;
}

@Component({
  selector: 'config-table',
  templateUrl: './config-table.component.html',
  styleUrl: './config-table.component.css',
  standalone: true
})
export class ConfigTableComponent<T> {
  rows = input.required<TableRowConfig<T>[]>();
  columns = input.required<T[]>();
  columnConfig = input.required<TableColumnConfig<T>>();
}
