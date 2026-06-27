import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../constants.dart';
import '../global_settings.dart';

class SettingsPage extends StatelessWidget {
  const SettingsPage({super.key});

  @override
  Widget build(final BuildContext context) => const Center(child: Settings());
}

class Settings extends StatelessWidget {
  const Settings({super.key});

  @override
  Widget build(final BuildContext context) => ListView(
    children: const <Widget>[
      MqttToggleSwitch(),
      UriForm(
        labelText: 'Backend URI',
        icon: Icons.settings_input_antenna_outlined,
        mqttUri: false,
      ),
      UriForm(
        labelText: 'MQTT URI',
        icon: Icons.import_export_sharp,
        mqttUri: true,
      ),
      LiveGraphDisplayDuration(),
      ThemeModeSelector(),
      ThemeSeedSelector(),
    ],
  );
}

/// A settings row that vertically centers an icon + title against a trailing
/// [control] when there is room, and stacks them (control below, right-aligned)
/// on narrow screens so wide controls do not overflow horizontally.
class _SettingRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final Widget control;
  const _SettingRow({
    required this.icon,
    required this.title,
    required this.control,
  });

  @override
  Widget build(final BuildContext context) {
    final Widget titleRow = Row(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        Icon(icon),
        const SizedBox(width: 16.0),
        Flexible(
          child: Text(title, style: Theme.of(context).textTheme.bodyLarge),
        ),
      ],
    );
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
      child: LayoutBuilder(
        builder:
            (final BuildContext context, final BoxConstraints constraints) {
              // Stack on narrow (mobile) widths so wide controls do not
              // overflow; keep inline centered layout on larger screens.
              if (constraints.maxWidth < 450) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    titleRow,
                    const SizedBox(height: 8.0),
                    Align(alignment: Alignment.centerRight, child: control),
                  ],
                );
              }
              return Row(
                children: <Widget>[
                  titleRow,
                  const Spacer(),
                  control,
                ],
              );
            },
      ),
    );
  }
}

/// Light / Dark / System theme mode picker.
class ThemeModeSelector extends ConsumerWidget {
  const ThemeModeSelector({super.key});

  @override
  Widget build(final BuildContext context, final WidgetRef ref) {
    final ThemeMode mode = ref.watch(
      themeSettingsManagerProvider.select((final ThemeSettings it) => it.mode),
    );
    return _SettingRow(
      icon: Icons.brightness_6,
      title: 'Theme mode',
      control: SegmentedButton<ThemeMode>(
        showSelectedIcon: false,
        segments: const <ButtonSegment<ThemeMode>>[
          ButtonSegment<ThemeMode>(
            value: ThemeMode.light,
            icon: Icon(Icons.light_mode),
            label: Text('Light'),
            tooltip: 'Always use the light theme',
          ),
          ButtonSegment<ThemeMode>(
            value: ThemeMode.dark,
            icon: Icon(Icons.dark_mode),
            label: Text('Dark'),
            tooltip: 'Always use the dark theme',
          ),
          ButtonSegment<ThemeMode>(
            value: ThemeMode.system,
            icon: Icon(Icons.brightness_auto),
            label: Text('System'),
            tooltip: 'Follow the device system light/dark setting',
          ),
        ],
        selected: <ThemeMode>{mode},
        onSelectionChanged: (final Set<ThemeMode> selected) async {
          await ref
              .read(themeSettingsManagerProvider.notifier)
              .setMode(selected.first);
        },
      ),
    );
  }
}

/// Preset seed-color picker. ColorScheme is generated from the chosen seed.
class ThemeSeedSelector extends ConsumerWidget {
  const ThemeSeedSelector({super.key});

  @override
  Widget build(final BuildContext context, final WidgetRef ref) {
    final int seed = ref
        .watch(
          themeSettingsManagerProvider.select(
            (final ThemeSettings it) => it.seed,
          ),
        )
        .toARGB32();
    return _SettingRow(
      icon: Icons.palette,
      title: 'Theme color',
      control: Wrap(
        alignment: WrapAlignment.end,
        spacing: 12.0,
        runSpacing: 12.0,
        children: THEME_SEED_PRESETS.map((final int preset) {
          final bool isSelected = preset == seed;
          return InkWell(
            customBorder: const CircleBorder(),
            onTap: () async {
              await ref
                  .read(themeSettingsManagerProvider.notifier)
                  .setSeed(Color(preset));
            },
            child: CircleAvatar(
              backgroundColor: Color(preset),
              radius: 18.0,
              child: isSelected
                  ? const Icon(Icons.check, color: Colors.white)
                  : null,
            ),
          );
        }).toList(),
      ),
    );
  }
}

class MqttToggleSwitch extends ConsumerStatefulWidget {
  const MqttToggleSwitch({super.key});

