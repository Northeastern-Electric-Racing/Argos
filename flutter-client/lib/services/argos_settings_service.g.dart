// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'argos_settings_service.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_ScyllaSettings _$ScyllaSettingsFromJson(Map<String, dynamic> json) =>
    _ScyllaSettings(
      data_upload_disabled: json['data_upload_disabled'] as bool,
      batch_upsert_time: (json['batch_upsert_time'] as num).toInt(),
      ratelimit_mode: (json['ratelimit_mode'] as num).toInt(),
      static_ratelimit_time: (json['static_ratelimit_time'] as num).toInt(),
      socket_discard_percent: (json['socket_discard_percent'] as num).toInt(),
    );

Map<String, dynamic> _$ScyllaSettingsToJson(_ScyllaSettings instance) =>
    <String, dynamic>{
      'data_upload_disabled': instance.data_upload_disabled,
      'batch_upsert_time': instance.batch_upsert_time,
      'ratelimit_mode': instance.ratelimit_mode,
      'static_ratelimit_time': instance.static_ratelimit_time,
      'socket_discard_percent': instance.socket_discard_percent,
    };

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(getSettings)
final getSettingsProvider = GetSettingsProvider._();

final class GetSettingsProvider
    extends
        $FunctionalProvider<
          AsyncValue<ScyllaSettings>,
          ScyllaSettings,
          FutureOr<ScyllaSettings>
        >
    with $FutureModifier<ScyllaSettings>, $FutureProvider<ScyllaSettings> {
  GetSettingsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'getSettingsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$getSettingsHash();

  @$internal
  @override
  $FutureProviderElement<ScyllaSettings> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<ScyllaSettings> create(Ref ref) {
    return getSettings(ref);
  }
}

String _$getSettingsHash() => r'31c1c254f79f7768ea0f5d72804b88c28d349388';

@ProviderFor(DataUploadDisable)
final dataUploadDisableProvider = DataUploadDisableProvider._();

final class DataUploadDisableProvider
    extends $AsyncNotifierProvider<DataUploadDisable, bool> {
  DataUploadDisableProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'dataUploadDisableProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$dataUploadDisableHash();

  @$internal
  @override
  DataUploadDisable create() => DataUploadDisable();
}

String _$dataUploadDisableHash() => r'0f3feecf7622d383de66b393fbbe6842cbd624e2';

abstract class _$DataUploadDisable extends $AsyncNotifier<bool> {
  FutureOr<bool> build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<AsyncValue<bool>, bool>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<bool>, bool>,
              AsyncValue<bool>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}

@ProviderFor(BatchUpsertTime)
final batchUpsertTimeProvider = BatchUpsertTimeProvider._();

final class BatchUpsertTimeProvider
    extends $AsyncNotifierProvider<BatchUpsertTime, int> {
  BatchUpsertTimeProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'batchUpsertTimeProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$batchUpsertTimeHash();

  @$internal
  @override
  BatchUpsertTime create() => BatchUpsertTime();
}

String _$batchUpsertTimeHash() => r'e0d669c6688938fa3798aee48d541b2ad2245423';

abstract class _$BatchUpsertTime extends $AsyncNotifier<int> {
  FutureOr<int> build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<AsyncValue<int>, int>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<int>, int>,
              AsyncValue<int>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}

@ProviderFor(RateLimitModeSelect)
final rateLimitModeSelectProvider = RateLimitModeSelectProvider._();

final class RateLimitModeSelectProvider
    extends $AsyncNotifierProvider<RateLimitModeSelect, RateLimitMode> {
  RateLimitModeSelectProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'rateLimitModeSelectProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$rateLimitModeSelectHash();

  @$internal
  @override
  RateLimitModeSelect create() => RateLimitModeSelect();
}

String _$rateLimitModeSelectHash() =>
    r'c7fba2be681ec14ef41e2ae99dbf8c3067f66e72';

abstract class _$RateLimitModeSelect extends $AsyncNotifier<RateLimitMode> {
  FutureOr<RateLimitMode> build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<AsyncValue<RateLimitMode>, RateLimitMode>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<RateLimitMode>, RateLimitMode>,
              AsyncValue<RateLimitMode>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}

@ProviderFor(StaticRatelimitTime)
final staticRatelimitTimeProvider = StaticRatelimitTimeProvider._();

final class StaticRatelimitTimeProvider
    extends $AsyncNotifierProvider<StaticRatelimitTime, int> {
  StaticRatelimitTimeProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'staticRatelimitTimeProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$staticRatelimitTimeHash();

  @$internal
  @override
  StaticRatelimitTime create() => StaticRatelimitTime();
}

String _$staticRatelimitTimeHash() =>
    r'2bde1a505def7bdcb2a87239465f33fb692c45d1';

abstract class _$StaticRatelimitTime extends $AsyncNotifier<int> {
  FutureOr<int> build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<AsyncValue<int>, int>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<int>, int>,
              AsyncValue<int>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}

@ProviderFor(SocketDiscardPercent)
final socketDiscardPercentProvider = SocketDiscardPercentProvider._();

final class SocketDiscardPercentProvider
    extends $AsyncNotifierProvider<SocketDiscardPercent, int> {
  SocketDiscardPercentProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'socketDiscardPercentProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$socketDiscardPercentHash();

  @$internal
  @override
  SocketDiscardPercent create() => SocketDiscardPercent();
}

String _$socketDiscardPercentHash() =>
    r'f21aebdf314222e9ea16ed0dad57cb751f75ed58';

abstract class _$SocketDiscardPercent extends $AsyncNotifier<int> {
  FutureOr<int> build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<AsyncValue<int>, int>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<int>, int>,
              AsyncValue<int>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
