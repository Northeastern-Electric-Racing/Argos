// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'rule_service.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$RuleBackup {

 int get version; String get clientId; List<Rule> get rules;
/// Create a copy of RuleBackup
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RuleBackupCopyWith<RuleBackup> get copyWith => _$RuleBackupCopyWithImpl<RuleBackup>(this as RuleBackup, _$identity);

  /// Serializes this RuleBackup to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is RuleBackup&&(identical(other.version, version) || other.version == version)&&(identical(other.clientId, clientId) || other.clientId == clientId)&&const DeepCollectionEquality().equals(other.rules, rules));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,version,clientId,const DeepCollectionEquality().hash(rules));

@override
String toString() {
  return 'RuleBackup(version: $version, clientId: $clientId, rules: $rules)';
}


}

/// @nodoc
abstract mixin class $RuleBackupCopyWith<$Res>  {
  factory $RuleBackupCopyWith(RuleBackup value, $Res Function(RuleBackup) _then) = _$RuleBackupCopyWithImpl;
@useResult
$Res call({
 int version, String clientId, List<Rule> rules
});




}
/// @nodoc
class _$RuleBackupCopyWithImpl<$Res>
    implements $RuleBackupCopyWith<$Res> {
  _$RuleBackupCopyWithImpl(this._self, this._then);

  final RuleBackup _self;
  final $Res Function(RuleBackup) _then;

/// Create a copy of RuleBackup
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? version = null,Object? clientId = null,Object? rules = null,}) {
  return _then(_self.copyWith(
version: null == version ? _self.version : version // ignore: cast_nullable_to_non_nullable
as int,clientId: null == clientId ? _self.clientId : clientId // ignore: cast_nullable_to_non_nullable
as String,rules: null == rules ? _self.rules : rules // ignore: cast_nullable_to_non_nullable
as List<Rule>,
  ));
}

}


/// Adds pattern-matching-related methods to [RuleBackup].
extension RuleBackupPatterns on RuleBackup {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _RuleBackup value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _RuleBackup() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _RuleBackup value)  $default,){
final _that = this;
switch (_that) {
case _RuleBackup():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _RuleBackup value)?  $default,){
final _that = this;
switch (_that) {
case _RuleBackup() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int version,  String clientId,  List<Rule> rules)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _RuleBackup() when $default != null:
return $default(_that.version,_that.clientId,_that.rules);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int version,  String clientId,  List<Rule> rules)  $default,) {final _that = this;
switch (_that) {
case _RuleBackup():
return $default(_that.version,_that.clientId,_that.rules);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int version,  String clientId,  List<Rule> rules)?  $default,) {final _that = this;
switch (_that) {
case _RuleBackup() when $default != null:
return $default(_that.version,_that.clientId,_that.rules);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _RuleBackup implements RuleBackup {
  const _RuleBackup({required this.version, required this.clientId, required final  List<Rule> rules}): _rules = rules;
  factory _RuleBackup.fromJson(Map<String, dynamic> json) => _$RuleBackupFromJson(json);

@override final  int version;
@override final  String clientId;
 final  List<Rule> _rules;
@override List<Rule> get rules {
  if (_rules is EqualUnmodifiableListView) return _rules;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_rules);
}


/// Create a copy of RuleBackup
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$RuleBackupCopyWith<_RuleBackup> get copyWith => __$RuleBackupCopyWithImpl<_RuleBackup>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$RuleBackupToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _RuleBackup&&(identical(other.version, version) || other.version == version)&&(identical(other.clientId, clientId) || other.clientId == clientId)&&const DeepCollectionEquality().equals(other._rules, _rules));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,version,clientId,const DeepCollectionEquality().hash(_rules));

@override
String toString() {
  return 'RuleBackup(version: $version, clientId: $clientId, rules: $rules)';
}


}

/// @nodoc
abstract mixin class _$RuleBackupCopyWith<$Res> implements $RuleBackupCopyWith<$Res> {
  factory _$RuleBackupCopyWith(_RuleBackup value, $Res Function(_RuleBackup) _then) = __$RuleBackupCopyWithImpl;
@override @useResult
$Res call({
 int version, String clientId, List<Rule> rules
});




}
/// @nodoc
class __$RuleBackupCopyWithImpl<$Res>
    implements _$RuleBackupCopyWith<$Res> {
  __$RuleBackupCopyWithImpl(this._self, this._then);

  final _RuleBackup _self;
  final $Res Function(_RuleBackup) _then;

/// Create a copy of RuleBackup
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? version = null,Object? clientId = null,Object? rules = null,}) {
  return _then(_RuleBackup(
version: null == version ? _self.version : version // ignore: cast_nullable_to_non_nullable
as int,clientId: null == clientId ? _self.clientId : clientId // ignore: cast_nullable_to_non_nullable
as String,rules: null == rules ? _self._rules : rules // ignore: cast_nullable_to_non_nullable
as List<Rule>,
  ));
}


}


