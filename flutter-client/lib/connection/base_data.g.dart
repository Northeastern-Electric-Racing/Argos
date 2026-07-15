// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'base_data.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_ClientData _$ClientDataFromJson(Map<String, dynamic> json) => _ClientData(
  runId: (json['runId'] as num).toInt(),
  name: json['name'] as String,
  unit: json['unit'] as String,
  values: (json['values'] as List<dynamic>)
      .map((e) => (e as num).toDouble())
      .toList(),
  timestamp: (json['timestamp'] as num).toInt(),
);

Map<String, dynamic> _$ClientDataToJson(_ClientData instance) =>
    <String, dynamic>{
      'runId': instance.runId,
      'name': instance.name,
      'unit': instance.unit,
      'values': instance.values,
      'timestamp': instance.timestamp,
    };

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(capModelHolder)
final capModelHolderProvider = CapModelHolderProvider._();

final class CapModelHolderProvider
    extends
        $FunctionalProvider<
          AsyncValue<Map<String, NetFieldCapture<(List<double>, DateTime)>>>,
          Map<String, NetFieldCapture<(List<double>, DateTime)>>,
          Stream<Map<String, NetFieldCapture<(List<double>, DateTime)>>>
        >
    with
        $FutureModifier<Map<String, NetFieldCapture<(List<double>, DateTime)>>>,
        $StreamProvider<
          Map<String, NetFieldCapture<(List<double>, DateTime)>>
        > {
  CapModelHolderProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'capModelHolderProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$capModelHolderHash();

  @$internal
  @override
  $StreamProviderElement<Map<String, NetFieldCapture<(List<double>, DateTime)>>>
  $createElement($ProviderPointer pointer) => $StreamProviderElement(pointer);

  @override
  Stream<Map<String, NetFieldCapture<(List<double>, DateTime)>>> create(
    Ref ref,
  ) {
    return capModelHolder(ref);
  }
}

String _$capModelHolderHash() => r'e7467a985fb464986fc9ff20ad5e630cbd9e9b05';
