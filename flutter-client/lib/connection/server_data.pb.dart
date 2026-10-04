// This is a generated file - do not edit.
//
// Generated from lib/connection/server_data.proto.

// @dart = 3.3

// ignore_for_file: annotate_overrides, camel_case_types, comment_references
// ignore_for_file: constant_identifier_names
// ignore_for_file: curly_braces_in_flow_control_structures
// ignore_for_file: deprecated_member_use_from_same_package, library_prefixes
// ignore_for_file: non_constant_identifier_names, prefer_relative_imports

import 'dart:core' as $core;

import 'package:fixnum/fixnum.dart' as $fixnum;
import 'package:protobuf/protobuf.dart' as $pb;

export 'package:protobuf/protobuf.dart' show GeneratedMessageGenericExtensions;

class ServerData extends $pb.GeneratedMessage {
  factory ServerData({
    $core.String? unit,
    $fixnum.Int64? timeUs,
    $core.Iterable<$core.double>? values,
  }) {
    final result = create();
    if (unit != null) result.unit = unit;
    if (timeUs != null) result.timeUs = timeUs;
    if (values != null) result.values.addAll(values);
    return result;
  }

  ServerData._();

  factory ServerData.fromBuffer($core.List<$core.int> data,
          [$pb.ExtensionRegistry registry = $pb.ExtensionRegistry.EMPTY]) =>
      create()..mergeFromBuffer(data, registry);
  factory ServerData.fromJson($core.String json,
          [$pb.ExtensionRegistry registry = $pb.ExtensionRegistry.EMPTY]) =>
      create()..mergeFromJson(json, registry);

  static final $pb.BuilderInfo _i = $pb.BuilderInfo(
      _omitMessageNames ? '' : 'ServerData',
      package: const $pb.PackageName(_omitMessageNames ? '' : 'serverdata.v2'),
      createEmptyInstance: create)
    ..aOS(2, _omitFieldNames ? '' : 'unit')
    ..a<$fixnum.Int64>(3, _omitFieldNames ? '' : 'timeUs', $pb.PbFieldType.OU6,
        defaultOrMaker: $fixnum.Int64.ZERO)
    ..p<$core.double>(4, _omitFieldNames ? '' : 'values', $pb.PbFieldType.KF)
    ..hasRequiredFields = false;

  @$core.Deprecated('See https://github.com/google/protobuf.dart/issues/998.')
  ServerData clone() => deepCopy();
  @$core.Deprecated('See https://github.com/google/protobuf.dart/issues/998.')
  ServerData copyWith(void Function(ServerData) updates) =>
      super.copyWith((message) => updates(message as ServerData)) as ServerData;

  @$core.override
  $pb.BuilderInfo get info_ => _i;

  @$core.pragma('dart2js:noInline')
  static ServerData create() => ServerData._();
  @$core.override
  ServerData createEmptyInstance() => create();
  @$core.pragma('dart2js:noInline')
  static ServerData getDefault() => _defaultInstance ??=
      $pb.GeneratedMessage.$_defaultFor<ServerData>(create);
  static ServerData? _defaultInstance;

  @$pb.TagNumber(2)
  $core.String get unit => $_getSZ(0);
  @$pb.TagNumber(2)
  set unit($core.String value) => $_setString(0, value);
  @$pb.TagNumber(2)
  $core.bool hasUnit() => $_has(0);
  @$pb.TagNumber(2)
  void clearUnit() => $_clearField(2);

  /// time since unix epoch in MICROSECONDS
  @$pb.TagNumber(3)
  $fixnum.Int64 get timeUs => $_getI64(1);
  @$pb.TagNumber(3)
  set timeUs($fixnum.Int64 value) => $_setInt64(1, value);
  @$pb.TagNumber(3)
  $core.bool hasTimeUs() => $_has(1);
  @$pb.TagNumber(3)
  void clearTimeUs() => $_clearField(3);

  @$pb.TagNumber(4)
  $pb.PbList<$core.double> get values => $_getList(2);
}

const $core.bool _omitFieldNames =
    $core.bool.fromEnvironment('protobuf.omit_field_names');
const $core.bool _omitMessageNames =
    $core.bool.fromEnvironment('protobuf.omit_message_names');
