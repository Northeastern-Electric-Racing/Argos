import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../connection/base_data.dart';
import '../../global_settings.dart';
import '../../services/car_command.dart';

class CarCommandPage extends ConsumerWidget {
  const CarCommandPage({super.key});

  @override
  Widget build(final BuildContext context, final WidgetRef ref) {
    final List<NetFieldCapture<(List<double>, DateTime)>>? items = ref
        .watch(capModelHolderProvider)
        .value
        ?.values
        .where(
          (final NetFieldCapture<(List<double>, DateTime)> val) =>
              val.topic.startsWith('Calypso/Bidir/State/'),
        )
        .toList();

    if (items == null || items.isEmpty) {
      return const Text(
        'Command mode not enabled or connectivity not established!',
      );
    }

    final Map<String, List<NetFieldCapture<(List<double>, DateTime)>>> i =
        <String, List<NetFieldCapture<(List<double>, DateTime)>>>{};
    for (final NetFieldCapture<(List<double>, DateTime)> item in items) {
      if (i[item.topic.getKey()] != null) {
        i[item.topic.getKey()]?.add(item);
      } else {
        i[item.topic.getKey()] = <NetFieldCapture<(List<double>, DateTime)>>[
          item,
        ];
      }
    }
    final Iterable<
      MapEntry<String, List<NetFieldCapture<(List<double>, DateTime)>>>
    >
    vals = i.entries;

    return ListView.builder(
      itemCount: vals.length,
      itemBuilder: (final BuildContext context, final int index) {
        final MapEntry<String, List<NetFieldCapture<(List<double>, DateTime)>>>
        topics = vals.elementAt(index);
        return CommandPkg(topics: topics);
      },
    );
  }
}

class CommandPkg extends ConsumerStatefulWidget {
  final MapEntry<String, List<NetFieldCapture<(List<double>, DateTime)>>>
  topics;

  const CommandPkg({required this.topics, super.key});

  @override
  ConsumerState<CommandPkg> createState() => _CommandPkgState();
}

class _CommandPkgState extends ConsumerState<CommandPkg> {
  final GlobalKey<FormState> _sendFormKey = GlobalKey<FormState>();

  final List<double> dataSend = <double>[];

  @override
  Widget build(final BuildContext context) => Card(
    child: Column(
      children: <Widget>[
        Center(child: Text(widget.topics.key)),
        Form(
          key: _sendFormKey,
          child: ListView.builder(
            shrinkWrap: true,
            itemCount: widget.topics.value.length,
            itemBuilder: (final BuildContext context, final int index) => Row(
              children: <Widget>[
                Flexible(
                  flex: 2,
                  child: TextFormField(
                    onSaved: (final String? data) {
                      dataSend.add(double.parse(data ?? ''));
                    },
                    onTapOutside: (final PointerDownEvent event) {
                      FocusScope.of(context).unfocus();
                    },
                    decoration: InputDecoration(
                      suffixText: widget.topics.value[index].unit,
                      labelText:
                          ''
                          'Point '
                          '${widget.topics.value[index].topic.getSubKey()}',
                    ),
                    validator: (final String? value) {
                      if (value == null ||
                          value.isEmpty ||
                          double.tryParse(value) == null) {
                        return 'Please enter a valid data point';
                      }
                      return null;
                    },
                  ),
                ),
                Flexible(
                  child: Center(
                    child: StreamBuilder<(List<double>, DateTime)>(
                      stream: widget.topics.value[index].getStream(),
                      builder:
                          (
                            final BuildContext context,
                            final AsyncSnapshot<(List<double>, DateTime)>
                            snapshot,
                          ) {
                            final Color? textColor =
                                widget.topics.value[index].stale
                                ? Colors.red
                                : null;
                            final Iterable<String>? data = snapshot.data?.$1
                                .map((final double e) => e.toStringAsFixed(3));
                            return Padding(
                              padding: const EdgeInsets.only(
                                left: 16.0,
                                right: 8.0,
                              ),
                              child: Row(
                                children: <Widget>[
                                  Text(
                                    style: Theme.of(context)
                                        .textTheme
                                        .bodyMedium
                                        ?.copyWith(color: textColor),
                                    '${data?.join('\n')}',
                                  ),
                                  Text(widget.topics.value[index].unit),
                                ],
                              ),
                            );
                          },
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: Theme.of(context).colorScheme.inversePrimary,
          ),
          onPressed: ref.read(connectionControlProvider).useMqtt
              ? null
              : () async {
                  if (_sendFormKey.currentState!.validate()) {
                    final bool? res = await _confirmationDialog(
                      context,
                      widget.topics.key,
                    );
                    if (res != null && res) {
                      _sendFormKey.currentState?.save();
                      final bool errored = await sendConfigCommand(
                        ref.read(connectionControlProvider).socketUri,
                        widget.topics.key,
                        dataSend,
                      );
                      dataSend.clear();
                      if (!context.mounted) return;
                      if (errored) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Failed to send data to car!'),
                          ),
                        );
                      } else {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                              'Processing data, check the current values '
                              'to ensure car successfully updated!',
                            ),
                          ),
                        );
                      }
                    }
                  }
                },
          child: const Text('Send to Car'),
        ),
      ],
    ),
  );
}

Future<bool?> _confirmationDialog(
  final BuildContext context,
  final String key,
) async => showDialog<bool>(
  context: context,
  builder: (final BuildContext context) => AlertDialog(
    icon: const Icon(Icons.warning, size: 48.0),
    title: const Text('Confirm command to send to car!'),
    content: Text('Changing setting: $key'),
    actions: <Widget>[
      TextButton(
        onPressed: () {
          context.pop(true);
        },
        child: const Text('Yes, send to car', textAlign: TextAlign.end),
      ),
      ElevatedButton(
        onPressed: context.pop,
        child: const Text('no, go back', textAlign: TextAlign.end),
      ),
    ],
  ),
);

extension GetKeys on String {
  String getKey() => substring(
    'Calypso/Bidir/State/'.length,
    indexOf('/', 'Calypso/Bidir/State/'.length + 1),
  );

  String getSubKey() => split('/').last;
}