  @override
  ConsumerState<MqttToggleSwitch> createState() => _MqttToggleSwitchState();
}

class _MqttToggleSwitchState extends ConsumerState<MqttToggleSwitch> {
  @override
  Widget build(final BuildContext context) {
    final bool isMqtt = ref.watch(
      connectionControlProvider.select(
        (final ConnectionProps it) => it.useMqtt,
      ),
    );
    return SwitchListTile(
      title: const Text('Enable MQTT viewing mode'),
      secondary: const Icon(Icons.import_export_sharp),
      subtitle: kIsWeb
          ? const Text('(disabled on web)')
          : const Text('Some features will be disabled'),
      value: isMqtt,
      onChanged: kIsWeb
          ? null
          : (final bool val) async {
              if (val) {
                await ref
                    .read(connectionControlProvider.notifier)
                    .switchToMqtt();
              } else {
                await ref
                    .read(connectionControlProvider.notifier)
                    .switchToSocket();
              }
            },
    );
  }
}

class UriForm extends ConsumerStatefulWidget {
  final String labelText;
  final IconData icon;

  /// true for mqtt, false for socket
  final bool mqttUri;
  const UriForm({
    required this.labelText,
    required this.icon,
    required this.mqttUri,
    super.key,
  });

  @override
  ConsumerState<UriForm> createState() => _UriFormState();
}

class _UriFormState extends ConsumerState<UriForm> {
  final GlobalKey<FormState> _uriFormKey = GlobalKey<FormState>();
  final TextEditingController _uriFormText = TextEditingController();

  @override
  void dispose() {
    _uriFormText.dispose();
    super.dispose();
  }

  @override
  Widget build(final BuildContext context) {
    late Uri oldVal;
    if (widget.mqttUri) {
      oldVal = ref.watch(
        connectionControlProvider.select(
          (final ConnectionProps it) => it.mqttUri,
        ),
      );
    } else {
      oldVal = ref.watch(
        connectionControlProvider.select(
          (final ConnectionProps it) => it.socketUri,
        ),
      );
    }
    if (_uriFormText.text.isEmpty) {
      _uriFormText.text = oldVal.toString();
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
                labelText: widget.labelText,
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
                            if (widget.mqttUri) {
                              _uriFormText.text = MQTT_URI_DEFAULT;
                            } else {
                              _uriFormText.text = BACKEND_URI_DEFAULT;
                            }
                          },
                          label: 'Use Default',
                        ),
                      ),
                    anchors: editableTextState.contextMenuAnchors,
                  ),
              validator: (final String? value) {
                if (value == null ||
                    value.isEmpty ||
                    Uri.tryParse(value) == null) {
                  return 'Please enter a valid URI';
                }
                return null;
              },
            ),
          ),
        ),
        ElevatedButton(
          onPressed: (kIsWeb && widget.mqttUri)
              ? null
              : () async {
                  if (_uriFormKey.currentState!.validate()) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Processing Data')),
                    );
                    if (widget.mqttUri) {
                      await ref
                          .read(connectionControlProvider.notifier)
                          .setMqttUri(Uri.parse(_uriFormText.text));
                    } else {
                      await ref
                          .read(connectionControlProvider.notifier)
                          .setSocketUri(Uri.parse(_uriFormText.text));
                    }
                  }
                },
          child: const Text('Save'),
        ),
      ],
    );
  }
}

class LiveGraphDisplayDuration extends ConsumerStatefulWidget {
  const LiveGraphDisplayDuration({super.key});

  @override
  ConsumerState<LiveGraphDisplayDuration> createState() =>
      _LiveGraphDisplayDurationState();
}

class _LiveGraphDisplayDurationState
    extends ConsumerState<LiveGraphDisplayDuration> {
  final GlobalKey<FormState> _uriFormKey = GlobalKey<FormState>();
  final TextEditingController _uriFormText = TextEditingController();

  @override
  void dispose() {
    _uriFormText.dispose();
    super.dispose();
  }

  @override
  Widget build(final BuildContext context) {
    final Duration currentVal = ref.watch(liveGraphSettingsManagerProvider);
    if (_uriFormText.text.isEmpty) {
      _uriFormText.text = currentVal.inSeconds.toString();
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
                labelText: 'Duration of data to show in live graph',
                helperText: 'Right click to use default',
                suffixText: 'seconds',
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
                            _uriFormText.text = LIVE_GRAPH_DURATION_DEFAULT
                                .toString();
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
                  return 'Please enter a valid URI';
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
                  .read(liveGraphSettingsManagerProvider.notifier)
                  .setDuration(Duration(seconds: int.parse(_uriFormText.text)));
            }
          },
          child: const Text('Save'),
        ),
      ],
    );
  }
}
