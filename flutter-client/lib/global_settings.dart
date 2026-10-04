import 'dart:collection';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'constants.dart';
import 'services/datatype_service.dart';
import 'services/run_service.dart';

part 'global_settings.freezed.dart';
part 'global_settings.g.dart';

/// a package of all the current connection properties
@freezed
abstract class ConnectionProps with _$ConnectionProps {
  const factory ConnectionProps({
    /// current uri, see [useMqtt] if the uri is [mqttUri] or [socketUri]
    required Uri uri,

    /// mqtt URI to use
    required Uri mqttUri,

    /// socket URI to use
    required Uri socketUri,

    /// true if app is in MQTT mode
    required bool useMqtt,
  }) = _ConnectionProps;
}

@riverpod
class ConnectionControl extends _$ConnectionControl {
  bool _useMqtt = false;
  Uri? _mqttUri;
  Uri? _socketUri;

  @override
  ConnectionProps build() {
    // require the shared prefs
    final AsyncValue<SharedPreferences> prefs = ref.watch(
      sharedPrefsInstanceProvider,
    );
    _mqttUri = Uri.parse(
      prefs.value?.getString(MQTT_URI_KEY) ?? MQTT_URI_DEFAULT,
    );
    _socketUri = Uri.parse(
      prefs.value?.getString(BACKEND_URI_KEY) ?? BACKEND_URI_DEFAULT,
    );
    return _conn;
  }

  /// build a ConnectionProps object from the internal state
  ConnectionProps get _conn => ConnectionProps(
    uri: (_useMqtt ? _mqttUri : _socketUri) ?? Uri.parse(BACKEND_URI_KEY),
    mqttUri: _mqttUri ?? Uri.parse(MQTT_URI_KEY),
    socketUri: _socketUri ?? Uri.parse(BACKEND_URI_KEY),
    useMqtt: _useMqtt,
  );

  /// switch app to MQTT mode
  Future<void> switchToMqtt() async {
    _useMqtt = true;
    ref.invalidateSelf();
  }

  /// switch app to Socket mode
  Future<void> switchToSocket() async {
    _useMqtt = false;
    ref.invalidateSelf();
  }

  /// Set the MQTT Uri, see [switchToMqtt] to use the uri
  Future<void> setMqttUri(Uri uri) async {
    _mqttUri = uri;
    await ref
        .read(sharedPrefsInstanceProvider)
        .value
        ?.setString(MQTT_URI_KEY, uri.toString());
    ref.invalidateSelf();
  }

  /// Set the Socket Uri, see [switchToSocket] to use the uri
  Future<void> setSocketUri(Uri uri) async {
    _socketUri = uri;
    await ref
        .read(sharedPrefsInstanceProvider)
        .value
        ?.setString(BACKEND_URI_KEY, uri.toString());
    ref.invalidateSelf();
  }
}

@riverpod
class FavoriteTopicsManager extends _$FavoriteTopicsManager {
  HashSet<PublicDataType> _topics = HashSet<PublicDataType>();
  @override
  HashSet<PublicDataType> build() {
    final AsyncValue<SharedPreferences> prefs = ref.watch(
      sharedPrefsInstanceProvider,
    );
    _topics = HashSet<PublicDataType>.from(
      prefs.value
              ?.getStringList(FAVORITE_TOPICS_KEY)
              ?.map((String f) => PublicDataType.fromJson(jsonDecode(f))) ??
          FAVORITE_TOPICS_DEFAULT,
    );
    return _topics;
  }

  Future<void> _updateTopics() async {
    await ref
        .read(sharedPrefsInstanceProvider)
        .value
        ?.setStringList(
          FAVORITE_TOPICS_KEY,
          _topics.map((PublicDataType f) => jsonEncode(f.toJson())).toList(),
        );
  }

  Future<void> addTopic(PublicDataType topic) async {
    _topics.add(topic);
    await _updateTopics();
    ref.invalidateSelf();
  }

