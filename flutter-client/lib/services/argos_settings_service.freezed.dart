// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'argos_settings_service.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$ScyllaSettings {

 bool get data_upload_disabled; int get batch_upsert_time; int get ratelimit_mode; int get static_ratelimit_time; int get socket_discard_percent;
/// Create a copy of ScyllaSettings
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ScyllaSettingsCopyWith<ScyllaSettings> get copyWith => _$ScyllaSettingsCopyWithImpl<ScyllaSettings>(this as ScyllaSettings, _$identity);

  /// Serializes this ScyllaSettings to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ScyllaSettings&&(identical(other.data_upload_disabled, data_upload_disabled) || other.data_upload_disabled == data_upload_disabled)&&(identical(other.batch_upsert_time, batch_upsert_time) || other.batch_upsert_time == batch_upsert_time)&&(identical(other.ratelimit_mode, ratelimit_mode) || other.ratelimit_mode == ratelimit_mode)&&(identical(other.static_ratelimit_time, static_ratelimit_time) || other.static_ratelimit_time == static_ratelimit_time)&&(identical(other.socket_discard_percent, socket_discard_percent) || other.socket_discard_percent == socket_discard_percent));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,data_upload_disabled,batch_upsert_time,ratelimit_mode,static_ratelimit_time,socket_discard_percent);

@override
String toString() {
  return 'ScyllaSettings(data_upload_disabled: $data_upload_disabled, batch_upsert_time: $batch_upsert_time, ratelimit_mode: $ratelimit_mode, static_ratelimit_time: $static_ratelimit_time, socket_discard_percent: $socket_discard_percent)';
}


}

