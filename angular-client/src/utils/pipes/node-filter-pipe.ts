import { Pipe, PipeTransform } from '@angular/core';
import { NodeWithVisibilityToggle } from '../types.utils';

@Pipe({
  name: 'nodeFilter'
})
export class NodeFilterPipe implements PipeTransform {
  transform(data: NodeWithVisibilityToggle[] | null, filterProperty: string, filter: string): any[] {
    const filterValue = filter.toLowerCase();

    console.log(
      data!.map((node) => {
        return {
          ...node,
          dataTypes: node.dataTypes.filter((dataType) => dataType.name.toLowerCase().includes(filterValue))
        };
      })
    );

    return data
      ? filterValue
        ? data.filter(
            (item) =>
              item.name.toLowerCase().includes(filterValue) ||
              item.dataTypes
                .map((dataType) => dataType.name.toLowerCase())
                .some((dataTypeName) => dataTypeName.includes(filterValue))
          )
        : data
      : [];
  }
}
