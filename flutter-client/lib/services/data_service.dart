import 'dart:collection';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:http/http.dart' as http;
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../global_settings.dart';
import 'datatype_service.dart';

part 'data_service.freezed.dart';
part 'data_service.g.dart';

@riverpod
Future<List<PublicData>> getDataWithRunId(
  final Ref ref, {
  required final String topic,
  required final int runId,
}) async {
  final Uri conn = ref.watch(connectionControlProvider).socketUri;
  final http.Response response = await http.get(
    Uri.parse('$conn/data/${Uri.encodeComponent(topic)}/$runId'),
  );
  final Iterable<dynamic> json = jsonDecode(response.body);
  return List<PublicData>.from(
    json.map((final dynamic item) => PublicData.fromJson(item)),
  );
}

@riverpod
Future<Map<String, List<PublicData>>> getMultiDataWithRunId(
  final Ref ref, {
  required final HashSet<PublicDataType> topics,
  required final int runId,
}) async {
  final Uri conn = ref.watch(connectionControlProvider).socketUri;
  final Map<String, List<PublicData>> data = <String, List<PublicData>>{};
  for (final PublicDataType topic in topics) {
    final http.Response response = await http.get(
      Uri.parse('$conn/data/${Uri.encodeComponent(topic.name)}/$runId'),
    );
    final Iterable<dynamic> json = jsonDecode(response.body);
    data[topic.name] = List<PublicData>.from(
      json.map((final dynamic item) => PublicData.fromJson(item)),
    );
  }
  return data;
}

/// A run, as given from Scylla
@freezed
abstract class PublicData with _$PublicData {
  const factory PublicData({
    required final List<double> values,
    required final int time,
  }) = _PublicData;

  factory PublicData.fromJson(final Map<String, Object?> json) =>
      _$PublicDataFromJson(json);
}
