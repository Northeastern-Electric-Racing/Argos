import 'dart:collection';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../connection/base_data.dart';
import '../../global_settings.dart';
import '../../services/datatype_service.dart';

class FavoritesPage extends ConsumerWidget {
  const FavoritesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final HashSet<PublicDataType> favs = ref.watch(
      favoriteTopicsManagerProvider,
    );
    if (favs.isEmpty) {
      return RichText(
        text: const TextSpan(
          children: <InlineSpan>[
            TextSpan(text: 'Add items to the favorites page by clicking the '),
            WidgetSpan(
              child: Padding(
                padding: EdgeInsets.symmetric(horizontal: 2.0),
                child: Icon(Icons.star_outline),
              ),
            ),
            TextSpan(text: ' on the Data page!'),
          ],
        ),
      );
    }
    return ListView.builder(
      itemCount: favs.length,
      shrinkWrap: true,
      itemBuilder: (BuildContext context, int index) =>
          DataPoint(topic: favs.elementAt(index)),
    );
  }
}

class DataPoint extends ConsumerWidget {
  final PublicDataType topic;
  const DataPoint({required this.topic, super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final NetFieldCapture<(List<double>, DateTime)>? item = ref.watch(
      capModelHolderProvider.select(
        (
          AsyncValue<Map<String, NetFieldCapture<(List<double>, DateTime)>>> it,
        ) => it.value?[topic.name],
      ),
    );
    if (item == null) {
      return Padding(
        padding: const EdgeInsets.only(left: 16.0, right: 32.0),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: <Widget>[
            Row(
              children: <Widget>[
                IconButton(
                  onPressed: () async {
                    await ref
                        .read(favoriteTopicsManagerProvider.notifier)
                        .removeTopic(topic);
                  },
                  icon: const Icon(Icons.star),
                ),
                Text(topic.name.split('/').last),
              ],
            ),
            const Text('Not Received', style: TextStyle(color: Colors.red)),
          ],
        ),
      );
    } else {
      return StreamBuilder<(List<double>, DateTime)>(
        stream: item.getStream(),
        builder:
            (
              BuildContext context,
              AsyncSnapshot<(List<double>, DateTime)> snapshot,
            ) {
              final Color? textColor = item.stale ? Colors.red : null;
              final Iterable<String>? data = snapshot.data?.$1.map(
                (double e) => e.toStringAsFixed(4),
              );
              return Padding(
                padding: const EdgeInsets.only(left: 8.0, right: 4.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: <Widget>[
                    Row(
                      children: <Widget>[
                        IconButton(
                          onPressed: () async {
                            await ref
                                .read(favoriteTopicsManagerProvider.notifier)
                                .removeTopic(item.publicDataType);
                          },
                          icon: const Icon(Icons.star),
                        ),
                        IconButton(
                          onPressed: () async {
                            ref
                                .read(graphTopicsManagerProvider.notifier)
                                .addTopic(
                                  PublicDataType(
                                    name: item.topic,
                                    unit: item.unit,
                                  ),
                                );
                            await context.push('/graph');
                          },
                          icon: const Icon(Icons.launch),
                        ),
                        Tooltip(
                          message: 'Topic: ${item.topic}',
                          child: LimitedBox(
                            maxWidth: MediaQuery.sizeOf(context).width * 0.55,
                            child: Text(
                              overflow: TextOverflow.ellipsis,
                              item.topic,
                            ),
                          ),
                        ),
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
}