/// @nodoc
mixin _$Rule {

 String get id; String get topic; int get debounce_time; String get expr;
/// Create a copy of Rule
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RuleCopyWith<Rule> get copyWith => _$RuleCopyWithImpl<Rule>(this as Rule, _$identity);

  /// Serializes this Rule to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Rule&&(identical(other.id, id) || other.id == id)&&(identical(other.topic, topic) || other.topic == topic)&&(identical(other.debounce_time, debounce_time) || other.debounce_time == debounce_time)&&(identical(other.expr, expr) || other.expr == expr));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,topic,debounce_time,expr);

@override
String toString() {
  return 'Rule(id: $id, topic: $topic, debounce_time: $debounce_time, expr: $expr)';
}


}

/// @nodoc
abstract mixin class $RuleCopyWith<$Res>  {
  factory $RuleCopyWith(Rule value, $Res Function(Rule) _then) = _$RuleCopyWithImpl;
@useResult
$Res call({
 String id, String topic, int debounce_time, String expr
});




}
/// @nodoc
class _$RuleCopyWithImpl<$Res>
    implements $RuleCopyWith<$Res> {
  _$RuleCopyWithImpl(this._self, this._then);

  final Rule _self;
  final $Res Function(Rule) _then;

/// Create a copy of Rule
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? topic = null,Object? debounce_time = null,Object? expr = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,topic: null == topic ? _self.topic : topic // ignore: cast_nullable_to_non_nullable
as String,debounce_time: null == debounce_time ? _self.debounce_time : debounce_time // ignore: cast_nullable_to_non_nullable
as int,expr: null == expr ? _self.expr : expr // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [Rule].
extension RulePatterns on Rule {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Rule value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Rule() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Rule value)  $default,){
final _that = this;
switch (_that) {
case _Rule():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Rule value)?  $default,){
final _that = this;
switch (_that) {
case _Rule() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String topic,  int debounce_time,  String expr)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Rule() when $default != null:
return $default(_that.id,_that.topic,_that.debounce_time,_that.expr);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String topic,  int debounce_time,  String expr)  $default,) {final _that = this;
switch (_that) {
case _Rule():
return $default(_that.id,_that.topic,_that.debounce_time,_that.expr);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String topic,  int debounce_time,  String expr)?  $default,) {final _that = this;
switch (_that) {
case _Rule() when $default != null:
return $default(_that.id,_that.topic,_that.debounce_time,_that.expr);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Rule implements Rule {
  const _Rule({required this.id, required this.topic, required this.debounce_time, required this.expr});
  factory _Rule.fromJson(Map<String, dynamic> json) => _$RuleFromJson(json);

@override final  String id;
@override final  String topic;
@override final  int debounce_time;
@override final  String expr;

/// Create a copy of Rule
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$RuleCopyWith<_Rule> get copyWith => __$RuleCopyWithImpl<_Rule>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$RuleToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Rule&&(identical(other.id, id) || other.id == id)&&(identical(other.topic, topic) || other.topic == topic)&&(identical(other.debounce_time, debounce_time) || other.debounce_time == debounce_time)&&(identical(other.expr, expr) || other.expr == expr));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,topic,debounce_time,expr);

@override
String toString() {
  return 'Rule(id: $id, topic: $topic, debounce_time: $debounce_time, expr: $expr)';
}


}

