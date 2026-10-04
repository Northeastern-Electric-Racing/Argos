// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'global_settings.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(ConnectionControl)
final connectionControlProvider = ConnectionControlProvider._();

final class ConnectionControlProvider
    extends $NotifierProvider<ConnectionControl, ConnectionProps> {
  ConnectionControlProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'connectionControlProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$connectionControlHash();

  @$internal
  @override
  ConnectionControl create() => ConnectionControl();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ConnectionProps value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ConnectionProps>(value),
    );
  }
}

String _$connectionControlHash() => r'00fde8d27b1e4a0380309d5029e25d687a1299ef';

abstract class _$ConnectionControl extends $Notifier<ConnectionProps> {
  ConnectionProps build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<ConnectionProps, ConnectionProps>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<ConnectionProps, ConnectionProps>,
              ConnectionProps,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}

@ProviderFor(FavoriteTopicsManager)
final favoriteTopicsManagerProvider = FavoriteTopicsManagerProvider._();

final class FavoriteTopicsManagerProvider
    extends $NotifierProvider<FavoriteTopicsManager, HashSet<PublicDataType>> {
  FavoriteTopicsManagerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'favoriteTopicsManagerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$favoriteTopicsManagerHash();

  @$internal
  @override
  FavoriteTopicsManager create() => FavoriteTopicsManager();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HashSet<PublicDataType> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HashSet<PublicDataType>>(value),
    );
  }
}

String _$favoriteTopicsManagerHash() =>
    r'4f8381b94914a6f253c73797c5a0b9f5f52e19c6';

abstract class _$FavoriteTopicsManager
    extends $Notifier<HashSet<PublicDataType>> {
  HashSet<PublicDataType> build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref as $Ref<HashSet<PublicDataType>, HashSet<PublicDataType>>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<HashSet<PublicDataType>, HashSet<PublicDataType>>,
              HashSet<PublicDataType>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}

@ProviderFor(GraphTopicsManager)
final graphTopicsManagerProvider = GraphTopicsManagerProvider._();

final class GraphTopicsManagerProvider
    extends $NotifierProvider<GraphTopicsManager, HashSet<PublicDataType>> {
  GraphTopicsManagerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'graphTopicsManagerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$graphTopicsManagerHash();

  @$internal
  @override
  GraphTopicsManager create() => GraphTopicsManager();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HashSet<PublicDataType> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HashSet<PublicDataType>>(value),
    );
  }
}

String _$graphTopicsManagerHash() =>
    r'7a418f8c898e5b2e33d4caffb9f5a5e24ec414ae';

abstract class _$GraphTopicsManager extends $Notifier<HashSet<PublicDataType>> {
  HashSet<PublicDataType> build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref as $Ref<HashSet<PublicDataType>, HashSet<PublicDataType>>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<HashSet<PublicDataType>, HashSet<PublicDataType>>,
              HashSet<PublicDataType>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}

@ProviderFor(HistoricalGraphRunManager)
final historicalGraphRunManagerProvider = HistoricalGraphRunManagerProvider._();

final class HistoricalGraphRunManagerProvider
    extends $NotifierProvider<HistoricalGraphRunManager, int> {
  HistoricalGraphRunManagerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'historicalGraphRunManagerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$historicalGraphRunManagerHash();

  @$internal
  @override
  HistoricalGraphRunManager create() => HistoricalGraphRunManager();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(int value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<int>(value),
    );
  }
}

String _$historicalGraphRunManagerHash() =>
    r'ca6c6a0eb5838808b4bc616bc8eeb0484a0a7d2f';

abstract class _$HistoricalGraphRunManager extends $Notifier<int> {
  int build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<int, int>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<int, int>,
              int,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}

/// Get a shared preferences instance

@ProviderFor(sharedPrefsInstance)
final sharedPrefsInstanceProvider = SharedPrefsInstanceProvider._();

/// Get a shared preferences instance

final class SharedPrefsInstanceProvider
    extends
        $FunctionalProvider<
          AsyncValue<SharedPreferences>,
          SharedPreferences,
          FutureOr<SharedPreferences>
        >
    with
        $FutureModifier<SharedPreferences>,
        $FutureProvider<SharedPreferences> {
  /// Get a shared preferences instance
  SharedPrefsInstanceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'sharedPrefsInstanceProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$sharedPrefsInstanceHash();

  @$internal
  @override
  $FutureProviderElement<SharedPreferences> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<SharedPreferences> create(Ref ref) {
    return sharedPrefsInstance(ref);
  }
}

String _$sharedPrefsInstanceHash() =>
    r'8e004f7ec12c5daa17c051363822dbc49fe844ac';

@ProviderFor(LiveGraphSettingsManager)
final liveGraphSettingsManagerProvider = LiveGraphSettingsManagerProvider._();

final class LiveGraphSettingsManagerProvider
    extends $NotifierProvider<LiveGraphSettingsManager, Duration> {
  LiveGraphSettingsManagerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'liveGraphSettingsManagerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$liveGraphSettingsManagerHash();

  @$internal
  @override
  LiveGraphSettingsManager create() => LiveGraphSettingsManager();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(Duration value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<Duration>(value),
    );
  }
}

String _$liveGraphSettingsManagerHash() =>
    r'245cf0a896df07bf2e5315da4893fbd2df719d28';

abstract class _$LiveGraphSettingsManager extends $Notifier<Duration> {
  Duration build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<Duration, Duration>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<Duration, Duration>,
              Duration,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}

@ProviderFor(ThemeSettingsManager)
final themeSettingsManagerProvider = ThemeSettingsManagerProvider._();

final class ThemeSettingsManagerProvider
    extends $NotifierProvider<ThemeSettingsManager, ThemeSettings> {
  ThemeSettingsManagerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'themeSettingsManagerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$themeSettingsManagerHash();

  @$internal
  @override
  ThemeSettingsManager create() => ThemeSettingsManager();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ThemeSettings value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ThemeSettings>(value),
    );
  }
}

String _$themeSettingsManagerHash() =>
    r'6f17094a84aa44f90c9709ec3e246ed38b392364';

abstract class _$ThemeSettingsManager extends $Notifier<ThemeSettings> {
  ThemeSettings build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<ThemeSettings, ThemeSettings>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<ThemeSettings, ThemeSettings>,
              ThemeSettings,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
