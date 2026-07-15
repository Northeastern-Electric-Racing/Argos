// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'base_data.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$ClientData implements DiagnosticableTreeMixin {

 int get runId; String get name; String get unit; List<double> get values; int get timestamp;
/// Create a copy of ClientData
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ClientDataCopyWith<ClientData> get copyWith => _$ClientDataCopyWithImpl<ClientData>(this as ClientData, _$identity);

  /// Serializes this ClientData to a JSON map.
  Map<String, dynamic> toJson();

@override
void debugFillProperties(DiagnosticPropertiesBuilder properties) {
  properties
    ..add(DiagnosticsProperty('type', 'ClientData'))
    ..add(DiagnosticsProperty('runId', runId))..add(DiagnosticsProperty('name', name))..add(DiagnosticsProperty('unit', unit))..add(DiagnosticsProperty('values', values))..add(DiagnosticsProperty('timestamp', timestamp));
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ClientData&&(identical(other.runId, runId) || other.runId == runId)&&(identical(other.name, name) || other.name == name)&&(identical(other.unit, unit) || other.unit == unit)&&const DeepCollectionEquality().equals(other.values, values)&&(identical(other.timestamp, timestamp) || other.timestamp == timestamp));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,runId,name,unit,const DeepCollectionEquality().hash(values),timestamp);

@override
String toString({ DiagnosticLevel minLevel = DiagnosticLevel.info }) {
  return 'ClientData(runId: $runId, name: $name, unit: $unit, values: $values, timestamp: $timestamp)';
}


}

/// @nodoc
abstract mixin class $ClientDataCopyWith<$Res>  {
  factory $ClientDataCopyWith(ClientData value, $Res Function(ClientData) _then) = _$ClientDataCopyWithImpl;
@useResult
$Res call({
 int runId, String name, String unit, List<double> values, int timestamp
});




}
/// @nodoc
class _$ClientDataCopyWithImpl<$Res>
    implements $ClientDataCopyWith<$Res> {
  _$ClientDataCopyWithImpl(this._self, this._then);

  final ClientData _self;
  final $Res Function(ClientData) _then;

/// Create a copy of ClientData
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? runId = null,Object? name = null,Object? unit = null,Object? values = null,Object? timestamp = null,}) {
  return _then(_self.copyWith(
runId: null == runId ? _self.runId : runId // ignore: cast_nullable_to_non_nullable
as int,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,unit: null == unit ? _self.unit : unit // ignore: cast_nullable_to_non_nullable
as String,values: null == values ? _self.values : values // ignore: cast_nullable_to_non_nullable
as List<double>,timestamp: null == timestamp ? _self.timestamp : timestamp // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [ClientData].
extension ClientDataPatterns on ClientData {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ClientData value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ClientData() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ClientData value)  $default,){
final _that = this;
switch (_that) {
case _ClientData():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ClientData value)?  $default,){
final _that = this;
switch (_that) {
case _ClientData() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int runId,  String name,  String unit,  List<double> values,  int timestamp)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ClientData() when $default != null:
return $default(_that.runId,_that.name,_that.unit,_that.values,_that.timestamp);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int runId,  String name,  String unit,  List<double> values,  int timestamp)  $default,) {final _that = this;
switch (_that) {
case _ClientData():
return $default(_that.runId,_that.name,_that.unit,_that.values,_that.timestamp);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int runId,  String name,  String unit,  List<double> values,  int timestamp)?  $default,) {final _that = this;
switch (_that) {
case _ClientData() when $default != null:
return $default(_that.runId,_that.name,_that.unit,_that.values,_that.timestamp);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ClientData with DiagnosticableTreeMixin implements ClientData {
  const _ClientData({required this.runId, required this.name, required this.unit, required final  List<double> values, required this.timestamp}): _values = values;
  factory _ClientData.fromJson(Map<String, dynamic> json) => _$ClientDataFromJson(json);

@override final  int runId;
@override final  String name;
@override final  String unit;
 final  List<double> _values;
@override List<double> get values {
  if (_values is EqualUnmodifiableListView) return _values;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_values);
}

@override final  int timestamp;

/// Create a copy of ClientData
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ClientDataCopyWith<_ClientData> get copyWith => __$ClientDataCopyWithImpl<_ClientData>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ClientDataToJson(this, );
}
@override
void debugFillProperties(DiagnosticPropertiesBuilder properties) {
  properties
    ..add(DiagnosticsProperty('type', 'ClientData'))
    ..add(DiagnosticsProperty('runId', runId))..add(DiagnosticsProperty('name', name))..add(DiagnosticsProperty('unit', unit))..add(DiagnosticsProperty('values', values))..add(DiagnosticsProperty('timestamp', timestamp));
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ClientData&&(identical(other.runId, runId) || other.runId == runId)&&(identical(other.name, name) || other.name == name)&&(identical(other.unit, unit) || other.unit == unit)&&const DeepCollectionEquality().equals(other._values, _values)&&(identical(other.timestamp, timestamp) || other.timestamp == timestamp));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,runId,name,unit,const DeepCollectionEquality().hash(_values),timestamp);

@override
String toString({ DiagnosticLevel minLevel = DiagnosticLevel.info }) {
  return 'ClientData(runId: $runId, name: $name, unit: $unit, values: $values, timestamp: $timestamp)';
}


}

/// @nodoc
abstract mixin class _$ClientDataCopyWith<$Res> implements $ClientDataCopyWith<$Res> {
  factory _$ClientDataCopyWith(_ClientData value, $Res Function(_ClientData) _then) = __$ClientDataCopyWithImpl;
@override @useResult
$Res call({
 int runId, String name, String unit, List<double> values, int timestamp
});




}
/// @nodoc
class __$ClientDataCopyWithImpl<$Res>
    implements _$ClientDataCopyWith<$Res> {
  __$ClientDataCopyWithImpl(this._self, this._then);

  final _ClientData _self;
  final $Res Function(_ClientData) _then;

/// Create a copy of ClientData
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? runId = null,Object? name = null,Object? unit = null,Object? values = null,Object? timestamp = null,}) {
  return _then(_ClientData(
runId: null == runId ? _self.runId : runId // ignore: cast_nullable_to_non_nullable
as int,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,unit: null == unit ? _self.unit : unit // ignore: cast_nullable_to_non_nullable
as String,values: null == values ? _self._values : values // ignore: cast_nullable_to_non_nullable
as List<double>,timestamp: null == timestamp ? _self.timestamp : timestamp // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

// dart format on
