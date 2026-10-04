// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'run_service.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_PublicRun _$PublicRunFromJson(Map<String, dynamic> json) => _PublicRun(
  id: (json['id'] as num).toInt(),
  locationName: json['locationName'] as String,
  driverName: json['driverName'] as String,
  time: (json['time'] as num).toInt(),
  notes: json['notes'] as String,
);

Map<String, dynamic> _$PublicRunToJson(_PublicRun instance) =>
    <String, dynamic>{
      'id': instance.id,
      'locationName': instance.locationName,
      'driverName': instance.driverName,
      'time': instance.time,
      'notes': instance.notes,
    };

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// handle the /runs endpoint

@ProviderFor(RunHandler)
final runHandlerProvider = RunHandlerProvider._();

/// handle the /runs endpoint
final class RunHandlerProvider
    extends $AsyncNotifierProvider<RunHandler, List<PublicRun>> {
  /// handle the /runs endpoint
  RunHandlerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'runHandlerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$runHandlerHash();

  @$internal
  @override
  RunHandler create() => RunHandler();
}

String _$runHandlerHash() => r'658ba7a0a167b4d464da910cd4f1c3fee9acfcad';

/// handle the /runs endpoint

abstract class _$RunHandler extends $AsyncNotifier<List<PublicRun>> {
  FutureOr<List<PublicRun>> build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<AsyncValue<List<PublicRun>>, List<PublicRun>>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<List<PublicRun>>, List<PublicRun>>,
              AsyncValue<List<PublicRun>>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
