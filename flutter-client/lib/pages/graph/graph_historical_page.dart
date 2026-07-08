import 'dart:collection';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:syncfusion_flutter_charts/charts.dart';

import '../../global_settings.dart';
import '../../services/data_service.dart';
import '../../services/datatype_service.dart';

class GraphHistorical extends ConsumerStatefulWidget {
  const GraphHistorical({super.key});

  @override
  ConsumerState<GraphHistorical> createState() => _GraphHistoricalState();
}

class _GraphHistoricalState extends ConsumerState<GraphHistorical> {
  final Map<String, HistoricalGraphRenderInfo> info =
      <String, HistoricalGraphRenderInfo>{};

  /// Whether the post-load relayout has been forced for the current data set.
  /// Reset whenever data is (re)loading so each new run/topic set relayouts
  /// once after its first paint.
  bool _relaidOut = false;

  List<XyDataSeries<PublicData, DateTime>> _fetchSeries() => info.values
      .map((final HistoricalGraphRenderInfo e) => e.getSeries())
      .toList();

  List<ChartAxis> _fetchAxes() => info.values
      .map((final HistoricalGraphRenderInfo e) => e.getAxis())
      .nonNulls
      .toList();

  @override
  Widget build(final BuildContext context) {
    final int runId = ref.watch(historicalGraphRunManagerProvider);
    final HashSet<PublicDataType> topics = ref.watch(
      graphTopicsManagerProvider,
    );
    final AsyncValue<Map<String, List<PublicData>>> data = ref.watch(
      getMultiDataWithRunIdProvider(topics: topics, runId: runId),
    );
    info.clear();
    switch (data) {
      case AsyncData<Map<String, List<PublicData>>>(
        :final Map<String, List<PublicData>> value,
      ):
        for (final MapEntry<String, List<PublicData>> entry in value.entries) {
          if (entry.value.isNotEmpty) {
            if (entry.value.first.values.length == 1) {
              info['${entry.key} 0'] = HistoricalGraphRenderInfo(
                entry.key,
                0,
                topics
                    .firstWhere((final PublicDataType e) => e.name == entry.key)
                    .unit,
                entry.value,
              );
            } else {
              for (int i = 0; i < entry.value.first.values.length; i++) {
                info['${entry.key} $i'] = HistoricalGraphRenderInfo(
                  entry.key,
                  i,
                  topics
                      .firstWhere(
                        (final PublicDataType e) => e.name == entry.key,
                      )
                      .unit,
                  entry.value,
                );
              }
            }
          }
        }
        // Syncfusion resolves a series' `yAxisName` -> named-axis association
        // on a second layout pass, so series bound to custom named axes are
        // invisible on the first frame until an interaction (e.g. a legend
        // toggle) forces a relayout. Force that relayout once per loaded data
        // set.
        if (!_relaidOut) {
          _relaidOut = true;
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) {
              setState(() {});
            }
          });
        }
        return SfCartesianChart(
          zoomPanBehavior: ZoomPanBehavior(
            enableSelectionZooming: true,
            enablePanning: true,
            enableMouseWheelZooming: true,
            enablePinching: true,
          ),
          legend: const Legend(
            isVisible: true,
            position: LegendPosition.bottom,
          ),
          trackballBehavior: TrackballBehavior(
            activationMode: ActivationMode.singleTap,
            enable: true,
            tooltipDisplayMode: TrackballDisplayMode.groupAllPoints,
            markerSettings: const TrackballMarkerSettings(
              markerVisibility: TrackballVisibilityMode.visible,
            ),
          ),
          primaryXAxis: DateTimeAxis(dateFormat: DateFormat.jms()),
          primaryYAxis: const NumericAxis(isVisible: false),
          axes: _fetchAxes(),
          series: _fetchSeries(),
        );
      case AsyncError<Object?>(:final Object? error):
        _relaidOut = false;
        return ErrorViewer(error: error, topics: topics, runId: runId);
      default:
        _relaidOut = false;
        return const Center(child: CircularProgressIndicator());
    }
  }
}

class ErrorViewer extends ConsumerWidget {
  final Object? error;
  final HashSet<PublicDataType> topics;
  final int runId;
  const ErrorViewer({
    required this.error,
    required this.topics,
    required this.runId,
    super.key,
  });

  @override
  Widget build(final BuildContext context, final WidgetRef ref) => Column(
    mainAxisAlignment: MainAxisAlignment.center,
    children: <Widget>[
      Text('Error: $error'),
      ElevatedButton(
        onPressed: () {
          ref.invalidate(
            getMultiDataWithRunIdProvider(topics: topics, runId: runId),
          );
        },
        child: const Text('Retry'),
      ),
    ],
  );
}

class HistoricalGraphRenderInfo {
  final String topic;
  final int index;
  final String unit;
  final List<PublicData> data;

  HistoricalGraphRenderInfo(this.topic, this.index, this.unit, this.data);

  XyDataSeries<PublicData, DateTime> getSeries() =>
      LineSeries<PublicData, DateTime>(
        name: '$topic $index',
        dataSource: data,
        yAxisName: topic,
        xValueMapper: (final PublicData data, final int index) =>
            DateTime.fromMillisecondsSinceEpoch(data.time),
        yValueMapper: (final PublicData data, final int index) =>
            data.values.elementAt(this.index),
      );

  ChartAxis? getAxis() => index == 0
      ? NumericAxis(
          name: topic,
          labelFormat: '{value} $unit',
          title: AxisTitle(text: topic),
        )
      : null;
}
