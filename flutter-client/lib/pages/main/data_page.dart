import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../connection/base_data.dart';
import '../../global_settings.dart';
import '../../services/datatype_service.dart';

class DataPage extends ConsumerWidget {
  const DataPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<Map<String, NetFieldCapture<(List<double>, DateTime)>>>
    caps = ref.watch(capModelHolderProvider);
    return switch (caps) {
      AsyncData<Map<String, NetFieldCapture<(List<double>, DateTime)>>>(
        :final Map<String, NetFieldCapture<(List<double>, DateTime)>> value,
      ) =>
        DataExpander(items: value.values.toList()),
      AsyncError<Object>(:final Object error) => ErrorViewer(error: error),
      _ => const Center(child: CircularProgressIndicator()),
    };
  }
}

class ErrorViewer extends ConsumerWidget {
  final Object? error;
  const ErrorViewer({required this.error, super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) => Column(
    mainAxisAlignment: MainAxisAlignment.center,
    children: <Widget>[
      Text('Error: $error'),
      ElevatedButton(
        onPressed: () {
          ref.invalidate(capModelHolderProvider);
        },
        child: const Text('Retry'),
      ),
    ],
  );
}

class DataExpander extends ConsumerStatefulWidget {
  final List<NetFieldCapture<(List<double>, DateTime)>> items;
  const DataExpander({required this.items, super.key});

  @override
  ConsumerState<DataExpander> createState() => _DataExpanderState();
}

class _DataExpanderState extends ConsumerState<DataExpander> {
  @override
  void initState() {
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    // Build a tree structure from the topics
    final Map<String, dynamic> tree = _buildTree(widget.items);

    return ListView(shrinkWrap: true, children: _buildExpansionTiles(tree, 0));
  }

  // Build a hierarchical tree from the list of items
  Map<String, dynamic> _buildTree(
    List<NetFieldCapture<(List<double>, DateTime)>> items,
  ) {
    final Map<String, dynamic> root = <String, dynamic>{};

    for (final NetFieldCapture<(List<double>, DateTime)> item in items) {
      final List<String> parts = item.topic.split('/');
      Map<String, dynamic> currentLevel = root;

      for (int i = 0; i < parts.length; i++) {
        final String part = parts[i];

        // If this is the last part, add the netfieldcapture to the list
        if (i == parts.length - 1) {
          if (!currentLevel.containsKey('items')) {
            currentLevel['items'] = <dynamic>[];
          }
          (currentLevel['items'] as List<dynamic>).add(item);
        } else {
          // Otherwise, continue building the tree
          if (!currentLevel.containsKey(part)) {
            currentLevel[part] = <String, dynamic>{};
          }
          currentLevel = currentLevel[part] as Map<String, dynamic>;
        }
      }
    }

    return root;
  }

  // Build the ExpansionTiles recursively
  List<Widget> _buildExpansionTiles(Map<String, dynamic> tree, int level) =>
      tree.entries
          .where((MapEntry<String, dynamic> entry) => entry.key != 'items')
          .map(
            (MapEntry<String, dynamic> entry) => Padding(
              padding: EdgeInsets.only(left: level * 8.0),
              child: ExpansionTile(
                title: Text(entry.key),
                children: <Widget>[
                  ..._buildExpansionTiles(entry.value, level + 1),
                  if (entry.value.containsKey('items'))
                    ..._buildListItems(
                      entry.value['items'] as List<dynamic>,
                      level,
                    ),
                ],
              ),
            ),
          )
          .toList();

  // Build the final list items
  List<dynamic> _buildListItems(List<dynamic> items, int level) =>
      items.map((dynamic item) {
        assert(
          item.runtimeType == NetFieldCapture<(List<double>, DateTime)>,
          'Failure to ensure NetField existence',
        );
        return DataPoint(
          item: item as NetFieldCapture<(List<double>, DateTime)>,
          level: level,
        );
      }).toList();
}

class DataPoint extends ConsumerWidget {
  final NetFieldCapture<(List<double>, DateTime)> item;
  final int level;

  const DataPoint({required this.item, required this.level, super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bool isFav = ref
        .watch(favoriteTopicsManagerProvider)
        .contains(item.publicDataType);
    return StreamBuilder<(List<double>, DateTime)>(
      stream: item.getStream(),
      builder:
          (
            BuildContext context,
            AsyncSnapshot<(List<double>, DateTime)> snapshot,
          ) {
            final Color? textColor = item.stale ? Colors.red : null;
            final IconData isFavIcon = isFav ? Icons.star : Icons.star_border;
            final Iterable<String>? data = snapshot.data?.$1.map(
              (double e) => e.toStringAsFixed(4),
            );
            return Padding(
              padding: EdgeInsets.only(left: level * 4.0, right: 4.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: <Widget>[
                  Row(
                    children: <Widget>[
                      IconButton(
                        onPressed: () async {
                          if (isFav) {
                            await ref
                                .read(favoriteTopicsManagerProvider.notifier)
                                .removeTopic(item.publicDataType);
                          } else {
                            await ref
                                .read(favoriteTopicsManagerProvider.notifier)
                                .addTopic(item.publicDataType);
                          }
                        },
                        icon: Icon(isFavIcon),
                      ),
                      IconButton(
                        onPressed: () async {
                          ref
                              .read(graphTopicsManagerProvider.notifier)
                              .setTopics(<PublicDataType>[
                                PublicDataType(
                                  name: item.topic,
                                  unit: item.unit,
                                ),
                              ]);
                          await context.push('/graph');
                        },
                        icon: const Icon(Icons.launch),
                      ),
                      Text(item.topic.split('/').last),
                    ],
                  ),
                  Row(
                    children: <Widget>[
                      if (data != null)
                        Text(
                          softWrap: true,
                          style: Theme.of(context).textTheme.bodyMedium
                              ?.copyWith(color: textColor),
                          data.join('\n'),
                        )
                      else
                        Text(
                          'No Live Data',
                          style: Theme.of(context).textTheme.bodyMedium
                              ?.copyWith(color: textColor),
                        ),
                      const SizedBox(width: 4.0),
                      Text(item.unit),
                    ],
                  ),
                ],
              ),
            );
          },
    );
  }
}
