import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import 'auth_service.dart';

class VisitService {
  VisitService._();

  static final VisitService instance = VisitService._();

  final FirebaseAuth _auth = FirebaseAuth.instance;
  static const Duration _backendTimeout = Duration(seconds: 20);

  Future<Map<String, dynamic>?> fetchSoonestMidwifeVisit(
    String _unusedMotherUid,
    String visitType,
  ) async {
    final visits = await _fetchVisits();
    final normalizedType = visitType.trim().toLowerCase();

    if (normalizedType == 'home') {
      return visits['homeVisit'];
    }
    if (normalizedType == 'clinic') {
      return visits['clinicVisit'];
    }

    return null;
  }

  Future<Map<String, dynamic>?> fetchSoonestDoctorCheckup(
    String _unusedMotherUid,
  ) async {
    final visits = await _fetchVisits();
    return visits['doctorCheckup'];
  }

  Future<Map<String, Map<String, dynamic>?>> _fetchVisits() async {
    try {
      final payload = await _sendCareRequest(type: 'visits');
      final rawVisits = payload['visits'];
      final visits = rawVisits is Map<String, dynamic>
          ? rawVisits
          : <String, dynamic>{};

      return {
        'homeVisit': _readMap(visits['homeVisit']),
        'clinicVisit': _readMap(visits['clinicVisit']),
        'doctorCheckup': _readMap(visits['doctorCheckup']),
      };
    } catch (error) {
      // Keep the home screen resilient if care scheduling is temporarily unavailable.
      return {
        'homeVisit': null,
        'clinicVisit': null,
        'doctorCheckup': null,
      };
    }
  }

  Future<Map<String, dynamic>> _sendCareRequest({required String type}) async {
    final user = _auth.currentUser;
    if (user == null) {
      throw const AppAuthException('Please sign in to continue.');
    }

    final token = await user.getIdToken();
    if (token == null || token.trim().isEmpty) {
      throw const AppAuthException('Please sign in again to continue.');
    }

    final uri = _careEndpoint({'type': type});
    final headers = <String, String>{
      'Authorization': 'Bearer $token',
      'Accept': 'application/json',
    };

    try {
      final response = await http.get(uri, headers: headers).timeout(_backendTimeout);
      final payload = _decodeJson(response.body);

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AppAuthException(
          payload['error'] as String? ?? 'Unable to load visits.',
        );
      }

      return payload;
    } on AppAuthException {
      rethrow;
    } on TimeoutException {
      throw const AppAuthException(
        'The visits request timed out. Check the backend connection and try again.',
      );
    } on SocketException {
      throw const AppAuthException(
        'Unable to reach the care backend. Check your connection and try again.',
      );
    } on FormatException {
      throw const AppAuthException(
        'The care backend returned an invalid visits response.',
      );
    }
  }

  Uri _careEndpoint(Map<String, String> queryParameters) {
    final baseUrl = AppConfig.backendBaseUrl.trim();
    if (baseUrl.isEmpty) {
      throw const AppAuthException('The mobile backend URL has not been configured.');
    }

    return Uri.parse(
      '${baseUrl.replaceFirst(RegExp(r'/$'), '')}/api/mobile/care',
    ).replace(queryParameters: queryParameters);
  }

  Map<String, dynamic>? _readMap(dynamic value) {
    return value is Map<String, dynamic> ? value : null;
  }

  Map<String, dynamic> _decodeJson(String raw) {
    if (raw.trim().isEmpty) {
      return <String, dynamic>{};
    }

    final decoded = jsonDecode(raw);
    return decoded is Map<String, dynamic> ? decoded : <String, dynamic>{};
  }
}
