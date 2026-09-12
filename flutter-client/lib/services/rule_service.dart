import 'dart:async';
import 'dart:collection';
import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:http/http.dart' as http;
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../constants.dart';
import '../global_settings.dart';

part 'rule_service.freezed.dart';
part 'rule_service.g.dart';

/// A rule export/import
@freezed
abstract class RuleBackup with _$RuleBackup {
  const factory RuleBackup({
    required int version,
    required String clientId,
    required List<Rule> rules,
  }) = _RuleBackup;

  factory RuleBackup.fromJson(Map<String, Object?> json) =>
      _$RuleBackupFromJson(json);
}

/// A rule, as given from scylla
@freezed
abstract class Rule with _$Rule {
  const factory Rule({
    required String id,
    required String topic,
    // ignore: non_constant_identifier_names
    required int debounce_time,
    required String expr,
  }) = _Rule;

  factory Rule.fromJson(Map<String, Object?> json) => _$RuleFromJson(json);
}

/// A rule notification
@freezed
abstract class RuleNotification with _$RuleNotification {
  const factory RuleNotification({
    required String id,
    required String topic,
    required List<double> values,
    required DateTime time,
  }) = _RuleNotification;

  factory RuleNotification.fromJson(Map<String, Object?> json) =>
      _$RuleNotificationFromJson(json);
}

@riverpod
class RuleNotificationsManager extends _$RuleNotificationsManager {
  final List<RuleNotification> _ruleNotifications = <RuleNotification>[];

  @override
  List<RuleNotification> build() => _ruleNotifications;

  void addNotification(RuleNotification ruleNotification) {
    // remove previous notification of same id
    _ruleNotifications
      ..removeWhere((RuleNotification notif) => notif.id == ruleNotification.id)
      ..add(ruleNotification);
    ref.notifyListeners();
  }

  void clearNotifications() {
    _ruleNotifications.clear();
    ref.notifyListeners();
  }
}

@riverpod
/// Get the unique one-time generated client ID for the user
Future<String> ruleClientId(Ref ref) async {
  final SharedPreferences prefs = await ref.watch(
    sharedPrefsInstanceProvider.future,
  );

  final String? clientId = prefs.getString(RULE_CLIENTID_KEY);
  if (clientId != null) {
    return clientId;
  } else {
    // create client ID for first time, a v1- (base64 of local-randDouble)
    final String clientIdNew =
        'v1-${base64Encode('${DateTime.now()}-${Random().nextDouble()}'.codeUnits)}';
    unawaited(prefs.setString(RULE_CLIENTID_KEY, clientIdNew));
    return clientIdNew;
  }
}

@riverpod
class RuleManager extends _$RuleManager {
  final HashSet<Rule> _rules = HashSet<Rule>();

  @override
  Future<HashSet<Rule>> build() async {
    final SharedPreferences? prefs = ref
        .watch(sharedPrefsInstanceProvider)
        .value;
    if (prefs == null) return HashSet<Rule>();
    for (final String key in prefs.getKeys().where(
      (String s) => s.startsWith(RULE_DATA_KEY_PREFIX),
    )) {
      _rules.add(Rule.fromJson(jsonDecode(prefs.getString(key) ?? '')));
    }

    // send all rules
    for (final Rule rule in _rules) {
      await _sendRule(rule);
    }

    return _rules;
  }

  Future<void> _sendRule(Rule rule) async {
    final Uri conn = ref.read(connectionControlProvider).socketUri;
    final String clientId = ref.read(ruleClientIdProvider).value ?? 'test';
    final http.Response response = await http.put(
      Uri.parse('$conn/rules/add'),
      headers: <String, String>{
        HttpHeaders.authorizationHeader:
            'Basic ${base64Encode('$clientId:123'.codeUnits)}',
        HttpHeaders.contentTypeHeader: 'application/json',
      },
      body: jsonEncode(rule.toJson()),
    );
    print(response.body);
  }

  Future<void> _sendDeleteRule(String ruleId) async {
    final Uri conn = ref.read(connectionControlProvider).socketUri;
    final String clientId = ref.read(ruleClientIdProvider).value ?? 'test';
    await http.post(
      Uri.parse('$conn/rules/delete/$ruleId'),
      headers: <String, String>{
        HttpHeaders.authorizationHeader:
            'Basic ${base64Encode('$clientId:123'.codeUnits)}',
        HttpHeaders.contentTypeHeader: 'application/json',
      },
    );
  }

  Future<void> _writeRule(Rule rule) async {
    final SharedPreferences? prefs = ref
        .read(sharedPrefsInstanceProvider)
        .value;
    await prefs?.setString(
      '$RULE_DATA_KEY_PREFIX-${rule.id}',
      jsonEncode(rule.toJson()),
    );
  }

  Future<void> _writeDeleteRule(String ruleId) async {
    final SharedPreferences? prefs = ref
        .read(sharedPrefsInstanceProvider)
        .value;
    await prefs?.remove('$RULE_DATA_KEY_PREFIX-$ruleId');
  }

  Future<void> registerRule(Rule rule) async {
    _rules.add(rule);
    await _sendRule(rule);
    await _writeRule(rule);

    state = AsyncData<HashSet<Rule>>(_rules);
  }

  Future<void> deleteRule(String ruleId) async {
    _rules.removeWhere((Rule rule) => rule.id == ruleId);
    await _sendDeleteRule(ruleId);
    await _writeDeleteRule(ruleId);

    state = AsyncData<HashSet<Rule>>(_rules);
  }

  RuleBackup exportRules() {
    final String clientId = ref.read(ruleClientIdProvider).value ?? 'test';
    return RuleBackup(version: 1, clientId: clientId, rules: _rules.toList());
  }
}
