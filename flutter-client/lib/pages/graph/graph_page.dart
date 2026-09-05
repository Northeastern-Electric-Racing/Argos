import 'dart:collection';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:multi_dropdown/multi_dropdown.dart';

import '../../connection/base_data.dart';
import '../../dropdown_helpers.dart';
import '../../global_settings.dart';
import '../../services/datatype_service.dart';
import '../../services/run_service.dart';
import 'graph_historical_page.dart';
import 'graph_live_page.dart';

class GraphPage extends ConsumerStatefulWidget {
  const GraphPage({super.key});

  @override
  ConsumerState<GraphPage> createState() => _GraphPageState();
}

class _GraphPageState extends ConsumerState<GraphPage> {
  bool isLive = true;
  int resetKey = 0;

  @override
  Widget build(BuildContext context) {
    // check whether we are in MQTT mode, as no historical view in MQTT mode
    final bool isMqtt = ref.watch(
      connectionControlProvider.select((ConnectionProps it) => it.useMqtt),
    );

    // get some runs
    final List<PublicRun> runs =
        ref.watch(runHandlerProvider).value ?? <PublicRun>[];

    final int currentRun = ref.watch(historicalGraphRunManagerProvider);

    return Scaffold(
      appBar: AppBar(
        actions: <Widget>[
          ElevatedButton(
            onPressed: () async {
              await context.push('/topicsSelector');
            },
            child: const Text('Select Topics'),
          ),
          const SizedBox(width: 20.0),
          DropdownMenu<int>(
            enabled: !isLive,
            label: const Text('Select Run'),
            initialSelection: currentRun,
            onSelected: (int? id) {
              setState(() {
                ref
                    .read(historicalGraphRunManagerProvider.notifier)
                    .setRunId(id ?? currentRun);
              });
            },
            dropdownMenuEntries: runs
                .map(
                  (PublicRun run) => DropdownMenuEntry<int>(
                    value: run.id,
                    label: run.id.toString(),
                  ),
                )
                .toList(),
          ),
        ],
      ),
      // show a live or historical widget based on [isLive]
      body: isLive
          ? GraphLiveMgr(key: ValueKey<int>(resetKey))
          : GraphHistorical(key: ValueKey<int>(resetKey)),
      persistentFooterAlignment: AlignmentDirectional.center,
      persistentFooterButtons: <Widget>[
        TextButton(
          onPressed: () {
            setState(() {
              resetKey++;
            });
          },
          child: const Text('Reset Graph'),
        ),
        Text(
          isMqtt
              ? 'Note: No historical data in MQTT mode'
              : 'Live Mode Enabled?',
        ),
        Switch(
          value: isLive,
          onChanged: isMqtt
              ? null
              : (bool newLive) {
                  setState(() {
                    isLive = newLive;
                  });
                },
        ),
      ],
    );
  }
}

class TopicsSelector extends ConsumerStatefulWidget {
  const TopicsSelector({super.key});

  @override
  ConsumerState<TopicsSelector> createState() => _TopicsSelectorState();
}

class _TopicsSelectorState extends ConsumerState<TopicsSelector> {
  @override
  Widget build(BuildContext context) {
    // Read (not watch) the current selection: multi_dropdown owns the live
    // selection state internally and reports it via onSelectionChange. Watching
    // would rebuild this widget on every tap, and since the dropdown only reads
    // its items at creation we'd have to recreate it (new key) each time --
    // which collapsed the in-progress multi-selection down to the last item.
    final HashSet<PublicDataType> selectedTopics = ref.read(
      graphTopicsManagerProvider,
    );
    final List<PublicDataType> availTopics =
        ref
            .watch(capModelHolderProvider)
            .value
            ?.values
            .map(
              (NetFieldCapture<(List<double>, DateTime)> e) => e.publicDataType,
            )
            .toList() ??
        <PublicDataType>[];
    return Scaffold(
      appBar: AppBar(title: const Text('Topics Selection for Graph')),
      body: Column(
        mainAxisAlignment: MainAxisAlignment.end,
        children: <Widget>[
          MultiDropdown<PublicDataType>(
            // Recreate only when the set of available topics changes (the
            // widget ignores item changes after creation), preserving the
            // selection from the provider across those rebuilds.
            key: ValueKey<int>(availTopics.length),
            autovalidateMode: AutovalidateMode.onUnfocus,
            searchEnabled: true,
            itemBuilder: (
              DropdownItem<PublicDataType> item,
              int index,
              VoidCallback onTap,
            ) => multiDropdownItemBuilder<PublicDataType>(context, item, onTap),
            onSelectionChange: (List<PublicDataType> items) {
              ref.read(graphTopicsManagerProvider.notifier).setTopics(items);
            },
            items: availTopics
                .map(
                  (PublicDataType e) => DropdownItem<PublicDataType>(
                    selected: selectedTopics.contains(e),
                    label: e.name,
                    value: e,
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
            validator: (List<DropdownItem<PublicDataType>>? value) {
              if (value == null || value.isEmpty) {
                return 'Please select one or more topics';
              }
              return null;
            },
          ),
        ],
      ),
    );
  }
}
