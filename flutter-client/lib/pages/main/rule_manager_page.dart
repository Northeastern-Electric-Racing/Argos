import 'dart:collection';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../services/rule_service.dart';

class RuleManagerPage extends ConsumerWidget {
  const RuleManagerPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final HashSet<Rule> rules =
        ref.watch(ruleManagerProvider).value ?? HashSet<Rule>();
    return ListView(
      children: <Widget>[
        Wrap(
          alignment: WrapAlignment.center,
          children: <Widget>[
            ElevatedButton(
              onPressed: () async {
                await showDialog(
                  context: context,
                  builder: (BuildContext context) => SimpleDialog(
                    title: const Text('Add Rules'),
                    children: <Widget>[
                      const NewRuleForm(),
                      TextButton.icon(
                        onPressed: context.pop,
                        label: const Text('Exit'),
                        icon: const Icon(Icons.exit_to_app),
                      ),
                    ],
                  ),
                );
              },
              child: const Text('Add Rule'),
            ),
            ElevatedButton(
              onPressed: () async {
                ref.invalidate(ruleManagerProvider);
              },
              child: const Text('Re-send rules'),
            ),
          ],
        ),
        const Divider(),
        const Text(
          'Tap a notification to delete it',
          textAlign: TextAlign.center,
        ),
        for (final Rule rule in rules)
          ListTile(
            title: Text(rule.id),
            subtitle: Text(rule.topic),
            trailing: Text(rule.expr),
            leading: Text('Debounce: ${rule.debounce_time}'),
            onLongPress: () async {
              await ref.read(ruleManagerProvider.notifier).deleteRule(rule.id);
            },
          ),
        const Divider(),
        Wrap(
          alignment: WrapAlignment.center,
          children: [
            ElevatedButton(
              onPressed: () async {
                final RuleBackup backup = ref
                    .read(ruleManagerProvider.notifier)
                    .exportRules();
                await Clipboard.setData(
                  ClipboardData(text: jsonEncode(backup)),
                );
                if (!context.mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Saved backup data to clipboard'),
                  ),
                );
              },
              child: const Text('Export current rules'),
            ),
            ElevatedButton(
              onPressed: () async {
                final RuleBackup backup = ref
                    .read(ruleManagerProvider.notifier)
                    .exportRules();
                final ClipboardData? data = await Clipboard.getData(
                  'text/plain',
                );
                if (!context.mounted) return;
                if (data != null && data.text != null) {
                  final RuleBackup rules = RuleBackup.fromJson(
                    jsonDecode(data.text!),
                  );
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text(
                        'Retrieved valid clipboard content, creating rules',
                      ),
                    ),
                  );
                  for (final Rule rule in rules.rules) {
                    await ref
                        .read(ruleManagerProvider.notifier)
                        .registerRule(rule);
                  }
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Created all rules')),
                  );
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Could not retrieve clipboard content'),
                    ),
                  );
                }
              },
              child: const Text('Import rules'),
            ),
          ],
        ),
        const Text(
          textAlign: TextAlign.center,
          'Export and import rules using clipboard content.  Content can also be saved to a file for later use.',
        ),
      ],
    );
  }
}

class NewRuleForm extends ConsumerStatefulWidget {
  const NewRuleForm({super.key});

  @override
  ConsumerState<NewRuleForm> createState() => _NewRuleFormState();
}

class _NewRuleFormState extends ConsumerState<NewRuleForm> {
  final TextEditingController _idFormText = TextEditingController();
  final TextEditingController _topicFormText = TextEditingController();
  final TextEditingController _debounceTimeFormText = TextEditingController();
  final TextEditingController _exprFormText = TextEditingController();

  final GlobalKey<FormState> _idFormKey = GlobalKey<FormState>();
  final GlobalKey<FormState> _topicFormKey = GlobalKey<FormState>();
  final GlobalKey<FormState> _debounceTimeFormKey = GlobalKey<FormState>();
  final GlobalKey<FormState> _exprFormKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _idFormText.dispose();
    _topicFormText.dispose();
    _debounceTimeFormText.dispose();
    _exprFormText.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Column(
    mainAxisSize: MainAxisSize.min,
    children: <Widget>[
      Flexible(
        child: Form(
          key: _idFormKey,
          child: TextFormField(
            controller: _idFormText,
            decoration: const InputDecoration(
              icon: Icon(Icons.insert_drive_file),
              labelText: 'Rule name',
            ),
            onTapOutside: (PointerDownEvent event) {
              FocusScope.of(context).unfocus();
            },
            validator: (String? value) {
              if (value == null || value.isEmpty) {
                return 'Please enter a valid name';
              }
              return null;
            },
          ),
        ),
      ),
      Flexible(
        child: Form(
          key: _topicFormKey,
          child: TextFormField(
            controller: _topicFormText,
            decoration: const InputDecoration(
              icon: Icon(Icons.line_axis_sharp),
              labelText: 'Topic',
            ),
            onTapOutside: (PointerDownEvent event) {
              FocusScope.of(context).unfocus();
            },
            validator: (String? value) {
              if (value == null || value.isEmpty) {
                return 'Please enter a valid name';
              }
              return null;
            },
          ),
        ),
      ),
      Flexible(
        child: Form(
          key: _debounceTimeFormKey,
          child: TextFormField(
            controller: _debounceTimeFormText,
            decoration: const InputDecoration(
              icon: Icon(Icons.timer),
              labelText: 'Debounce Time',
            ),
            onTapOutside: (PointerDownEvent event) {
              FocusScope.of(context).unfocus();
            },
            validator: (String? value) {
              if (value == null || value.isEmpty) {
                return 'Please enter a valid name';
              }
              return null;
            },
          ),
        ),
      ),
      Flexible(
        child: Form(
          key: _exprFormKey,
          child: TextFormField(
            controller: _exprFormText,
            decoration: const InputDecoration(
              icon: Icon(Icons.timer),
              labelText: 'Expression',
            ),
            onTapOutside: (PointerDownEvent event) {
              FocusScope.of(context).unfocus();
            },
            validator: (String? value) {
              if (value == null || value.isEmpty) {
                return 'Please enter a valid name';
              }
              return null;
            },
          ),
        ),
      ),
      ElevatedButton(
        onPressed: () async {
          if (_idFormKey.currentState!.validate() &&
              _topicFormKey.currentState!.validate() &&
              _debounceTimeFormKey.currentState!.validate() &&
              _exprFormKey.currentState!.validate()) {
            await ref
                .read(ruleManagerProvider.notifier)
                .registerRule(
                  Rule(
                    id: _idFormText.text,
                    topic: _topicFormText.text,
                    debounce_time: int.parse(_debounceTimeFormText.text),
                    expr: _exprFormText.text,
                  ),
                );

            if (!context.mounted) return;
            ScaffoldMessenger.of(context)
                .showSnackBar(const SnackBar(content: Text('Added rule!')));

            context.pop();
          }
        },
        child: const Text('Save'),
      ),
    ],
  );
}
