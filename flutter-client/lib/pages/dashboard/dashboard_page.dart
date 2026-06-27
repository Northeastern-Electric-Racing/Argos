import 'package:flutter/material.dart';
import 'package:flutter_reorderable_grid_view/widgets/reorderable_builder.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:multi_dropdown/multi_dropdown.dart';

import '../../connection/base_data.dart';
import '../../dropdown_helpers.dart';
import '../../global_settings.dart';
import '../../services/dashboard_service.dart';
import '../../services/datatype_service.dart';

class DashboardPage extends ConsumerStatefulWidget {
  final String dashName;
  const DashboardPage({required this.dashName, super.key});

  @override
  ConsumerState<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends ConsumerState<DashboardPage> {
  final ScrollController _scrollController = ScrollController();

  @override
  Widget build(final BuildContext context) {
    final DashboardConfig conf = ref.watch(
      dashboardConfProvider(dashName: widget.dashName),
    );
    final List<DataSquare> squares = conf.topics
        .map(
          (final String d) =>
              DataSquare(dataTypeName: d, key: ValueKey<String>(d)),
        )
        .toList();
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.dashName),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      ),
      body: ReorderableBuilder<DataSquare>(
        scrollController: _scrollController,
        onReorder:
            (
              final List<DataSquare> Function(List<DataSquare>)
              reorderedListFunction,
            ) async {
              await ref
                  .read(
                    dashboardConfProvider(dashName: widget.dashName).notifier,
                  )
                  .setTopics(
                    reorderedListFunction(
                      squares,
                    ).map((final DataSquare d) => d.dataTypeName).toList(),
                  );
            },
        children: squares,
        builder: (final List<Widget> children) => GridView.count(
          controller: _scrollController,
          crossAxisCount: conf.crossAxisCount,
          children: children,
        ),
      ),
      persistentFooterAlignment: AlignmentDirectional.center,
      persistentFooterButtons: <Widget>[
        TextButton.icon(
          onPressed: () async {
            await context.push('/dashboard/${widget.dashName}/edit');
          },
          label: const Text('Edit Page'),
          icon: const Icon(Icons.edit),
        ),
      ],
    );
  }
}

class DataSquare extends ConsumerWidget {
  final String dataTypeName;
  const DataSquare({required this.dataTypeName, super.key});

  @override
  Widget build(final BuildContext context, final WidgetRef ref) {
    final Map<String, NetFieldCapture<(List<double>, DateTime)>>? allItems = ref
        .watch(capModelHolderProvider)
        .value;
    final NetFieldCapture<(List<double>, DateTime)>? item =
        allItems?[dataTypeName];
    if (item != null) {
      return GridTile(
        header: Text(item.topic, textAlign: TextAlign.center),
        child: InkWell(
          onDoubleTap: () async {
            ref.read(graphTopicsManagerProvider.notifier).setTopics(
              <PublicDataType>[
                PublicDataType(name: item.topic, unit: item.unit),
              ],
            );
            await context.push('/graph');
          },
          child: Center(
            child: StreamBuilder<(List<double>, DateTime)>(
              stream: item.getStream(),
              builder:
                  (
                    final BuildContext context,
                    final AsyncSnapshot<(List<double>, DateTime)> snapshot,
                  ) {
                    switch (snapshot.connectionState) {
                      case ConnectionState.none:
                        return const Text('NONE');
                      case ConnectionState.waiting:
                        return const Text('WAITING');
                      case ConnectionState.active:
                        return Text('${snapshot.data?.$1.first} ${item.unit}');
                      case ConnectionState.done:
                        return const Text('DONE');
                    }
                  },
            ),
          ),
        ),
      );
    } else {
      return const CircularProgressIndicator();
    }
  }
}

class DashEditorPage extends ConsumerStatefulWidget {
  final String dashName;
  const DashEditorPage({required this.dashName, super.key});

  @override
  ConsumerState<DashEditorPage> createState() => _TopicsSelectorState();
}

