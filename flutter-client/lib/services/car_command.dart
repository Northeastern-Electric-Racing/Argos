import 'package:http/http.dart' as http;

/// Send a car config command to Scylla
/// Returns true if a failure occured
Future<bool> sendConfigCommand(
  final Uri uri,
  final String key,
  final List<double> values,
) async {
  final StringBuffer base = StringBuffer(
    '$uri/config/set/$key?data=${values.removeAt(0)}',
  );
  for (final double val in values) {
    base.write('&data=$val');
  }
  final http.Response response = await http.post(Uri.parse(base.toString()));
  return response.statusCode != 200;
}