/// @nodoc
abstract mixin class _$RuleCopyWith<$Res> implements $RuleCopyWith<$Res> {
  factory _$RuleCopyWith(_Rule value, $Res Function(_Rule) _then) = __$RuleCopyWithImpl;
@override @useResult
$Res call({
 String id, String topic, int debounce_time, String expr
});




}
/// @nodoc
class __$RuleCopyWithImpl<$Res>
    implements _$RuleCopyWith<$Res> {
  __$RuleCopyWithImpl(this._self, this._then);

  final _Rule _self;
  final $Res Function(_Rule) _then;

/// Create a copy of Rule
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? topic = null,Object? debounce_time = null,Object? expr = null,}) {
  return _then(_Rule(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,topic: null == topic ? _self.topic : topic // ignore: cast_nullable_to_non_nullable
as String,debounce_time: null == debounce_time ? _self.debounce_time : debounce_time // ignore: cast_nullable_to_non_nullable
as int,expr: null == expr ? _self.expr : expr // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$RuleNotification {

 String get id; String get topic; List<double> get values; DateTime get time;
/// Create a copy of RuleNotification
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RuleNotificationCopyWith<RuleNotification> get copyWith => _$RuleNotificationCopyWithImpl<RuleNotification>(this as RuleNotification, _$identity);

  /// Serializes this RuleNotification to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is RuleNotification&&(identical(other.id, id) || other.id == id)&&(identical(other.topic, topic) || other.topic == topic)&&const DeepCollectionEquality().equals(other.values, values)&&(identical(other.time, time) || other.time == time));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,topic,const DeepCollectionEquality().hash(values),time);

@override
String toString() {
  return 'RuleNotification(id: $id, topic: $topic, values: $values, time: $time)';
}


}

/// @nodoc
abstract mixin class $RuleNotificationCopyWith<$Res>  {
  factory $RuleNotificationCopyWith(RuleNotification value, $Res Function(RuleNotification) _then) = _$RuleNotificationCopyWithImpl;
@useResult
$Res call({
 String id, String topic, List<double> values, DateTime time
});




}
/// @nodoc
class _$RuleNotificationCopyWithImpl<$Res>
    implements $RuleNotificationCopyWith<$Res> {
  _$RuleNotificationCopyWithImpl(this._self, this._then);

  final RuleNotification _self;
  final $Res Function(RuleNotification) _then;

/// Create a copy of RuleNotification
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? topic = null,Object? values = null,Object? time = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,topic: null == topic ? _self.topic : topic // ignore: cast_nullable_to_non_nullable
as String,values: null == values ? _self.values : values // ignore: cast_nullable_to_non_nullable
as List<double>,time: null == time ? _self.time : time // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}

}


/// Adds pattern-matching-related methods to [RuleNotification].
extension RuleNotificationPatterns on RuleNotification {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _RuleNotification value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _RuleNotification() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _RuleNotification value)  $default,){
final _that = this;
switch (_that) {
case _RuleNotification():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _RuleNotification value)?  $default,){
final _that = this;
switch (_that) {
case _RuleNotification() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String topic,  List<double> values,  DateTime time)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _RuleNotification() when $default != null:
return $default(_that.id,_that.topic,_that.values,_that.time);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String topic,  List<double> values,  DateTime time)  $default,) {final _that = this;
switch (_that) {
case _RuleNotification():
return $default(_that.id,_that.topic,_that.values,_that.time);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String topic,  List<double> values,  DateTime time)?  $default,) {final _that = this;
switch (_that) {
case _RuleNotification() when $default != null:
return $default(_that.id,_that.topic,_that.values,_that.time);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _RuleNotification implements RuleNotification {
  const _RuleNotification({required this.id, required this.topic, required final  List<double> values, required this.time}): _values = values;
  factory _RuleNotification.fromJson(Map<String, dynamic> json) => _$RuleNotificationFromJson(json);

@override final  String id;
@override final  String topic;
 final  List<double> _values;
@override List<double> get values {
  if (_values is EqualUnmodifiableListView) return _values;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_values);
}

@override final  DateTime time;

/// Create a copy of RuleNotification
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$RuleNotificationCopyWith<_RuleNotification> get copyWith => __$RuleNotificationCopyWithImpl<_RuleNotification>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$RuleNotificationToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _RuleNotification&&(identical(other.id, id) || other.id == id)&&(identical(other.topic, topic) || other.topic == topic)&&const DeepCollectionEquality().equals(other._values, _values)&&(identical(other.time, time) || other.time == time));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,topic,const DeepCollectionEquality().hash(_values),time);

@override
String toString() {
  return 'RuleNotification(id: $id, topic: $topic, values: $values, time: $time)';
}


}

/// @nodoc
abstract mixin class _$RuleNotificationCopyWith<$Res> implements $RuleNotificationCopyWith<$Res> {
  factory _$RuleNotificationCopyWith(_RuleNotification value, $Res Function(_RuleNotification) _then) = __$RuleNotificationCopyWithImpl;
@override @useResult
$Res call({
 String id, String topic, List<double> values, DateTime time
});




}
/// @nodoc
class __$RuleNotificationCopyWithImpl<$Res>
    implements _$RuleNotificationCopyWith<$Res> {
  __$RuleNotificationCopyWithImpl(this._self, this._then);

  final _RuleNotification _self;
  final $Res Function(_RuleNotification) _then;

/// Create a copy of RuleNotification
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? topic = null,Object? values = null,Object? time = null,}) {
  return _then(_RuleNotification(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,topic: null == topic ? _self.topic : topic // ignore: cast_nullable_to_non_nullable
as String,values: null == values ? _self._values : values // ignore: cast_nullable_to_non_nullable
as List<double>,time: null == time ? _self.time : time // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}


}

// dart format on
