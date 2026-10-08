import 'dart:collection';

import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:riverpod/riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../constants.dart';
import '../global_settings.dart';

part 'dashboard_service.g.dart';
part 'dashboard_service.freezed.dart';

@freezed
abstract class DashboardConfig with _$DashboardConfig {
  const factory DashboardConfig({
    required List<String> topics,
    required int crossAxisCount,
  }) = _DashboardConfig;

  factory DashboardConfig.fromJson(Map<String, Object?> json) =>
      _$DashboardConfigFromJson(json);
}

@riverpod
class AvailableDashboardsManager extends _$AvailableDashboardsManager {
  SplayTreeSet<String> _dashes = SplayTreeSet<String>();

  @override
  List<String> build() {
    final AsyncValue<SharedPreferences> prefs = ref.watch(
      sharedPrefsInstanceProvider,
    );
    _dashes = SplayTreeSet<String>.from(
      prefs.value?.getStringList(DASHBOARD_LIST_KEY) ?? [],
    );
    return _dashes.toList();
  }

  Future<void> _updateDashes() async {
    await ref
        .read(sharedPrefsInstanceProvider)
        .value
        ?.setStringList(DASHBOARD_LIST_KEY, _dashes.toList());
  }

  Future<void> addDash(String dashName) async {
    _dashes.add(dashName);
    await _updateDashes();
    ref.invalidateSelf();
  }

  Future<void> removeDash(String dashName) async {
    _dashes.remove(dashName);
    await ref
        .read(sharedPrefsInstanceProvider)
        .value
        ?.remove('$DASHBOARD_TOPICS_KEY_PREFIX$dashName');
    await ref
        .read(sharedPrefsInstanceProvider)
        .value
        ?.remove('$DASHBOARD_AXIS_CNT_KEY_PREFIX$dashName');
    await _updateDashes();
    ref.invalidateSelf();
  }
}

@riverpod
class DashboardConf extends _$DashboardConf {
  DashboardConfig _conf = const DashboardConfig(
    topics: <String>[],
    crossAxisCount: 1,
  );

  @override
  DashboardConfig build({required String dashName}) {
    final AsyncValue<SharedPreferences> prefs = ref.watch(
      sharedPrefsInstanceProvider,
    );
    final List<String>? topics = prefs.value?.getStringList(
      '$DASHBOARD_TOPICS_KEY_PREFIX$dashName',
    );
    final int? axisCnt = prefs.value?.getInt(
      '$DASHBOARD_AXIS_CNT_KEY_PREFIX$dashName',
    );
    _conf = DashboardConfig(
      crossAxisCount: axisCnt ?? 1,
      topics: topics ?? <String>[],
    );
    return _conf;
  }

  Future<void> _updateConf() async {
    final SharedPreferences? prefs = ref
        .read(sharedPrefsInstanceProvider)
        .value;
    await prefs?.setStringList(
      '$DASHBOARD_TOPICS_KEY_PREFIX$dashName',
      _conf.topics,
    );
    await prefs?.setInt(
      '$DASHBOARD_AXIS_CNT_KEY_PREFIX$dashName',
      _conf.crossAxisCount,
    );
  }

  Future<void> setTopics(List<String> topics) async {
    _conf = _conf.copyWith(topics: topics);
    await _updateConf();
    ref.invalidateSelf();
  }

  Future<void> setCrossAxisCnt(int cnt) async {
    _conf = _conf.copyWith(crossAxisCount: cnt);
    await _updateConf();
    ref.invalidateSelf();
  }
}
