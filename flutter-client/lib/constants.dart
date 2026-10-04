const String BACKEND_URI_KEY = 'v1_BackendUri';
const String BACKEND_URI_DEFAULT = 'http://192.168.100.11:8000';
const String MQTT_URI_KEY = 'v1_MqttUri';
const String MQTT_URI_DEFAULT = 'mqtt://192.168.100.11:1883';
const String FAVORITE_TOPICS_KEY = 'v2_FavTopics';
const List<String> FAVORITE_TOPICS_DEFAULT = <String>[];

const String DASHBOARD_LIST_KEY = 'v1_DashboardList';
const String DASHBOARD_TOPICS_KEY_PREFIX = 'v1_Dash_Topics_';
const String DASHBOARD_AXIS_CNT_KEY_PREFIX = 'v1_Axis_Cnt_';

/// stored as int, number of seconds
const String LIVE_GRAPH_DURATION_KEY = 'v1_LiveGraphDur';
const int LIVE_GRAPH_DURATION_DEFAULT = 60;

const String RULE_CLIENTID_KEY = 'v1_RuleClientID';
const String RULE_DATA_KEY_PREFIX = 'v1_Rule_Data_';

/// Theme settings. Mode stores a `ThemeMode.name`; seed stores an ARGB int.
const String THEME_MODE_KEY = 'v1_ThemeMode';
const String THEME_MODE_DEFAULT = 'system';
const String THEME_SEED_KEY = 'v1_ThemeSeed';
const int THEME_SEED_DEFAULT = 0xFFEF4345; // NER red

/// Preset seed colors offered by the theme picker (ARGB ints).
const List<int> THEME_SEED_PRESETS = <int>[
  0xFFEF4345, // NER red (default)
  0xFF2196F3, // blue
  0xFF4CAF50, // green
  0xFF9C27B0, // purple
  0xFFFF9800, // orange
  0xFF009688, // teal
];

/// Topics scylla emits over the Socket.io `metadata` channel but never persists
/// to the DB, so they are absent from `GET /datatypes`. Seed them into the cap
/// map (socket mode only) so they appear in the topic hierarchy and the bottom
/// bar shows WAITING instead of NONE before the first value arrives.
const List<({String name, String unit})> VIRTUAL_DATATYPES =
    <({String name, String unit})>[
      (name: 'Argos/Viewers', unit: ''),
      (name: 'Argos/Message_Rate', unit: ''),
      // (name: 'Latency', unit: 'ms'), // defunct
    ];
