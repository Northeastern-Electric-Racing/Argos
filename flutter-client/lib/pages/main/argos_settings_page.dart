import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../services/argos_settings_service.dart';

class ArgosSettingsPage extends ConsumerStatefulWidget {
  const ArgosSettingsPage({super.key});

  @override
  ConsumerState<ArgosSettingsPage> createState() => _ArgosSettingsPageState();
}

class _ArgosSettingsPageState extends ConsumerState<ArgosSettingsPage> {
  int refreshValue = 1;

  @override
  Widget build(BuildContext context) => RefreshIndicator(
    onRefresh: () async {
      // kill all the children
      setState(() {
        refreshValue++;
      });
      return ref.refresh(getSettingsProvider);
    },
    child: ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: <Widget>[
        const DataUploadDisableSwitch(),
        const SizedBox(height: 16.0),
        const Divider(),
        const Text(
          'Rate Limit Mode Selection (hover for info)',
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 4.0),
        const RateLimitModeSelect(),
        const Divider(),
        IntegerSettingWidget(
          title: 'Time to filter by (static ratelimiting mode only)',
          unit: 'seconds',
          icon: Icons.flutter_dash,
          provider: ProviderType.Static,
          key: ValueKey<int>(refreshValue),
        ),
        IntegerSettingWidget(
          title: 'Time in between batch upserts',
          unit: 'seconds',
          icon: Icons.punch_clock,
          provider: ProviderType.Batch,
          key: ValueKey<int>(refreshValue),
        ),
        IntegerSettingWidget(
          title: 'Socket data to discard',
          unit: '%',
          icon: Icons.delete_forever,
          provider: ProviderType.Socket,
          key: ValueKey<int>(refreshValue),
        ),
      ],
    ),
  );
}

class DataUploadDisableSwitch extends ConsumerWidget {
  const DataUploadDisableSwitch({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<bool> value = ref.watch(dataUploadDisableProvider);
    return SwitchListTile(
      title: const Text('DISABLE Data Storage'),
      secondary: const Icon(Icons.no_sim),
      value: value.value ?? false,
      onChanged: (bool val) async {
        if (val) {
          await ref
              .read(dataUploadDisableProvider.notifier)
              .setDataUploadDisable();
        } else {
          await ref
              .read(dataUploadDisableProvider.notifier)
              .unsetDataUploadDisable();
        }
      },
    );
  }
}

class RateLimitModeSelect extends ConsumerWidget {
  const RateLimitModeSelect({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final RateLimitMode? val = ref.watch(rateLimitModeSelectProvider).value;
    return SegmentedButton<RateLimitMode>(
      segments: const <ButtonSegment<RateLimitMode>>[
        ButtonSegment<RateLimitMode>(
          value: RateLimitMode.None,
          icon: Icon(Icons.panorama_fisheye),
          label: Text('None'),
        ),
        ButtonSegment<RateLimitMode>(
          value: RateLimitMode.Static,
          icon: Icon(Icons.compress),
          label: Tooltip(
            message: 'Remove data faster than frequency defined below',
            child: Text('Static'),
          ),
        ),
      ],
      selected: <RateLimitMode>{val ?? RateLimitMode.None},
      onSelectionChanged: (Set<RateLimitMode> newVal) async {
        await ref
            .read(rateLimitModeSelectProvider.notifier)
            .setRatelimitMode(newVal.first);
      },
    );
  }
}

enum ProviderType { Batch, Static, Socket }

class IntegerSettingWidget extends ConsumerStatefulWidget {
  final String unit;
  final String title;
  final IconData icon;
  final ProviderType provider;

  const IntegerSettingWidget({
    required this.unit,
    required this.title,
    required this.icon,
    required this.provider,
    super.key,
  });

  @override
  ConsumerState<IntegerSettingWidget> createState() =>
      _IntegerSettingWidgetState();
}

class _IntegerSettingWidgetState extends ConsumerState<IntegerSettingWidget> {
  final GlobalKey<FormState> _uriFormKey = GlobalKey<FormState>();
  final TextEditingController _uriFormText = TextEditingController();

  @override
  void dispose() {
    _uriFormText.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    int currentVal;
    switch (widget.provider) {
      case ProviderType.Batch:
        currentVal = ref.watch(batchUpsertTimeProvider).value ?? -1;
        // also listen so pull to refresh shows new values if they exist
        ref.listen(batchUpsertTimeProvider, (_, AsyncValue<int> next) {
          if (next.hasValue) _uriFormText.text = next.value!.toString();
        });
      case ProviderType.Static:
        currentVal = ref.watch(staticRatelimitTimeProvider).value ?? -1;
        ref.listen(staticRatelimitTimeProvider, (_, AsyncValue<int> next) {
          if (next.hasValue) _uriFormText.text = next.value!.toString();
        });
      case ProviderType.Socket:
        currentVal = ref.watch(socketDiscardPercentProvider).value ?? -1;
        ref.listen(socketDiscardPercentProvider, (_, AsyncValue<int> next) {
          if (next.hasValue) _uriFormText.text = next.value!.toString();
        });
    }

    if (_uriFormText.text.isEmpty || _uriFormText.text == '-1') {
      _uriFormText.text = currentVal.toString();
    }

    return Row(
      children: <Widget>[
        Flexible(
          child: Form(
            key: _uriFormKey,
            child: TextFormField(
              controller: _uriFormText,
              decoration: InputDecoration(
                icon: Icon(widget.icon),
                labelText: widget.title,
                suffixText: widget.unit,
              ),
              onTapOutside: (PointerDownEvent event) {
                FocusScope.of(context).unfocus();
              },
              validator: (String? value) {
                if (value == null ||
                    value.isEmpty ||
                    int.tryParse(value) == null) {
                  return 'Please enter a valid number';
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

              switch (widget.provider) {
                case ProviderType.Batch:
                  await ref
                      .read(batchUpsertTimeProvider.notifier)
                      .setBatchUpsertTime(int.parse(_uriFormText.text));
                case ProviderType.Static:
                  await ref
                      .read(staticRatelimitTimeProvider.notifier)
                      .setStaticRatelimitTime(int.parse(_uriFormText.text));
                case ProviderType.Socket:
                  await ref
                      .read(socketDiscardPercentProvider.notifier)
                      .setSocketDiscardPercent(int.parse(_uriFormText.text));
              }
            }
          },
          child: const Text('Save'),
        ),
      ],
    );
  }
}
