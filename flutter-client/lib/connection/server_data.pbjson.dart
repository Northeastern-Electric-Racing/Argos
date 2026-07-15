// This is a generated file - do not edit.
//
// Generated from lib/connection/server_data.proto.

// @dart = 3.3

// ignore_for_file: annotate_overrides, camel_case_types, comment_references
// ignore_for_file: constant_identifier_names
// ignore_for_file: curly_braces_in_flow_control_structures
// ignore_for_file: deprecated_member_use_from_same_package, library_prefixes
// ignore_for_file: non_constant_identifier_names, prefer_relative_imports
// ignore_for_file: unused_import

import 'dart:convert' as $convert;
import 'dart:core' as $core;
import 'dart:typed_data' as $typed_data;

@$core.Deprecated('Use serverDataDescriptor instead')
const ServerData$json = {
  '1': 'ServerData',
  '2': [
    {'1': 'unit', '3': 2, '4': 1, '5': 9, '10': 'unit'},
    {'1': 'time_us', '3': 3, '4': 1, '5': 4, '10': 'timeUs'},
    {'1': 'values', '3': 4, '4': 3, '5': 2, '10': 'values'},
  ],
  '9': [
    {'1': 1, '2': 2},
  ],
  '10': ['value'],
};

/// Descriptor for `ServerData`. Decode as a `google.protobuf.DescriptorProto`.
final $typed_data.Uint8List serverDataDescriptor = $convert.base64Decode(
    'CgpTZXJ2ZXJEYXRhEhIKBHVuaXQYAiABKAlSBHVuaXQSFwoHdGltZV91cxgDIAEoBFIGdGltZV'
    'VzEhYKBnZhbHVlcxgEIAMoAlIGdmFsdWVzSgQIARACUgV2YWx1ZQ==');
