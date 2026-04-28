import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import 'auth_service.dart';

class PrescriptionMedication {
  final String id;
  final String name;
  final String dosage;
  final String frequency;
  final String startDate;
  final String endDate;
  final String prescribedBy;
  final String status;
  final String notes;
  final String instructions;
  final String reasonStopped;
  final DateTime updatedAt;

  const PrescriptionMedication({
    required this.id,
    required this.name,
    required this.dosage,
    required this.frequency,
    required this.startDate,
    required this.endDate,
    required this.prescribedBy,
    required this.status,
    required this.notes,
    required this.instructions,
    required this.reasonStopped,
    required this.updatedAt,
  });

  bool get isActive => status.toLowerCase() == 'active';
}

class PrescriptionSummary {
  final List<PrescriptionMedication> activeMedications;
  final List<PrescriptionMedication> medicationHistory;

  const PrescriptionSummary({
    required this.activeMedications,
    required this.medicationHistory,
  });
}

class PrescriptionService {
  PrescriptionService._();

  static final PrescriptionService instance = PrescriptionService._();

  final FirebaseAuth _auth = FirebaseAuth.instance;
  static const Duration _backendTimeout = Duration(seconds: 20);

  Future<PrescriptionSummary> fetchCurrentMotherPrescriptions() async {
    final payload = await _sendCareRequest(type: 'prescriptions');
    final rawPrescriptions = payload['prescriptions'];
    final prescriptions = rawPrescriptions is Map<String, dynamic>
        ? rawPrescriptions
        : <String, dynamic>{};

    return PrescriptionSummary(
      activeMedications: _readMedicationList(prescriptions['activeMedications']),
      medicationHistory: _readMedicationList(prescriptions['medicationHistory']),
    );
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
          payload['error'] as String? ?? 'Unable to load prescriptions.',
        );
      }

      return payload;
    } on AppAuthException {
      rethrow;
    } on TimeoutException {
      throw const AppAuthException(
        'The prescriptions request timed out. Check the backend connection and try again.',
      );
    } on SocketException {
      throw const AppAuthException(
        'Unable to reach the care backend. Check your connection and try again.',
      );
    } on FormatException {
      throw const AppAuthException(
        'The care backend returned an invalid prescriptions response.',
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

  List<PrescriptionMedication> _readMedicationList(dynamic value) {
    final items = value is List ? value : const [];
    return items
        .whereType<Map<String, dynamic>>()
        .map(_medicationFromJson)
        .toList();
  }

  PrescriptionMedication _medicationFromJson(Map<String, dynamic> data) {
    return PrescriptionMedication(
      id: _readString(data['id']),
      name: _readString(data['name'], fallback: 'Medication'),
      dosage: _readString(data['dosage'], fallback: '-'),
      frequency: _readString(data['frequency'], fallback: '-'),
      startDate: _readString(data['startDate'], fallback: '-'),
      endDate: _readString(data['endDate'], fallback: '-'),
      prescribedBy: _readString(data['prescribedBy'], fallback: 'Doctor'),
      status: _readString(data['status'], fallback: 'Active'),
      notes: _readString(data['notes']),
      instructions: _readString(data['instructions']),
      reasonStopped: _readString(data['reasonStopped']),
      updatedAt: DateTime.tryParse(_readString(data['updatedAt'])) ??
          DateTime.fromMillisecondsSinceEpoch(0),
    );
  }

  Map<String, dynamic> _decodeJson(String raw) {
    if (raw.trim().isEmpty) {
      return <String, dynamic>{};
    }

    final decoded = jsonDecode(raw);
    return decoded is Map<String, dynamic> ? decoded : <String, dynamic>{};
  }

  String _readString(dynamic value, {String fallback = ''}) {
    if (value == null) return fallback;
    final raw = '$value'.trim();
    return raw.isEmpty ? fallback : raw;
  }
}
