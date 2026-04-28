import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import 'auth_service.dart';

class WeeklyCheckInResult {
  final String attemptId;
  final String motherUid;
  final int score;
  final String riskLevel;
  final DateTime attemptedAt;

  const WeeklyCheckInResult({
    required this.attemptId,
    required this.motherUid,
    required this.score,
    required this.riskLevel,
    required this.attemptedAt,
  });
}

class WeeklyCheckInAvailability {
  final bool canStart;
  final DateTime? lastSubmittedAt;
  final DateTime? nextAvailableAt;

  const WeeklyCheckInAvailability({
    required this.canStart,
    this.lastSubmittedAt,
    this.nextAvailableAt,
  });
}

class WeeklyCheckInService {
  WeeklyCheckInService._();

  static final WeeklyCheckInService instance = WeeklyCheckInService._();

  final FirebaseAuth _auth = FirebaseAuth.instance;
  static const Duration _backendTimeout = Duration(seconds: 20);
  static const int _checkInWindowDays = 7;

  static DateTime? nextAvailableAtFrom(DateTime? lastSubmittedAt) {
    if (lastSubmittedAt == null) return null;
    final local = lastSubmittedAt.toLocal();
    return DateTime(local.year, local.month, local.day + _checkInWindowDays);
  }

  Future<WeeklyCheckInAvailability> fetchAvailability() async {
    final payload = await _sendCheckInRequest(method: 'GET');
    final data = payload['availability'] is Map<String, dynamic>
        ? payload['availability'] as Map<String, dynamic>
        : <String, dynamic>{};
    return WeeklyCheckInAvailability(
      canStart: data['canStart'] == true,
      lastSubmittedAt: DateTime.tryParse(_readString(data['lastSubmittedAt'])),
      nextAvailableAt: DateTime.tryParse(_readString(data['nextAvailableAt'])),
    );
  }

  Future<WeeklyCheckInResult> submitCheckIn({
    required String language,
    required List<int> answers,
    required int score,
  }) async {
    final payload = await _sendCheckInRequest(
      method: 'POST',
      body: {
        'language': language,
        'answers': answers,
        'score': score,
      },
    );
    final data = payload['result'] is Map<String, dynamic>
        ? payload['result'] as Map<String, dynamic>
        : <String, dynamic>{};
    return WeeklyCheckInResult(
      attemptId: _readString(data['attemptId']),
      motherUid: _readString(data['motherUid']),
      score: int.tryParse('${data['score'] ?? 0}') ?? 0,
      riskLevel: _readString(data['riskLevel'], fallback: 'low'),
      attemptedAt: DateTime.tryParse(_readString(data['attemptedAt'])) ??
          DateTime.now(),
    );
  }

  Future<Map<String, dynamic>> _sendCheckInRequest({
    required String method,
    Map<String, dynamic>? body,
  }) async {
    final user = _auth.currentUser;
    if (user == null) throw const AppAuthException('Please sign in to continue.');
    final token = await user.getIdToken();
    if (token == null || token.trim().isEmpty) {
      throw const AppAuthException('Please sign in again to continue.');
    }

    try {
      final headers = {
        'Authorization': 'Bearer $token',
        'Accept': 'application/json',
        if (body != null) 'Content-Type': 'application/json',
      };
      final response = method == 'POST'
          ? await http
              .post(_checkInEndpoint(), headers: headers, body: jsonEncode(body))
              .timeout(_backendTimeout)
          : await http.get(_checkInEndpoint(), headers: headers).timeout(_backendTimeout);
      final payload = _decodeJson(response.body);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AppAuthException(payload['error'] as String? ?? 'Unable to load check-in.');
      }
      return payload;
    } on AppAuthException {
      rethrow;
    } on TimeoutException {
      throw const AppAuthException('The check-in request timed out.');
    } on SocketException {
      throw const AppAuthException('Unable to reach the check-in backend.');
    } on FormatException {
      throw const AppAuthException('The check-in backend returned an invalid response.');
    }
  }

  Uri _checkInEndpoint() {
    final baseUrl = AppConfig.backendBaseUrl.trim();
    if (baseUrl.isEmpty) {
      throw const AppAuthException('The mobile backend URL has not been configured.');
    }
    return Uri.parse('${baseUrl.replaceFirst(RegExp(r'/$'), '')}/api/mobile/check-in');
  }

  Map<String, dynamic> _decodeJson(String raw) {
    if (raw.trim().isEmpty) return <String, dynamic>{};
    final decoded = jsonDecode(raw);
    return decoded is Map<String, dynamic> ? decoded : <String, dynamic>{};
  }

  String _readString(dynamic value, {String fallback = ''}) {
    if (value == null) return fallback;
    final raw = '$value'.trim();
    return raw.isEmpty ? fallback : raw;
  }
}
