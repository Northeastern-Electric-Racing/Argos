import 'dart:async';
import 'dart:collection';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:syncfusion_flutter_charts/charts.dart';

import '../../connection/base_data.dart';
import '../../global_settings.dart';
import '../../services/datatype_service.dart';

class GraphLiveMgr extends ConsumerWidget {
  const GraphLiveMgr({super.key});

  @override
  Widget build(final BuildContext context, final WidgetRef ref) {
    final Duration liveGraphDur = ref.watch(liveGraphSettingsManagerProvider);
    final HashSet<PublicDataType> selectedItems = ref.watch(
      graphTopicsManagerProvider,
    );
    final Map<String, NetFieldCapture<(List<double>, DateTime)>>? allItems = ref
        .watch(capModelHolderProvider)
        .value;

    final List<NetFieldCapture<(List<double>, DateTime)>> itemsToDisplay =
        allItems?.values
            .where(
              (final NetFieldCapture<(List<double>, DateTime)> e) =>
                  selectedItems.contains(e.publicDataType),
            )
            .toList() ??
        <NetFieldCapture<(List<double>, DateTime)>>[];

    // Key on the selected topics + window so graph state only resets when the
    // user changes the selection or the duration -- NOT every time cap emits a
    // newly-discovered topic (a UniqueKey here wiped all accumulated live data
    // on each new topic). Selected topics that only just appeared in cap are
    // picked up reactively via GraphLive.didUpdateWidget instead.
    final List<String> selectedNames =
        selectedItems.map((final PublicDataType e) => e.name).toList()..sort();
    final String stateKey =
        '${selectedNames.join(',')}|${liveGraphDur.inSeconds}';

    return GraphLive(
      items: itemsToDisplay,
      liveGraphDur: liveGraphDur,
      key: ValueKey<String>(stateKey),
    );
  }
}

class GraphLive extends ConsumerStatefulWidget {
  final List<NetFieldCapture<(List<double>, DateTime)>> items;
  final Duration liveGraphDur;
  const GraphLive({required this.items, required this.liveGraphDur, super.key});

  @override
  ConsumerState<GraphLive> createState() => _GraphLiveState();
}

class _GraphLiveState extends ConsumerState<GraphLive> {
  /// render info keyed by `'<topic> <valueIndex>'`
  final Map<String, LiveGraphRenderInfo> info = <String, LiveGraphRenderInfo>{};

  /// live stream subscriptions keyed by topic
  final Map<String, StreamSubscription<(List<double>, DateTime)>> _subs =
      <String, StreamSubscription<(List<double>, DateTime)>>{};

  @override
  void initState() {
    super.initState();
    for (final NetFieldCapture<(List<double>, DateTime)> item in widget.items) {
      _subscribe(item);
    }
    // Bind the placeholder series (created below) to their named axes after the
    // first frame.
    _scheduleRelayout();
  }

  @override
  void didUpdateWidget(covariant final GraphLive oldWidget) {
    super.didUpdateWidget(oldWidget);
    // A selected topic may only just have appeared in cap (cap is populated
    // incrementally). Subscribe to any new ones without disturbing series that
    // are already accumulating data.
    bool addedTopic = false;
    for (final NetFieldCapture<(List<double>, DateTime)> item in widget.items) {
      if (!_subs.containsKey(item.topic)) {
        _subscribe(item);
        addedTopic = true;
      }
    }
    if (addedTopic) {
      _scheduleRelayout();
    }
  }

