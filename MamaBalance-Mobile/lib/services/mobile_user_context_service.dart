import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import '../models/app_session.dart';
import 'auth_service.dart';

class MobileLinkedMotherContext {
  final AppUserRole role;
  final User authUser;
  final Map<String, dynamic> userData;
  final Map<String, dynamic> motherData;
  final String userId;
  final String motherId;
  final Map<String, dynamic>? guardianLink;

  const MobileLinkedMotherContext({
    required this.role,
    required this.authUser,
    required this.userData,
    required this.motherData,
    required this.userId,
    required this.motherId,
    this.guardianLink,
  });
}

class MobileUserContextService {
  MobileUserContextService._();

  static final MobileUserContextService instance = MobileUserContextService._();

  final FirebaseAuth _auth = FirebaseAuth.instance;
  static const Duration _backendTimeout = Duration(seconds: 20);

  Future<MobileLinkedMotherContext> resolveCurrent() async {
    final user = _auth.currentUser;
    if (user == null) throw const AppAuthException('Please sign in to continue.');
    final payload = await _sendContextRequest();
    final context = payload['context'] is Map<String, dynamic>
        ? payload['context'] as Map<String, dynamic>
        : <String, dynamic>{};
    final userData = context['user'] is Map<String, dynamic>
        ? context['user'] as Map<String, dynamic>
        : <String, dynamic>{};
    final motherData = context['mother'] is Map<String, dynamic>
        ? context['mother'] as Map<String, dynamic>
        : <String, dynamic>{};
    return MobileLinkedMotherContext(
      role: AppUserRoleX.fromString(context['role']),
      authUser: user,
      userData: userData,
      motherData: motherData,
      userId: _readString(context['userId'], fallback: user.uid),
      motherId: _readString(context['motherId']),
      guardianLink: context['guardianLink'] is Map<String, dynamic>
          ? context['guardianLink'] as Map<String, dynamic>
          : null,
    );
  }

  Future<Map<String, dynamic>> _sendContextRequest() async {
    final user = _auth.currentUser;
    if (user == null) throw const AppAuthException('Please sign in to continue.');
    final token = await user.getIdToken();
    if (token == null || token.trim().isEmpty) {
      throw const AppAuthException('Please sign in again to continue.');
    }

    try {
      final response = await http.get(
        _contextEndpoint(),
        headers: {
          'Authorization': 'Bearer $token',
          'Accept': 'application/json',
        },
      ).timeout(_backendTimeout);
      final payload = _decodeJson(response.body);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AppAuthException(payload['error'] as String? ?? 'Unable to load account context.');
      }
      return payload;
    } on AppAuthException {
      rethrow;
    } on TimeoutException {
      throw const AppAuthException('The account context request timed out.');
    } on SocketException {
      throw const AppAuthException('Unable to reach the account context backend.');
    } on FormatException {
      throw const AppAuthException('The account context backend returned an invalid response.');
    }
  }

  Uri _contextEndpoint() {
    final baseUrl = AppConfig.backendBaseUrl.trim();
    if (baseUrl.isEmpty) {
      throw const AppAuthException('The mobile backend URL has not been configured.');
    }
    return Uri.parse('${baseUrl.replaceFirst(RegExp(r'/$'), '')}/api/mobile/context');
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
