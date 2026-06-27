// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'data_service.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$PublicData implements DiagnosticableTreeMixin {

 List<double> get values; int get time;
/// Create a copy of PublicData
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$PublicDataCopyWith<PublicData> get copyWith => _$PublicDataCopyWithImpl<PublicData>(this as PublicData, _$identity);

  /// Serializes this PublicData to a JSON map.
  Map<String, dynamic> toJson();

@override
void debugFillProperties(DiagnosticPropertiesBuilder properties) {
  properties
    ..add(DiagnosticsProperty('type', 'PublicData'))
    ..add(DiagnosticsProperty('values', values))..add(DiagnosticsProperty('time', time));
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is PublicData&&const DeepCollectionEquality().equals(other.values, values)&&(identical(other.time, time) || other.time == time));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(values),time);

@override
String toString({ DiagnosticLevel minLevel = DiagnosticLevel.info }) {
  return 'PublicData(values: $values, time: $time)';
}


}

/// @nodoc
abstract mixin class $PublicDataCopyWith<$Res>  {
  factory $PublicDataCopyWith(PublicData value, $Res Function(PublicData) _then) = _$PublicDataCopyWithImpl;
@useResult
$Res call({
 List<double> values, int time
});




}
/// @nodoc
class _$PublicDataCopyWithImpl<$Res>
    implements $PublicDataCopyWith<$Res> {
  _$PublicDataCopyWithImpl(this._self, this._then);

  final PublicData _self;
  final $Res Function(PublicData) _then;

/// Create a copy of PublicData
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? values = null,Object? time = null,}) {
  return _then(_self.copyWith(
values: null == values ? _self.values : values // ignore: cast_nullable_to_non_nullable
as List<double>,time: null == time ? _self.time : time // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [PublicData].
extension PublicDataPatterns on PublicData {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _PublicData value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _PublicData() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _PublicData value)  $default,){
final _that = this;
switch (_that) {
case _PublicData():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _PublicData value)?  $default,){
final _that = this;
switch (_that) {
case _PublicData() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( List<double> values,  int time)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _PublicData() when $default != null:
return $default(_that.values,_that.time);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( List<double> values,  int time)  $default,) {final _that = this;
switch (_that) {
case _PublicData():
return $default(_that.values,_that.time);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( List<double> values,  int time)?  $default,) {final _that = this;
switch (_that) {
case _PublicData() when $default != null:
return $default(_that.values,_that.time);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _PublicData with DiagnosticableTreeMixin implements PublicData {
  const _PublicData({required final  List<double> values, required this.time}): _values = values;
  factory _PublicData.fromJson(Map<String, dynamic> json) => _$PublicDataFromJson(json);

 final  List<double> _values;
@override List<double> get values {
  if (_values is EqualUnmodifiableListView) return _values;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_values);
}

@override final  int time;

/// Create a copy of PublicData
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$PublicDataCopyWith<_PublicData> get copyWith => __$PublicDataCopyWithImpl<_PublicData>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$PublicDataToJson(this, );
}
@override
void debugFillProperties(DiagnosticPropertiesBuilder properties) {
  properties
    ..add(DiagnosticsProperty('type', 'PublicData'))
    ..add(DiagnosticsProperty('values', values))..add(DiagnosticsProperty('time', time));
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _PublicData&&const DeepCollectionEquality().equals(other._values, _values)&&(identical(other.time, time) || other.time == time));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,const DeepCollectionEquality().hash(_values),time);

@override
String toString({ DiagnosticLevel minLevel = DiagnosticLevel.info }) {
  return 'PublicData(values: $values, time: $time)';
}


}

/// @nodoc
abstract mixin class _$PublicDataCopyWith<$Res> implements $PublicDataCopyWith<$Res> {
  factory _$PublicDataCopyWith(_PublicData value, $Res Function(_PublicData) _then) = __$PublicDataCopyWithImpl;
@override @useResult
$Res call({
 List<double> values, int time
});




}
/// @nodoc
class __$PublicDataCopyWithImpl<$Res>
    implements _$PublicDataCopyWith<$Res> {
  __$PublicDataCopyWithImpl(this._self, this._then);

  final _PublicData _self;
  final $Res Function(_PublicData) _then;

/// Create a copy of PublicData
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? values = null,Object? time = null,}) {
  return _then(_PublicData(
values: null == values ? _self._values : values // ignore: cast_nullable_to_non_nullable
as List<double>,time: null == time ? _self.time : time // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

// dart format on
