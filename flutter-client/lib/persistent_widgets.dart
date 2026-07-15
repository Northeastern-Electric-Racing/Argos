import 'dart:collection';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'connection/base_data.dart';
import 'global_settings.dart';
import 'services/datatype_service.dart';
import 'services/run_service.dart';

class GraphFavoritesButton extends ConsumerWidget {
  const GraphFavoritesButton({super.key});

  @override
  Widget build(final BuildContext context, final WidgetRef ref) => Tooltip(
    message: 'Click to graph all favorited topics on one graph',
    child: ElevatedButton(
      onPressed: () async {
        final HashSet<PublicDataType> favTopics = ref.read(
          favoriteTopicsManagerProvider,
        );
        ref
            .read(graphTopicsManagerProvider.notifier)
            .setTopics(favTopics.toList());
        await context.push('/graph');
      },
      child: const Text('Graph Favs'),
    ),
  );
}

/// A button to increment, refresh, and view run data, should be in actions[]
class RunIncrementButton extends ConsumerWidget {
  const RunIncrementButton({super.key});

  @override
  Widget build(final BuildContext context, final WidgetRef ref) {
    final AsyncValue<List<PublicRun>> runs = ref.watch(runHandlerProvider);

    return switch (runs) {
      AsyncData<List<PublicRun>>(:final List<PublicRun> value) => Tooltip(
        richMessage: TextSpan(
          children: <InlineSpan>[
            TextSpan(text: 'Run #${value.last.id}:\n'),
            TextSpan(
              text:
                  'Began at: '
                  '${DateTime.fromMillisecondsSinceEpoch(value.last.time)}\n',
            ),
            if (value.last.driverName.isNotEmpty)
              TextSpan(text: 'Driver: ${value.last.driverName}\n'),
            if (value.last.locationName.isNotEmpty)
              TextSpan(text: 'Location: ${value.last.locationName}\n'),
            if (value.last.notes.isNotEmpty)
              TextSpan(text: 'Notes: ${value.last.notes}\n'),
          ],
        ),
        child: ElevatedButton(
          onPressed: () async {
            // show a snackbar when the run successfully increments
            await ref.read(runHandlerProvider.notifier).incrementRun().then((
              final PublicRun value,
            ) {
              if (!context.mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Incremented Run to ${value.id}!')),
              );
            });
          },
          child: const Text('New run'),
        ),
      ),
      AsyncError<Object?>(:final Object error) => Tooltip(
        message: error.toString(),
        // refresh when clicked
        // because the program has no global connection state
        child: TextButton(
          onPressed: () {
            ref.invalidate(runHandlerProvider);
          },
          child: const Text('Get run data'),
        ),
      ),
      _ => const CircularProgressIndicator(),
    };
  }
}

/// A bottom sheet which shows latency and viewers
class BottomSysInfo extends ConsumerWidget {
  const BottomSysInfo({super.key});

  @override
  Widget build(final BuildContext context, final WidgetRef ref) {
    final AsyncValue<Map<String, NetFieldCapture<(List<double>, DateTime)>>>
    caps = ref.watch(capModelHolderProvider);

    return switch (caps) {
      AsyncData<Map<String, NetFieldCapture<(List<double>, DateTime)>>>(
        :final Map<String, NetFieldCapture<(List<double>, DateTime)>> value,
      ) =>
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: <Widget>[
            StreamBuilder<(List<double>, DateTime)>(
              stream: value['Latency']?.getStream(),
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
                        return Text('Latency: ${snapshot.data?.$1.first} ms');
                      case ConnectionState.done:
                        return const Text('DONE');
                    }
                  },
            ),
            StreamBuilder<(List<double>, DateTime)>(
              stream: value['Argos/Viewers']?.getStream(),
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
                        return Text(
                          'Current Viewers: ${snapshot.data?.$1.first.round()}',
                        );
                      case ConnectionState.done:
                        return const Text('DONE');
                    }
                  },
            ),
            StreamBuilder<(List<double>, DateTime)>(
              stream: value['Argos/Message_Rate']?.getStream(),
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
                        return Text('${snapshot.data?.$1.first} msgs/sec');
                      case ConnectionState.done:
                        return const Text('DONE');
                    }
                  },
            ),
          ],
        ),
      AsyncError<Object>(:final Object error) => Text('ERROR: $error'),
      _ => const LinearProgressIndicator(),
    };
  }
}
