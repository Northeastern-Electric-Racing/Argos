import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../global_settings.dart';
import '../../services/datatype_service.dart';
import '../../services/rule_service.dart';

class RuleNotificationsPage extends ConsumerWidget {
  const RuleNotificationsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final List<RuleNotification> notifications = ref.watch(
      ruleNotificationsManagerProvider,
    );
    return ListView(
      children: <Widget>[
        Wrap(
          alignment: WrapAlignment.center,
          children: <Widget>[
            ElevatedButton(
              onPressed: () {
                ref
                    .read(ruleNotificationsManagerProvider.notifier)
                    .clearNotifications();
              },
              child: const Text('Clear Notifications'),
            ),
          ],
        ),
        const Text(
          'Long press to graph, tap to open rule in settings',
          textAlign: TextAlign.center,
        ),
        for (final RuleNotification notification in notifications.reversed)
          ListTile(
            title: Text(notification.id),
            subtitle: Text(notification.topic),
            leading: Text('${notification.time.toLocal()}'),
            trailing: Text('Was ${notification.values}'),
            onTap: () {},
            onLongPress: () async {
              // lookup unit
              final PublicDataType? dataType = ref
                  .read(getDataTypesProvider)
                  .value
                  ?.firstWhere(
                    (PublicDataType d) => d.name == notification.topic,
                  );
              if (dataType != null) {
                ref.read(graphTopicsManagerProvider.notifier).setTopics(
                  <PublicDataType>[dataType],
                );
                await context.push('/graph');
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Could not find topic')),
                );
              }
            },
          ),
      ],
    );
  }
}
