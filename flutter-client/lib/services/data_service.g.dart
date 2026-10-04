// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'data_service.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_PublicData _$PublicDataFromJson(Map<String, dynamic> json) => _PublicData(
  values: (json['values'] as List<dynamic>)
      .map((e) => (e as num).toDouble())
      .toList(),
  time: (json['time'] as num).toInt(),
);

Map<String, dynamic> _$PublicDataToJson(_PublicData instance) =>
    <String, dynamic>{'values': instance.values, 'time': instance.time};

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(getDataWithRunId)
final getDataWithRunIdProvider = GetDataWithRunIdFamily._();

final class GetDataWithRunIdProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<PublicData>>,
          List<PublicData>,
          FutureOr<List<PublicData>>
        >
    with $FutureModifier<List<PublicData>>, $FutureProvider<List<PublicData>> {
  GetDataWithRunIdProvider._({
    required GetDataWithRunIdFamily super.from,
    required ({String topic, int runId}) super.argument,
  }) : super(
         retry: null,
         name: r'getDataWithRunIdProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$getDataWithRunIdHash();

  @override
  String toString() {
    return r'getDataWithRunIdProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<List<PublicData>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<PublicData>> create(Ref ref) {
    final argument = this.argument as ({String topic, int runId});
    return getDataWithRunId(ref, topic: argument.topic, runId: argument.runId);
  }

  @override
  bool operator ==(Object other) {
    return other is GetDataWithRunIdProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$getDataWithRunIdHash() => r'46496698d15ec9fcc4de34e3bf0ee52a49fe6ba8';

final class GetDataWithRunIdFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<List<PublicData>>,
          ({String topic, int runId})
        > {
  GetDataWithRunIdFamily._()
    : super(
        retry: null,
        name: r'getDataWithRunIdProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  GetDataWithRunIdProvider call({required String topic, required int runId}) =>
      GetDataWithRunIdProvider._(
        argument: (topic: topic, runId: runId),
        from: this,
      );

  @override
  String toString() => r'getDataWithRunIdProvider';
}

@ProviderFor(getMultiDataWithRunId)
final getMultiDataWithRunIdProvider = GetMultiDataWithRunIdFamily._();

final class GetMultiDataWithRunIdProvider
    extends
        $FunctionalProvider<
          AsyncValue<Map<String, List<PublicData>>>,
          Map<String, List<PublicData>>,
          FutureOr<Map<String, List<PublicData>>>
        >
    with
        $FutureModifier<Map<String, List<PublicData>>>,
        $FutureProvider<Map<String, List<PublicData>>> {
  GetMultiDataWithRunIdProvider._({
    required GetMultiDataWithRunIdFamily super.from,
    required ({HashSet<PublicDataType> topics, int runId}) super.argument,
  }) : super(
         retry: null,
         name: r'getMultiDataWithRunIdProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$getMultiDataWithRunIdHash();

  @override
  String toString() {
    return r'getMultiDataWithRunIdProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<Map<String, List<PublicData>>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<Map<String, List<PublicData>>> create(Ref ref) {
    final argument =
        this.argument as ({HashSet<PublicDataType> topics, int runId});
    return getMultiDataWithRunId(
      ref,
      topics: argument.topics,
      runId: argument.runId,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is GetMultiDataWithRunIdProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$getMultiDataWithRunIdHash() =>
    r'954c97fc763bf37a5a162842cc0bd1783da241a7';

final class GetMultiDataWithRunIdFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<Map<String, List<PublicData>>>,
          ({HashSet<PublicDataType> topics, int runId})
        > {
  GetMultiDataWithRunIdFamily._()
    : super(
        retry: null,
        name: r'getMultiDataWithRunIdProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  GetMultiDataWithRunIdProvider call({
    required HashSet<PublicDataType> topics,
    required int runId,
  }) => GetMultiDataWithRunIdProvider._(
    argument: (topics: topics, runId: runId),
    from: this,
  );

  @override
  String toString() => r'getMultiDataWithRunIdProvider';
}
