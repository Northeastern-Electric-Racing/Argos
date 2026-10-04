// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'run_service.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$PublicRun implements DiagnosticableTreeMixin {

 int get id; String get locationName; String get driverName; int get time; String get notes;
/// Create a copy of PublicRun
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$PublicRunCopyWith<PublicRun> get copyWith => _$PublicRunCopyWithImpl<PublicRun>(this as PublicRun, _$identity);

  /// Serializes this PublicRun to a JSON map.
  Map<String, dynamic> toJson();

@override
void debugFillProperties(DiagnosticPropertiesBuilder properties) {
  properties
    ..add(DiagnosticsProperty('type', 'PublicRun'))
    ..add(DiagnosticsProperty('id', id))..add(DiagnosticsProperty('locationName', locationName))..add(DiagnosticsProperty('driverName', driverName))..add(DiagnosticsProperty('time', time))..add(DiagnosticsProperty('notes', notes));
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is PublicRun&&(identical(other.id, id) || other.id == id)&&(identical(other.locationName, locationName) || other.locationName == locationName)&&(identical(other.driverName, driverName) || other.driverName == driverName)&&(identical(other.time, time) || other.time == time)&&(identical(other.notes, notes) || other.notes == notes));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,locationName,driverName,time,notes);

@override
String toString({ DiagnosticLevel minLevel = DiagnosticLevel.info }) {
  return 'PublicRun(id: $id, locationName: $locationName, driverName: $driverName, time: $time, notes: $notes)';
}


}

/// @nodoc
abstract mixin class $PublicRunCopyWith<$Res>  {
  factory $PublicRunCopyWith(PublicRun value, $Res Function(PublicRun) _then) = _$PublicRunCopyWithImpl;
@useResult
$Res call({
 int id, String locationName, String driverName, int time, String notes
});




}
/// @nodoc
class _$PublicRunCopyWithImpl<$Res>
    implements $PublicRunCopyWith<$Res> {
  _$PublicRunCopyWithImpl(this._self, this._then);

  final PublicRun _self;
  final $Res Function(PublicRun) _then;

/// Create a copy of PublicRun
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? locationName = null,Object? driverName = null,Object? time = null,Object? notes = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as int,locationName: null == locationName ? _self.locationName : locationName // ignore: cast_nullable_to_non_nullable
as String,driverName: null == driverName ? _self.driverName : driverName // ignore: cast_nullable_to_non_nullable
as String,time: null == time ? _self.time : time // ignore: cast_nullable_to_non_nullable
as int,notes: null == notes ? _self.notes : notes // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [PublicRun].
extension PublicRunPatterns on PublicRun {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _PublicRun value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _PublicRun() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _PublicRun value)  $default,){
final _that = this;
switch (_that) {
case _PublicRun():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _PublicRun value)?  $default,){
final _that = this;
switch (_that) {
case _PublicRun() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int id,  String locationName,  String driverName,  int time,  String notes)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _PublicRun() when $default != null:
return $default(_that.id,_that.locationName,_that.driverName,_that.time,_that.notes);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int id,  String locationName,  String driverName,  int time,  String notes)  $default,) {final _that = this;
switch (_that) {
case _PublicRun():
return $default(_that.id,_that.locationName,_that.driverName,_that.time,_that.notes);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int id,  String locationName,  String driverName,  int time,  String notes)?  $default,) {final _that = this;
switch (_that) {
case _PublicRun() when $default != null:
return $default(_that.id,_that.locationName,_that.driverName,_that.time,_that.notes);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _PublicRun with DiagnosticableTreeMixin implements PublicRun {
  const _PublicRun({required this.id, required this.locationName, required this.driverName, required this.time, required this.notes});
  factory _PublicRun.fromJson(Map<String, dynamic> json) => _$PublicRunFromJson(json);

@override final  int id;
@override final  String locationName;
@override final  String driverName;
@override final  int time;
@override final  String notes;

/// Create a copy of PublicRun
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$PublicRunCopyWith<_PublicRun> get copyWith => __$PublicRunCopyWithImpl<_PublicRun>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$PublicRunToJson(this, );
}
@override
void debugFillProperties(DiagnosticPropertiesBuilder properties) {
  properties
    ..add(DiagnosticsProperty('type', 'PublicRun'))
    ..add(DiagnosticsProperty('id', id))..add(DiagnosticsProperty('locationName', locationName))..add(DiagnosticsProperty('driverName', driverName))..add(DiagnosticsProperty('time', time))..add(DiagnosticsProperty('notes', notes));
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _PublicRun&&(identical(other.id, id) || other.id == id)&&(identical(other.locationName, locationName) || other.locationName == locationName)&&(identical(other.driverName, driverName) || other.driverName == driverName)&&(identical(other.time, time) || other.time == time)&&(identical(other.notes, notes) || other.notes == notes));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,locationName,driverName,time,notes);

@override
String toString({ DiagnosticLevel minLevel = DiagnosticLevel.info }) {
  return 'PublicRun(id: $id, locationName: $locationName, driverName: $driverName, time: $time, notes: $notes)';
}


}

/// @nodoc
abstract mixin class _$PublicRunCopyWith<$Res> implements $PublicRunCopyWith<$Res> {
  factory _$PublicRunCopyWith(_PublicRun value, $Res Function(_PublicRun) _then) = __$PublicRunCopyWithImpl;
@override @useResult
$Res call({
 int id, String locationName, String driverName, int time, String notes
});




}
/// @nodoc
class __$PublicRunCopyWithImpl<$Res>
    implements _$PublicRunCopyWith<$Res> {
  __$PublicRunCopyWithImpl(this._self, this._then);

  final _PublicRun _self;
  final $Res Function(_PublicRun) _then;

/// Create a copy of PublicRun
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? locationName = null,Object? driverName = null,Object? time = null,Object? notes = null,}) {
  return _then(_PublicRun(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as int,locationName: null == locationName ? _self.locationName : locationName // ignore: cast_nullable_to_non_nullable
as String,driverName: null == driverName ? _self.driverName : driverName // ignore: cast_nullable_to_non_nullable
as String,time: null == time ? _self.time : time // ignore: cast_nullable_to_non_nullable
as int,notes: null == notes ? _self.notes : notes // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}

// dart format on
