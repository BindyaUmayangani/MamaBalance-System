import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import 'auth_service.dart';
import 'visit_service.dart';

class GuardianVisitSummary {
  final String label;
  final String subtitle;
  final DateTime? scheduledAt;
  final String staffRole;

  const GuardianVisitSummary({
    required this.label,
    required this.subtitle,
    required this.scheduledAt,
    required this.staffRole,
  });
}

class GuardianEmergencyContact {
  final String name;
  final String relationship;
  final String phoneNumber;

  const GuardianEmergencyContact({
    required this.name,
    required this.relationship,
    required this.phoneNumber,
  });
}

class GuardianStaffContact {
  final String name;
  final String phoneNumber;

  const GuardianStaffContact({
    required this.name,
    required this.phoneNumber,
  });
}

class GuardianDashboardData {
  final String guardianName;
  final String guardianPhoneNumber;
  final String motherName;
  final String motherPhoneNumber;
  final String motherAddress;
  final String motherBirthdate;
  final String motherDeliveryDate;
  final int motherNoOfChildren;
  final String motherProfileImageUrl;
  final String relationship;
  final DateTime? nextEpdsAssessmentDate;
  final GuardianStaffContact? doctor;
  final GuardianStaffContact midwife;
  final List<GuardianVisitSummary> visits;
  final List<GuardianEmergencyContact> emergencyContacts;

  const GuardianDashboardData({
    required this.guardianName,
    required this.guardianPhoneNumber,
    required this.motherName,
    required this.motherPhoneNumber,
    required this.motherAddress,
    required this.motherBirthdate,
    required this.motherDeliveryDate,
    required this.motherNoOfChildren,
    required this.motherProfileImageUrl,
    required this.relationship,
    required this.nextEpdsAssessmentDate,
    required this.doctor,
    required this.midwife,
    required this.visits,
    required this.emergencyContacts,
  });
}

class GuardianDashboardService {
  GuardianDashboardService._();

  static final GuardianDashboardService instance = GuardianDashboardService._();

  final FirebaseAuth _auth = FirebaseAuth.instance;
  static const Duration _backendTimeout = Duration(seconds: 20);

  Future<GuardianDashboardData> fetchDashboard() async {
    final payload = await _sendDashboardRequest();
    final data = payload['dashboard'] is Map<String, dynamic>
        ? payload['dashboard'] as Map<String, dynamic>
        : <String, dynamic>{};
    final visits = await Future.wait([
      _fetchSoonestMidwifeVisit('home'),
      _fetchSoonestMidwifeVisit('clinic'),
      _fetchSoonestDoctorCheckup(),
    ]);

    return GuardianDashboardData(
      guardianName: _readString(data['guardianName'], fallback: 'Guardian'),
      guardianPhoneNumber: _readString(data['guardianPhoneNumber'], fallback: '-'),
      motherName: _readString(data['motherName'], fallback: 'Mother'),
      motherPhoneNumber: _readString(data['motherPhoneNumber'], fallback: '-'),
      motherAddress: _readString(data['motherAddress'], fallback: '-'),
      motherBirthdate: _readString(data['motherBirthdate'], fallback: '-'),
      motherDeliveryDate: _readString(data['motherDeliveryDate'], fallback: '-'),
      motherNoOfChildren: int.tryParse('${data['motherNoOfChildren'] ?? 0}') ?? 0,
      motherProfileImageUrl: _readString(data['motherProfileImageUrl']),
      relationship: _readString(data['relationship'], fallback: 'Guardian'),
      nextEpdsAssessmentDate: DateTime.tryParse(_readString(data['nextEpdsAssessmentDate'])),
      doctor: _staffContact(data['doctor']),
      midwife: _staffContact(data['midwife']) ??
          const GuardianStaffContact(name: 'Assigned midwife', phoneNumber: '-'),
      visits: visits.whereType<GuardianVisitSummary>().toList(),
      emergencyContacts: _emergencyContacts(data['emergencyContacts']),
    );
  }

  Future<GuardianVisitSummary?> _fetchSoonestMidwifeVisit(String visitType) async {
    final data = await VisitService.instance.fetchSoonestMidwifeVisit('', visitType);
    if (data == null) return null;
    return GuardianVisitSummary(
      label: visitType == 'clinic' ? 'Clinic visit' : 'Home visit',
      subtitle: visitType == 'clinic'
          ? 'Planned follow-up at the clinic.'
          : 'Midwife support visit at home.',
      scheduledAt: DateTime.tryParse(_readString(data['scheduledAt'])),
      staffRole: 'Midwife',
    );
  }

  Future<GuardianVisitSummary?> _fetchSoonestDoctorCheckup() async {
    final data = await VisitService.instance.fetchSoonestDoctorCheckup('');
    if (data == null) return null;
    return GuardianVisitSummary(
      label: 'Doctor checkup',
      subtitle: 'Next scheduled clinical review.',
      scheduledAt: DateTime.tryParse(_readString(data['scheduledAt'])),
      staffRole: 'Doctor',
    );
  }

  Future<Map<String, dynamic>> _sendDashboardRequest() async {
    final user = _auth.currentUser;
    if (user == null) throw const AppAuthException('Please sign in to continue.');
    final token = await user.getIdToken();
    if (token == null || token.trim().isEmpty) {
      throw const AppAuthException('Please sign in again to continue.');
    }
    try {
      final response = await http.get(
        _dashboardEndpoint(),
        headers: {
          'Authorization': 'Bearer $token',
          'Accept': 'application/json',
        },
      ).timeout(_backendTimeout);
      final payload = _decodeJson(response.body);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AppAuthException(payload['error'] as String? ?? 'Unable to load guardian dashboard.');
      }
      return payload;
    } on AppAuthException {
      rethrow;
    } on TimeoutException {
      throw const AppAuthException('The guardian dashboard request timed out.');
    } on SocketException {
      throw const AppAuthException('Unable to reach the guardian dashboard backend.');
    } on FormatException {
      throw const AppAuthException('The guardian dashboard backend returned an invalid response.');
    }
  }

  Uri _dashboardEndpoint() {
    final baseUrl = AppConfig.backendBaseUrl.trim();
    if (baseUrl.isEmpty) {
      throw const AppAuthException('The mobile backend URL has not been configured.');
    }
    return Uri.parse('${baseUrl.replaceFirst(RegExp(r'/$'), '')}/api/mobile/guardian-dashboard');
  }

  GuardianStaffContact? _staffContact(dynamic value) {
    if (value is! Map<String, dynamic>) return null;
    return GuardianStaffContact(
      name: _readString(value['name'], fallback: 'Assigned staff'),
      phoneNumber: _readString(value['phoneNumber'], fallback: '-'),
    );
  }

  List<GuardianEmergencyContact> _emergencyContacts(dynamic value) {
    final items = value is List ? value : const [];
    return items.whereType<Map<String, dynamic>>().map((item) {
      return GuardianEmergencyContact(
        name: _readString(item['name'], fallback: 'Emergency contact'),
        relationship: _readString(item['relationship'], fallback: 'Support contact'),
        phoneNumber: _readString(item['phoneNumber'], fallback: '-'),
      );
    }).toList();
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
