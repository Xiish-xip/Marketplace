import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class ApiService extends ChangeNotifier {
  // Change to your Express backend URL
  static const String _baseUrl = 'http://localhost:3000/api';
  final http.Client _client = http.Client();

  Future<Map<String, String>> _headers({String? token}) async {
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Future<dynamic> get(String endpoint, {String? token}) async {
    final response = await _client.get(
      Uri.parse('$_baseUrl$endpoint'),
      headers: await _headers(token: token),
    );
    return jsonDecode(response.body);
  }

  Future<dynamic> post(
    String endpoint,
    Map<String, dynamic> body, {
    String? token,
  }) async {
    final response = await _client.post(
      Uri.parse('$_baseUrl$endpoint'),
      headers: await _headers(token: token),
      body: jsonEncode(body),
    );
    return jsonDecode(response.body);
  }

  Future<dynamic> put(
    String endpoint,
    Map<String, dynamic> body, {
    String? token,
  }) async {
    final response = await _client.put(
      Uri.parse('$_baseUrl$endpoint'),
      headers: await _headers(token: token),
      body: jsonEncode(body),
    );
    return jsonDecode(response.body);
  }

  @override
  void dispose() {
    _client.close();
    super.dispose();
  }
}