class _TopicsSelectorState extends ConsumerState<DashEditorPage> {
  @override
  Widget build(final BuildContext context) {
    // Read (not watch) the current config: multi_dropdown owns the live
    // selection state and reports it via onSelectionChange. Watching would
    // rebuild this widget on every tap, forcing the dropdown (which only reads
    // its items at creation) to be recreated, collapsing the in-progress
    // multi-selection down to the last item.
    final DashboardConfig conf = ref.read(
      dashboardConfProvider(dashName: widget.dashName),
    );
    final List<PublicDataType> availTopics =
        ref
            .watch(capModelHolderProvider)
            .value
            ?.values
            .map(
              (final NetFieldCapture<(List<double>, DateTime)> e) =>
                  e.publicDataType,
            )
            .toList() ??
        <PublicDataType>[];
    return Scaffold(
      appBar: AppBar(title: const Text('Topics Selection for Graph')),
      body: Column(
        mainAxisAlignment: MainAxisAlignment.end,
        children: <Widget>[
          MultiDropdown<String>(
            // Recreate only when the set of available topics changes (the
            // widget ignores item changes after creation), preserving the
            // selection across those rebuilds.
            key: ValueKey<int>(availTopics.length),
            autovalidateMode: AutovalidateMode.onUnfocus,
            searchEnabled: true,
            itemBuilder:
                (
                  final DropdownItem<String> item,
                  final int index,
                  final VoidCallback onTap,
                ) => multiDropdownItemBuilder<String>(context, item, onTap),
            onSelectionChange: (final List<String> items) async {
              await ref
                  .read(
                    dashboardConfProvider(dashName: widget.dashName).notifier,
                  )
                  .setTopics(items);
            },
            items: availTopics
                .map(
                  (final PublicDataType e) => DropdownItem<String>(
                    selected: conf.topics.contains(e.name),
                    label: e.name,
                    value: e.name,
                  ),
                )
                .toList(),
            chipDecoration: ChipDecoration(
              deleteIcon: const Icon(Icons.close_sharp, size: 18),
              backgroundColor: Theme.of(context).highlightColor,
            ),
            dropdownDecoration: DropdownDecoration(
              backgroundColor: Theme.of(context).dialogBackgroundColor,
              header: Padding(
                padding: const EdgeInsets.all(8),
                child: Text(
                  'Select topics from the list',
                  textAlign: TextAlign.start,
                  style: Theme.of(context).textTheme.labelMedium,
                ),
              ),
            ),
            validator: (final List<DropdownItem<String>>? value) {
              if (value == null || value.isEmpty) {
                return 'Please select one or more topics';
              }
              return null;
            },
          ),
          CrossAxisCountSelector(dashName: widget.dashName),
        ],
      ),
    );
  }
}

class CrossAxisCountSelector extends ConsumerStatefulWidget {
  final String dashName;
  const CrossAxisCountSelector({required this.dashName, super.key});

  @override
  ConsumerState<CrossAxisCountSelector> createState() =>
      _CrossAxisCountSelectorState();
}

class _CrossAxisCountSelectorState
    extends ConsumerState<CrossAxisCountSelector> {
  final GlobalKey<FormState> _uriFormKey = GlobalKey<FormState>();
  final TextEditingController _uriFormText = TextEditingController();

  @override
  void dispose() {
    _uriFormText.dispose();
    super.dispose();
  }

  @override
  Widget build(final BuildContext context) {
    final int currentVal = ref.watch(
      dashboardConfProvider(
        dashName: widget.dashName,
      ).select((final DashboardConfig a) => a.crossAxisCount),
    );
    if (_uriFormText.text.isEmpty) {
      _uriFormText.text = currentVal.toString();
    }
    return Row(
      children: <Widget>[
        Flexible(
          child: Form(
            key: _uriFormKey,
            child: TextFormField(
              controller: _uriFormText,
              decoration: const InputDecoration(
                icon: Icon(Icons.line_axis_sharp),
                labelText: 'Amount of Points to show across a row',
                helperText: 'Right click to use default',
              ),
              onTapOutside: (final PointerDownEvent event) {
                FocusScope.of(context).unfocus();
              },
              contextMenuBuilder:
                  (
                    final BuildContext context,
                    final EditableTextState editableTextState,
                  ) => AdaptiveTextSelectionToolbar.buttonItems(
                    buttonItems: editableTextState.contextMenuButtonItems
                      ..add(
                        ContextMenuButtonItem(
                          onPressed: () {
                            _uriFormText.text = '5';
                          },
                          label: 'Use Default',
                        ),
                      ),
                    anchors: editableTextState.contextMenuAnchors,
                  ),
              validator: (final String? value) {
                if (value == null ||
                    value.isEmpty ||
                    int.tryParse(value) == null) {
                  return 'Please enter a valid integer';
                }
                return null;
              },
            ),
          ),
        ),
        ElevatedButton(
          onPressed: () async {
            if (_uriFormKey.currentState!.validate()) {
              ScaffoldMessenger.of(
                context,
              ).showSnackBar(const SnackBar(content: Text('Processing Data')));
              await ref
                  .read(
                    dashboardConfProvider(dashName: widget.dashName).notifier,
                  )
                  .setCrossAxisCnt(int.parse(_uriFormText.text));
            }
          },
          child: const Text('Save'),
        ),
      ],
    );
  }
}