  /// Force one post-frame relayout so Syncfusion binds series to their named
  /// axes (the `yAxisName` association resolves on a second layout pass;
  /// without this a series stays invisible until a legend toggle).
  void _scheduleRelayout() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        setState(() {});
      }
    });
  }

  /// Subscribe to a topic's stream, creating render infos lazily when data
  /// arrives. The number of series for a topic depends on its value-list
  /// length, which is unknown until the first point is received -- so we must
  /// NOT decide it up front from `item.last` (null for topics that have not
  /// sent data yet, the cause of topics silently never rendering).
  void _subscribe(final NetFieldCapture<(List<double>, DateTime)> item) {
    // Seed a placeholder index-0 series so the topic shows in the legend even
    // before any data arrives. The listener below reuses this entry for the
    // first value and only the data path knows the true value-list arity.
    info.putIfAbsent(
      '${item.topic} 0',
      () => LiveGraphRenderInfo(item, 0, widget.liveGraphDur),
    );
    _subs[item.topic] = item.getStream().listen((
      final (List<double>, DateTime) point,
    ) {
      bool needsRelayout = false;
      for (int i = 0; i < point.$1.length; i++) {
        final String key = '${item.topic} $i';
        LiveGraphRenderInfo? ri = info[key];
        if (ri == null) {
          ri = LiveGraphRenderInfo(item, i, widget.liveGraphDur);
          info[key] = ri;
          needsRelayout = true; // brand-new series must be added to the chart
        }
        // The FIRST point for a series must also trigger a relayout: the axis
        // range/association is computed on layout, and a series whose
        // placeholder was laid out while empty would otherwise stay invisible
        // (live updateDataSource alone does not rebind a named axis). This is
        // why a single placeholder-backed topic needed a manual legend toggle.
        if (ri.data.isEmpty) {
          needsRelayout = true;
        }
        ri.addPoint(
          ChartData(point.$2, point.$1.elementAt(i)),
          widget.liveGraphDur,
        );
      }
      // Rebuild so new series are added, then relayout so they bind to their
      // axes. Once every series has data this path goes quiet and updates flow
      // through the series controller alone.
      if (needsRelayout && mounted) {
        setState(() {});
        _scheduleRelayout();
      }
    });
  }

  @override
  void dispose() {
    for (final StreamSubscription<(List<double>, DateTime)> sub
        in _subs.values) {
      unawaited(sub.cancel());
    }
    super.dispose();
  }

  /// gets all series
  List<LineSeries<ChartData, DateTime>> _fetchSeries() =>
      info.values.map((final LiveGraphRenderInfo e) => e.getSeries()).toList();

  /// gets all axes.  matches to above via topic name as the axis key
  List<ChartAxis> _fetchAxes() => info.values
      .map((final LiveGraphRenderInfo e) => e.getAxis())
      .nonNulls
      .toList();

  @override
  Widget build(final BuildContext context) => SfCartesianChart(
    primaryXAxis: DateTimeAxis(dateFormat: DateFormat.jms()),
    primaryYAxis: const NumericAxis(isVisible: false),
    legend: const Legend(isVisible: true, position: LegendPosition.bottom),
    series: _fetchSeries(),
    axes: _fetchAxes(),
  );
}

class ChartData {
  ChartData(this.x, this.y);
  final DateTime x;
  final double y;
}

class LiveGraphRenderInfo {
  final NetFieldCapture<(List<double>, DateTime)> item;
  final List<ChartData> data = <ChartData>[];
  final int index;
  final Duration windowLength;

  ChartSeriesController<ChartData, DateTime>? ctrlr;

  LiveGraphRenderInfo(this.item, this.index, this.windowLength);

  /// get the axes to render
  NumericAxis? getAxis() => index == 0
      ? NumericAxis(
          name: item.topic,
          labelFormat: '{value} ${item.unit}',
          title: AxisTitle(text: item.topic),
        )
      : null;

  /// get the axes, must resolve internally or add point will be useless
  LineSeries<ChartData, DateTime> getSeries() =>
      LineSeries<ChartData, DateTime>(
        onRendererCreated:
            (final ChartSeriesController<ChartData, DateTime> controller) {
              ctrlr = controller;
            },
        dataSource: data,
        name: '${item.topic} $index',
        yAxisName: item.topic,
        xValueMapper: (final ChartData data, final int index) => data.x,
        yValueMapper: (final ChartData data, final int index) => data.y,
      );

  /// add a point to the graph.  Only useful if ctrlr != null
  void addPoint(final ChartData point, final Duration windowLength) {
    data.add(point);
    if ((data.last.x.difference(data.first.x)) > windowLength) {
      data.removeAt(0);
      ctrlr?.updateDataSource(
        addedDataIndex: data.length - 1,
        removedDataIndex: 0,
      );
    } else {
      ctrlr?.updateDataSource(addedDataIndex: data.length - 1);
    }
  }
}
