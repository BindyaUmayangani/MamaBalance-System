import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

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

  final FirebaseFirestore _db = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  Future<PrescriptionSummary> fetchCurrentMotherPrescriptions() async {
    final user = _auth.currentUser;
    if (user == null) {
      throw const AppAuthException('Please sign in to continue.');
    }

    final motherDoc = await _resolveMotherDoc(user);
    final snapshots = await Future.wait([
      _db
          .collection('careMedications')
          .where('motherUid', isEqualTo: motherDoc.id)
          .get(),
      _db
          .collection('medications')
          .where('motherUid', isEqualTo: motherDoc.id)
          .get(),
    ]);
    final docs = snapshots.expand((snapshot) => snapshot.docs).toList();
    final medications = docs.map((doc) {
      final data = doc.data();

      return PrescriptionMedication(
        id: doc.id,
        name: _readString(data['medicationName']) ??
            _readString(data['name']) ??
            'Medication',
        dosage: _formatDosage(data['dosage']),
        frequency: _readString(data['frequency']) ?? '-',
        startDate: _formatDate(data['startDate'] ?? data['createdAt']),
        endDate: _formatDate(data['endDate']),
        prescribedBy: _readString(data['prescribedBy']) ?? 'Doctor',
        status: _normalizeStatus(data['status']),
        notes: _readString(data['notes']) ?? '',
        instructions: _readString(data['instructions']) ?? '',
        reasonStopped: _readString(data['reasonStopped']) ?? '',
        updatedAt: _readDate(data['updatedAt'] ?? data['createdAt'] ?? data['startDate']) ??
            DateTime.fromMillisecondsSinceEpoch(0),
      );
    }).toList()
      ..sort((first, second) => second.updatedAt.compareTo(first.updatedAt));

    return PrescriptionSummary(
      activeMedications: medications.where((medication) => medication.isActive).toList(),
      medicationHistory: medications.where((medication) => !medication.isActive).toList(),
    );
  }

  Future<DocumentSnapshot<Map<String, dynamic>>> _resolveMotherDoc(User user) async {
    final directMotherDoc = await _db.collection('mothers').doc(user.uid).get();
    if (directMotherDoc.exists) {
      return directMotherDoc;
    }

    final canonicalUid = await _resolveCanonicalUserUid(user);
    final byUserUid = await _db
        .collection('mothers')
        .where('userUid', isEqualTo: canonicalUid)
        .limit(1)
        .get();
    if (byUserUid.docs.isNotEmpty) {
      return byUserUid.docs.first;
    }

    final normalizedPhone = AuthService.instance.normalizePhoneNumber(
      user.phoneNumber ?? '',
    );
    if (normalizedPhone.isNotEmpty) {
      final byPhone = await _db
          .collection('mothers')
          .where('phoneNumber', isEqualTo: normalizedPhone)
          .limit(1)
          .get();
      if (byPhone.docs.isNotEmpty) {
        return byPhone.docs.first;
      }
    }

    final email = user.email?.trim().toLowerCase() ?? '';
    if (email.isNotEmpty) {
      final byPersonalEmail = await _db
          .collection('mothers')
          .where('personalEmail', isEqualTo: email)
          .limit(1)
          .get();
      if (byPersonalEmail.docs.isNotEmpty) {
        return byPersonalEmail.docs.first;
      }
    }

    throw const AppAuthException('Unable to find your mother profile.');
  }

  Future<String> _resolveCanonicalUserUid(User user) async {
    final directUserDoc = await _db.collection('users').doc(user.uid).get();
    if (directUserDoc.exists) {
      return user.uid;
    }

    final normalizedPhone = AuthService.instance.normalizePhoneNumber(
      user.phoneNumber ?? '',
    );
    if (normalizedPhone.isNotEmpty) {
      final byPhone = await _db
          .collection('users')
          .where('phoneNumber', isEqualTo: normalizedPhone)
          .limit(1)
          .get();
      if (byPhone.docs.isNotEmpty) {
        return byPhone.docs.first.id;
      }
    }

    final email = user.email?.trim().toLowerCase() ?? '';
    if (email.isNotEmpty) {
      final byLoginEmail = await _db
          .collection('users')
          .where('email', isEqualTo: email)
          .limit(1)
          .get();
      if (byLoginEmail.docs.isNotEmpty) {
        return byLoginEmail.docs.first.id;
      }

      final byPersonalEmail = await _db
          .collection('users')
          .where('personalEmail', isEqualTo: email)
          .limit(1)
          .get();
      if (byPersonalEmail.docs.isNotEmpty) {
        return byPersonalEmail.docs.first.id;
      }
    }

    throw const AppAuthException('Unable to find your account details.');
  }

  String? _readString(dynamic value) {
    if (value == null) {
      return null;
    }

    final raw = '$value'.trim();
    return raw.isEmpty ? null : raw;
  }

  DateTime? _readDate(dynamic value) {
    if (value == null) {
      return null;
    }

    if (value is Timestamp) {
      return value.toDate();
    }

    if (value is DateTime) {
      return value;
    }

    return DateTime.tryParse('$value');
  }

  String _formatDate(dynamic value) {
    final date = _readDate(value);
    if (date == null) {
      return '-';
    }

    final day = date.day.toString().padLeft(2, '0');
    final month = date.month.toString().padLeft(2, '0');

    return '${date.year}-$month-$day';
  }

  String _formatDosage(dynamic value) {
    final raw = _readString(value);
    if (raw == null) {
      return '-';
    }

    return raw.replaceAll(RegExp('mg', caseSensitive: false), '').trim();
  }

  String _normalizeStatus(dynamic value) {
    final normalized = '${value ?? 'Active'}'.trim().toLowerCase();

    if (normalized == 'completed') {
      return 'Completed';
    }
    if (normalized == 'stopped') {
      return 'Stopped';
    }
    return 'Active';
  }
}
