import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:http/http.dart' as http;
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../global_settings.dart';

part 'run_service.freezed.dart';
part 'run_service.g.dart';

/// handle the /runs endpoint
@riverpod
class RunHandler extends _$RunHandler {
  @override
  Future<List<PublicRun>> build() async {
    final Uri conn = ref.watch(connectionControlProvider).socketUri;
    final http.Response response = await http.get(Uri.parse('$conn/runs'));
    final Iterable<dynamic> json = jsonDecode(response.body);
    return List<PublicRun>.from(
      json.map((final dynamic item) => PublicRun.fromJson(item)),
    );
  }

  /// increment the run ID
  Future<PublicRun> incrementRun() async {
    final Uri conn = ref.read(connectionControlProvider).socketUri;
    final http.Response response = await http.post(Uri.parse('$conn/runs/new'));
    final Map<String, dynamic> json =
        jsonDecode(response.body) as Map<String, dynamic>;
    ref.invalidateSelf();
    return PublicRun.fromJson(json);
  }
}

/// A run, as given from Scylla
@freezed
abstract class PublicRun with _$PublicRun {
  const factory PublicRun({
    required final int id,
    required final String locationName,
    required final String driverName,
    required final int time,
    required final String notes,
  }) = _PublicRun;

  factory PublicRun.fromJson(final Map<String, Object?> json) =>
      _$PublicRunFromJson(json);
}
