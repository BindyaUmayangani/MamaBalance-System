import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import '../models/mother_profile.dart';
import 'auth_service.dart';

class MotherProfileService {
  MotherProfileService._();

  static final MotherProfileService instance = MotherProfileService._();

  final FirebaseAuth _auth = FirebaseAuth.instance;
  static const Duration _backendTimeout = Duration(seconds: 20);

  Future<MotherProfile> fetchCurrentProfile() async {
    return _profileFromJson(await _sendProfileRequest(method: 'GET'));
  }

  Future<void> updateCurrentProfile(MotherProfile profile) async {
    await _sendProfileRequest(
      method: 'PATCH',
      body: {
        'fullName': profile.fullName.trim(),
        'personalEmail': profile.personalEmail.trim().toLowerCase(),
        'phoneNumber': AuthService.instance.normalizePhoneNumber(profile.phoneNumber),
        'birthdate': profile.birthdate.trim(),
        'address': profile.address.trim(),
        'guardianName': profile.guardianName.trim(),
        'guardianContact': profile.guardianContact.trim(),
        'deliveryDate': profile.deliveryDate.trim(),
        'noOfChildren': profile.noOfChildren,
      },
    );
  }

  Future<MotherProfile> uploadProfileImage(File imageFile) async {
    final bytes = await imageFile.readAsBytes();
    final extension = imageFile.path.split('.').last.toLowerCase();
    final mimeType = extension == 'png' ? 'image/png' : 'image/jpeg';
    final response = await _sendProfileRequest(
      method: 'PATCH',
      body: {
        'profileImageUrl': 'data:$mimeType;base64,${base64Encode(bytes)}',
        'profileImagePath': '',
      },
    );
    return _profileFromJson(response);
  }

  Future<Map<String, dynamic>> _sendProfileRequest({
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
      final response = method == 'PATCH'
          ? await http
              .patch(_profileEndpoint(), headers: headers, body: jsonEncode(body))
              .timeout(_backendTimeout)
          : await http.get(_profileEndpoint(), headers: headers).timeout(_backendTimeout);
      final payload = _decodeJson(response.body);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AppAuthException(payload['error'] as String? ?? 'Unable to load profile.');
      }
      return payload;
    } on AppAuthException {
      rethrow;
    } on TimeoutException {
      throw const AppAuthException('The profile request timed out.');
    } on SocketException {
      throw const AppAuthException('Unable to reach the profile backend.');
    } on FormatException {
      throw const AppAuthException('The profile backend returned an invalid response.');
    }
  }

  Uri _profileEndpoint() {
    final baseUrl = AppConfig.backendBaseUrl.trim();
    if (baseUrl.isEmpty) throw const AppAuthException('Backend URL is not configured.');
    return Uri.parse('${baseUrl.replaceFirst(RegExp(r'/$'), '')}/api/mobile/profile');
  }

  MotherProfile _profileFromJson(Map<String, dynamic> response) {
    final raw = response['profile'];
    final data = raw is Map<String, dynamic> ? raw : <String, dynamic>{};
    return MotherProfile(
      uid: _readString(data['uid']),
      fullName: _readString(data['fullName'], fallback: 'Mother'),
      loginEmail: _readString(data['loginEmail'], fallback: '-'),
      personalEmail: _readString(data['personalEmail'], fallback: '-'),
      phoneNumber: _readString(data['phoneNumber'], fallback: '-'),
      birthdate: _readString(data['birthdate'], fallback: '-'),
      address: _readString(data['address'], fallback: '-'),
      guardianName: _readString(data['guardianName'], fallback: '-'),
      guardianContact: _readString(data['guardianContact'], fallback: '-'),
      deliveryDate: _readString(data['deliveryDate'], fallback: '-'),
      noOfChildren: _readInt(data['noOfChildren']),
      profileImageUrl: _readString(data['profileImageUrl']),
      profileImagePath: _readString(data['profileImagePath']),
      assignedDoctorUid: _nullableString(data['assignedDoctorUid']),
      assignedMidwifeUid: _nullableString(data['assignedMidwifeUid']),
      assignedDoctorName: _readString(data['assignedDoctorName']),
      assignedDoctorPhoneNumber: _readString(data['assignedDoctorPhoneNumber']),
      assignedMidwifeName: _readString(data['assignedMidwifeName']),
      assignedMidwifePhoneNumber: _readString(data['assignedMidwifePhoneNumber']),
      latestEpdsScore: _readInt(data['latestEpdsScore']),
      latestEpdsDate: DateTime.tryParse(_readString(data['latestEpdsDate'])),
    );
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

  String? _nullableString(dynamic value) {
    final raw = _readString(value);
    return raw.isEmpty || raw == '-' ? null : raw;
  }

  int _readInt(dynamic value) {
    if (value is num) return value.toInt();
    return int.tryParse('${value ?? 0}') ?? 0;
  }
}