  Future<void> removeTopic(PublicDataType topic) async {
    _topics.remove(topic);
    await _updateTopics();
    ref.invalidateSelf();
  }

  Future<void> clearTopics() async {
    _topics.clear();
    await _updateTopics();
    ref.invalidateSelf();
  }
}

@riverpod
class GraphTopicsManager extends _$GraphTopicsManager {
  HashSet<PublicDataType> _graphTopics = HashSet<PublicDataType>();

  @override
  HashSet<PublicDataType> build() {
    ref.keepAlive();
    return _graphTopics;
  }

  void setTopics(List<PublicDataType> topics) {
    _graphTopics = HashSet<PublicDataType>.from(topics);
    state = _graphTopics;
  }

  void addTopic(PublicDataType topic) {
    if (_graphTopics.add(topic)) {
      state = _graphTopics;
    }
  }
}

@riverpod
class HistoricalGraphRunManager extends _$HistoricalGraphRunManager {
  /// null until the user explicitly picks a run.
  int? _runId;

  @override
  int build() {
    ref.keepAlive();
    // Until the user picks a run, follow the latest available run so historical
    // view shows real data instead of run 0 (which has none -> blank screen).
    // runHandler returns runs sorted ascending, so the last is the newest.
    if (_runId == null) {
      final List<PublicRun>? runs = ref.watch(runHandlerProvider).value;
      if (runs != null && runs.isNotEmpty) {
        return runs.last.id;
      }
    }
    return _runId ?? 0;
  }

  void setRunId(int runId) {
    _runId = runId;
    ref.invalidateSelf();
  }
}

/// Get a shared preferences instance
@riverpod
Future<SharedPreferences> sharedPrefsInstance(Ref ref) {
  ref.keepAlive();
  return SharedPreferences.getInstance();
}

@riverpod
class LiveGraphSettingsManager extends _$LiveGraphSettingsManager {
  @override
  Duration build() {
    final AsyncValue<SharedPreferences> prefs = ref.watch(
      sharedPrefsInstanceProvider,
    );

    final int res =
        prefs.value?.getInt(LIVE_GRAPH_DURATION_KEY) ??
        LIVE_GRAPH_DURATION_DEFAULT;

    return Duration(seconds: res);
  }

  Future<void> setDuration(Duration graphDir) async {
    await ref
        .read(sharedPrefsInstanceProvider)
        .value
        ?.setInt(LIVE_GRAPH_DURATION_KEY, graphDir.inSeconds);
    ref.invalidateSelf();
  }
}

/// The user's chosen app theme: a Material seed color and a light/dark/system
/// mode. Not serialized as JSON (each field is persisted separately).
@freezed
abstract class ThemeSettings with _$ThemeSettings {
  const factory ThemeSettings({required Color seed, required ThemeMode mode}) =
      _ThemeSettings;
}

@riverpod
class ThemeSettingsManager extends _$ThemeSettingsManager {
  @override
  ThemeSettings build() {
    final SharedPreferences? prefs = ref
        .watch(sharedPrefsInstanceProvider)
        .value;

    final int seed = prefs?.getInt(THEME_SEED_KEY) ?? THEME_SEED_DEFAULT;
    final String mode = prefs?.getString(THEME_MODE_KEY) ?? THEME_MODE_DEFAULT;

    return ThemeSettings(
      seed: Color(seed),
      mode: ThemeMode.values.byName(mode),
    );
  }

  Future<void> setSeed(Color seed) async {
    await ref
        .read(sharedPrefsInstanceProvider)
        .value
        ?.setInt(THEME_SEED_KEY, seed.toARGB32());
    ref.invalidateSelf();
  }

  Future<void> setMode(ThemeMode mode) async {
    await ref
        .read(sharedPrefsInstanceProvider)
        .value
        ?.setString(THEME_MODE_KEY, mode.name);
    ref.invalidateSelf();
  }
}
