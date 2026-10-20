import { Pipe, PipeTransform } from '@angular/core';
import { Node } from '../types.utils';

@Pipe({
  name: 'nodeFilter'
})
export class NodeFilterPipe implements PipeTransform {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform(data: Node[] | null, filterProperty: string, filter: string): any[] {
    const filterValue = filter.toLowerCase();

    return data
      ? filterValue
        ? data.filter(
            (item) => item.name.toLowerCase().includes(filterValue) || item.topicName.toLowerCase().includes(filterValue)
          )
        : data
      : [];
  }
}