/// @nodoc
abstract mixin class $ScyllaSettingsCopyWith<$Res>  {
  factory $ScyllaSettingsCopyWith(ScyllaSettings value, $Res Function(ScyllaSettings) _then) = _$ScyllaSettingsCopyWithImpl;
@useResult
$Res call({
 bool data_upload_disabled, int batch_upsert_time, int ratelimit_mode, int static_ratelimit_time, int socket_discard_percent
});




}
/// @nodoc
class _$ScyllaSettingsCopyWithImpl<$Res>
    implements $ScyllaSettingsCopyWith<$Res> {
  _$ScyllaSettingsCopyWithImpl(this._self, this._then);

  final ScyllaSettings _self;
  final $Res Function(ScyllaSettings) _then;

/// Create a copy of ScyllaSettings
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? data_upload_disabled = null,Object? batch_upsert_time = null,Object? ratelimit_mode = null,Object? static_ratelimit_time = null,Object? socket_discard_percent = null,}) {
  return _then(_self.copyWith(
data_upload_disabled: null == data_upload_disabled ? _self.data_upload_disabled : data_upload_disabled // ignore: cast_nullable_to_non_nullable
as bool,batch_upsert_time: null == batch_upsert_time ? _self.batch_upsert_time : batch_upsert_time // ignore: cast_nullable_to_non_nullable
as int,ratelimit_mode: null == ratelimit_mode ? _self.ratelimit_mode : ratelimit_mode // ignore: cast_nullable_to_non_nullable
as int,static_ratelimit_time: null == static_ratelimit_time ? _self.static_ratelimit_time : static_ratelimit_time // ignore: cast_nullable_to_non_nullable
as int,socket_discard_percent: null == socket_discard_percent ? _self.socket_discard_percent : socket_discard_percent // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [ScyllaSettings].
extension ScyllaSettingsPatterns on ScyllaSettings {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ScyllaSettings value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ScyllaSettings() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ScyllaSettings value)  $default,){
final _that = this;
switch (_that) {
case _ScyllaSettings():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ScyllaSettings value)?  $default,){
final _that = this;
switch (_that) {
case _ScyllaSettings() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( bool data_upload_disabled,  int batch_upsert_time,  int ratelimit_mode,  int static_ratelimit_time,  int socket_discard_percent)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ScyllaSettings() when $default != null:
return $default(_that.data_upload_disabled,_that.batch_upsert_time,_that.ratelimit_mode,_that.static_ratelimit_time,_that.socket_discard_percent);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( bool data_upload_disabled,  int batch_upsert_time,  int ratelimit_mode,  int static_ratelimit_time,  int socket_discard_percent)  $default,) {final _that = this;
switch (_that) {
case _ScyllaSettings():
return $default(_that.data_upload_disabled,_that.batch_upsert_time,_that.ratelimit_mode,_that.static_ratelimit_time,_that.socket_discard_percent);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( bool data_upload_disabled,  int batch_upsert_time,  int ratelimit_mode,  int static_ratelimit_time,  int socket_discard_percent)?  $default,) {final _that = this;
switch (_that) {
case _ScyllaSettings() when $default != null:
return $default(_that.data_upload_disabled,_that.batch_upsert_time,_that.ratelimit_mode,_that.static_ratelimit_time,_that.socket_discard_percent);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ScyllaSettings implements ScyllaSettings {
  const _ScyllaSettings({required this.data_upload_disabled, required this.batch_upsert_time, required this.ratelimit_mode, required this.static_ratelimit_time, required this.socket_discard_percent});
  factory _ScyllaSettings.fromJson(Map<String, dynamic> json) => _$ScyllaSettingsFromJson(json);

@override final  bool data_upload_disabled;
@override final  int batch_upsert_time;
@override final  int ratelimit_mode;
@override final  int static_ratelimit_time;
@override final  int socket_discard_percent;

/// Create a copy of ScyllaSettings
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ScyllaSettingsCopyWith<_ScyllaSettings> get copyWith => __$ScyllaSettingsCopyWithImpl<_ScyllaSettings>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ScyllaSettingsToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ScyllaSettings&&(identical(other.data_upload_disabled, data_upload_disabled) || other.data_upload_disabled == data_upload_disabled)&&(identical(other.batch_upsert_time, batch_upsert_time) || other.batch_upsert_time == batch_upsert_time)&&(identical(other.ratelimit_mode, ratelimit_mode) || other.ratelimit_mode == ratelimit_mode)&&(identical(other.static_ratelimit_time, static_ratelimit_time) || other.static_ratelimit_time == static_ratelimit_time)&&(identical(other.socket_discard_percent, socket_discard_percent) || other.socket_discard_percent == socket_discard_percent));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,data_upload_disabled,batch_upsert_time,ratelimit_mode,static_ratelimit_time,socket_discard_percent);

@override
String toString() {
  return 'ScyllaSettings(data_upload_disabled: $data_upload_disabled, batch_upsert_time: $batch_upsert_time, ratelimit_mode: $ratelimit_mode, static_ratelimit_time: $static_ratelimit_time, socket_discard_percent: $socket_discard_percent)';
}


}

/// @nodoc
abstract mixin class _$ScyllaSettingsCopyWith<$Res> implements $ScyllaSettingsCopyWith<$Res> {
  factory _$ScyllaSettingsCopyWith(_ScyllaSettings value, $Res Function(_ScyllaSettings) _then) = __$ScyllaSettingsCopyWithImpl;
@override @useResult
$Res call({
 bool data_upload_disabled, int batch_upsert_time, int ratelimit_mode, int static_ratelimit_time, int socket_discard_percent
});




}
/// @nodoc
class __$ScyllaSettingsCopyWithImpl<$Res>
    implements _$ScyllaSettingsCopyWith<$Res> {
  __$ScyllaSettingsCopyWithImpl(this._self, this._then);

  final _ScyllaSettings _self;
  final $Res Function(_ScyllaSettings) _then;

/// Create a copy of ScyllaSettings
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? data_upload_disabled = null,Object? batch_upsert_time = null,Object? ratelimit_mode = null,Object? static_ratelimit_time = null,Object? socket_discard_percent = null,}) {
  return _then(_ScyllaSettings(
data_upload_disabled: null == data_upload_disabled ? _self.data_upload_disabled : data_upload_disabled // ignore: cast_nullable_to_non_nullable
as bool,batch_upsert_time: null == batch_upsert_time ? _self.batch_upsert_time : batch_upsert_time // ignore: cast_nullable_to_non_nullable
as int,ratelimit_mode: null == ratelimit_mode ? _self.ratelimit_mode : ratelimit_mode // ignore: cast_nullable_to_non_nullable
as int,static_ratelimit_time: null == static_ratelimit_time ? _self.static_ratelimit_time : static_ratelimit_time // ignore: cast_nullable_to_non_nullable
as int,socket_discard_percent: null == socket_discard_percent ? _self.socket_discard_percent : socket_discard_percent // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

// dart format on
