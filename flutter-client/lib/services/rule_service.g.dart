// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'rule_service.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_RuleBackup _$RuleBackupFromJson(Map<String, dynamic> json) => _RuleBackup(
  version: (json['version'] as num).toInt(),
  clientId: json['clientId'] as String,
  rules: (json['rules'] as List<dynamic>)
      .map((e) => Rule.fromJson(e as Map<String, dynamic>))
      .toList(),
);

Map<String, dynamic> _$RuleBackupToJson(_RuleBackup instance) =>
    <String, dynamic>{
      'version': instance.version,
      'clientId': instance.clientId,
      'rules': instance.rules,
    };

_Rule _$RuleFromJson(Map<String, dynamic> json) => _Rule(
  id: json['id'] as String,
  topic: json['topic'] as String,
  debounce_time: (json['debounce_time'] as num).toInt(),
  expr: json['expr'] as String,
);

Map<String, dynamic> _$RuleToJson(_Rule instance) => <String, dynamic>{
  'id': instance.id,
  'topic': instance.topic,
  'debounce_time': instance.debounce_time,
  'expr': instance.expr,
};

_RuleNotification _$RuleNotificationFromJson(Map<String, dynamic> json) =>
    _RuleNotification(
      id: json['id'] as String,
      topic: json['topic'] as String,
      values: (json['values'] as List<dynamic>)
          .map((e) => (e as num).toDouble())
          .toList(),
      time: DateTime.parse(json['time'] as String),
    );

Map<String, dynamic> _$RuleNotificationToJson(_RuleNotification instance) =>
    <String, dynamic>{
      'id': instance.id,
      'topic': instance.topic,
      'values': instance.values,
      'time': instance.time.toIso8601String(),
    };

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(RuleNotificationsManager)
final ruleNotificationsManagerProvider = RuleNotificationsManagerProvider._();

final class RuleNotificationsManagerProvider
    extends
        $NotifierProvider<RuleNotificationsManager, List<RuleNotification>> {
  RuleNotificationsManagerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'ruleNotificationsManagerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$ruleNotificationsManagerHash();

  @$internal
  @override
  RuleNotificationsManager create() => RuleNotificationsManager();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(List<RuleNotification> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<List<RuleNotification>>(value),
    );
  }
}

String _$ruleNotificationsManagerHash() =>
    r'1f096d115c1ccfe3ae40eb6204fe3d0019867182';

abstract class _$RuleNotificationsManager
    extends $Notifier<List<RuleNotification>> {
  List<RuleNotification> build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref as $Ref<List<RuleNotification>, List<RuleNotification>>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<List<RuleNotification>, List<RuleNotification>>,
              List<RuleNotification>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}

/// Get the unique one-time generated client ID for the user

@ProviderFor(ruleClientId)
final ruleClientIdProvider = RuleClientIdProvider._();

/// Get the unique one-time generated client ID for the user

final class RuleClientIdProvider
    extends $FunctionalProvider<AsyncValue<String>, String, FutureOr<String>>
    with $FutureModifier<String>, $FutureProvider<String> {
  /// Get the unique one-time generated client ID for the user
  RuleClientIdProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'ruleClientIdProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$ruleClientIdHash();

  @$internal
  @override
  $FutureProviderElement<String> $createElement($ProviderPointer pointer) =>
      $FutureProviderElement(pointer);

  @override
  FutureOr<String> create(Ref ref) {
    return ruleClientId(ref);
  }
}

String _$ruleClientIdHash() => r'9dc0e192baa283e7220ffb641367403fe871a2ab';

@ProviderFor(RuleManager)
final ruleManagerProvider = RuleManagerProvider._();

final class RuleManagerProvider
    extends $AsyncNotifierProvider<RuleManager, HashSet<Rule>> {
  RuleManagerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'ruleManagerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$ruleManagerHash();

  @$internal
  @override
  RuleManager create() => RuleManager();
}

String _$ruleManagerHash() => r'd5de15dd29aa3be31b8250a516ff293d1f3eee92';

abstract class _$RuleManager extends $AsyncNotifier<HashSet<Rule>> {
  FutureOr<HashSet<Rule>> build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<AsyncValue<HashSet<Rule>>, HashSet<Rule>>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<HashSet<Rule>>, HashSet<Rule>>,
              AsyncValue<HashSet<Rule>>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
