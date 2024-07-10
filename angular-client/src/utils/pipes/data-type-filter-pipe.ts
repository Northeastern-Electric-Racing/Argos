import { Pipe, PipeTransform } from '@angular/core';
import { DataType } from '../types.utils';

@Pipe({
  name: 'dataTypeFilter'
})
export class DataTypeFilterPipe implements PipeTransform {
  transform(data: DataType[] | null, filterProperty: string, filter: string): any[] {
    const filterValue = filter.toLowerCase();

    return data ? (filterValue ? data.filter((item) => item.name.toLowerCase().includes(filterValue)) : data) : [];
  }
}
