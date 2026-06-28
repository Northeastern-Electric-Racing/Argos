import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:http/http.dart' as http;
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../global_settings.dart';

part 'datatype_service.freezed.dart';
part 'datatype_service.g.dart';

@riverpod
Future<List<PublicDataType>> getDataTypes(final Ref ref) async {
  final Uri conn = ref.watch(connectionControlProvider).socketUri;
  final http.Response response = await http.get(Uri.parse('$conn/datatypes'));

  final Iterable<dynamic> json = jsonDecode(response.body);
  return json
      .map((final dynamic item) => PublicDataType.fromJson(item))
      .toList();
}

/// A run, as given from Scylla
@freezed
abstract class PublicDataType with _$PublicDataType {
  const factory PublicDataType({
    required final String name,
    required final String unit,
  }) = _PublicDataType;

  factory PublicDataType.fromJson(final Map<String, Object?> json) =>
      _$PublicDataTypeFromJson(json);
}
