// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'dashboard_service.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_DashboardConfig _$DashboardConfigFromJson(Map<String, dynamic> json) =>
    _DashboardConfig(
      topics: (json['topics'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      crossAxisCount: (json['crossAxisCount'] as num).toInt(),
    );

Map<String, dynamic> _$DashboardConfigToJson(_DashboardConfig instance) =>
    <String, dynamic>{
      'topics': instance.topics,
      'crossAxisCount': instance.crossAxisCount,
    };

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(AvailableDashboardsManager)
final availableDashboardsManagerProvider =
    AvailableDashboardsManagerProvider._();

final class AvailableDashboardsManagerProvider
    extends $NotifierProvider<AvailableDashboardsManager, List<String>> {
  AvailableDashboardsManagerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'availableDashboardsManagerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$availableDashboardsManagerHash();

  @$internal
  @override
  AvailableDashboardsManager create() => AvailableDashboardsManager();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(List<String> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<List<String>>(value),
    );
  }
}

String _$availableDashboardsManagerHash() =>
    r'db0465f7e7ed583b2f39834b091e5dd64ee1cbf5';

abstract class _$AvailableDashboardsManager extends $Notifier<List<String>> {
  List<String> build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<List<String>, List<String>>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<List<String>, List<String>>,
              List<String>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}

@ProviderFor(DashboardConf)
final dashboardConfProvider = DashboardConfFamily._();

final class DashboardConfProvider
    extends $NotifierProvider<DashboardConf, DashboardConfig> {
  DashboardConfProvider._({
    required DashboardConfFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'dashboardConfProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$dashboardConfHash();

  @override
  String toString() {
    return r'dashboardConfProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  DashboardConf create() => DashboardConf();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(DashboardConfig value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<DashboardConfig>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is DashboardConfProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$dashboardConfHash() => r'0c3165333ca68977b4288409c32eacfafecd6341';

final class DashboardConfFamily extends $Family
    with
        $ClassFamilyOverride<
          DashboardConf,
          DashboardConfig,
          DashboardConfig,
          DashboardConfig,
          String
        > {
  DashboardConfFamily._()
    : super(
        retry: null,
        name: r'dashboardConfProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  DashboardConfProvider call({required String dashName}) =>
      DashboardConfProvider._(argument: dashName, from: this);

  @override
  String toString() => r'dashboardConfProvider';
}

abstract class _$DashboardConf extends $Notifier<DashboardConfig> {
  late final _$args = ref.$arg as String;
  String get dashName => _$args;

  DashboardConfig build({required String dashName});
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<DashboardConfig, DashboardConfig>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<DashboardConfig, DashboardConfig>,
              DashboardConfig,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(dashName: _$args));
  }
}
