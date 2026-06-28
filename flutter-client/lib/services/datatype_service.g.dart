// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'datatype_service.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_PublicDataType _$PublicDataTypeFromJson(Map<String, dynamic> json) =>
    _PublicDataType(name: json['name'] as String, unit: json['unit'] as String);

Map<String, dynamic> _$PublicDataTypeToJson(_PublicDataType instance) =>
    <String, dynamic>{'name': instance.name, 'unit': instance.unit};

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(getDataTypes)
final getDataTypesProvider = GetDataTypesProvider._();

final class GetDataTypesProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<PublicDataType>>,
          List<PublicDataType>,
          FutureOr<List<PublicDataType>>
        >
    with
        $FutureModifier<List<PublicDataType>>,
        $FutureProvider<List<PublicDataType>> {
  GetDataTypesProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'getDataTypesProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$getDataTypesHash();

  @$internal
  @override
  $FutureProviderElement<List<PublicDataType>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<PublicDataType>> create(Ref ref) {
    return getDataTypes(ref);
  }
}

String _$getDataTypesHash() => r'e2354d220097d7045dbb6f4fc5c65940e9753ad8';
