import 'package:flutter/material.dart';
import 'package:multi_dropdown/multi_dropdown.dart';

/// Item builder for [MultiDropdown] that wraps each row in its own [Material].
///
/// multi_dropdown's default item paints a background on a Container that sits
/// between the row's [ListTile] and the dropdown's [Material]. That trips
/// Flutter's "ListTile background color or ink splashes may be invisible"
/// assertion (the tile paints its ink on the nearest Material, which the
/// background-painting Container hides). Giving the [ListTile] its own
/// [Material] ancestor fixes that while keeping the selected highlight and a
/// check indicator.
Widget multiDropdownItemBuilder<T>(
  BuildContext context,
  DropdownItem<T> item,
  VoidCallback onTap,
) => Material(
  color: item.selected ? Theme.of(context).highlightColor : Colors.transparent,
  child: ListTile(
    dense: true,
    selected: item.selected,
    title: Text(item.label),
    trailing: item.selected
        ? Icon(
            Icons.check_box,
            color: Theme.of(context).checkboxTheme.fillColor
                ?.resolve(<WidgetState>{WidgetState.selected}),
          )
        : null,
    onTap: onTap,
  ),
);
