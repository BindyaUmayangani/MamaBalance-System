import 'package:cloud_firestore/cloud_firestore.dart';

import 'mobile_user_context_service.dart';
import 'weekly_checkin_service.dart';

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

  final FirebaseFirestore _db = FirebaseFirestore.instance;
  final MobileUserContextService _contextService =
      MobileUserContextService.instance;

  Future<GuardianDashboardData> fetchDashboard() async {
    final context = await _contextService.resolveCurrent();
    final guardianUserDoc = context.userDoc;
    final guardianData = guardianUserDoc.data() ?? <String, dynamic>{};
    final motherDoc = context.motherDoc;
    final motherData = motherDoc.data() ?? <String, dynamic>{};

    final doctorUid = '${motherData['assignedDoctorUid'] ?? ''}'.trim();
    final midwifeUid = '${motherData['assignedMidwifeUid'] ?? ''}'.trim();
    final staffAssignments = await _resolveStaffAssignments(
      doctorUid: doctorUid,
      midwifeUid: midwifeUid,
    );

    final visits = await Future.wait([
      _fetchSoonestMidwifeVisit(motherDoc.id, 'home'),
      _fetchSoonestMidwifeVisit(motherDoc.id, 'clinic'),
      _fetchSoonestDoctorCheckup(motherDoc.id),
    ]);

    final emergencyContacts = _readEmergencyContacts(motherData['emergencyContacts']);

    return GuardianDashboardData(
      guardianName: _readString(guardianData['displayName']) ??
          _readString(guardianData['fullName']) ??
          context.authUser.displayName ??
          'Guardian',
      guardianPhoneNumber: _readString(guardianData['phoneNumber']) ??
          _readString(context.authUser.phoneNumber) ??
          '-',
      motherName: _readString(motherData['fullName']) ?? 'Mother',
      motherPhoneNumber: _readString(motherData['phoneNumber']) ?? '-',
      motherAddress: _readString(motherData['address']) ?? '-',
      motherBirthdate: _readString(motherData['birthdate']) ?? '-',
      motherDeliveryDate: _readString(motherData['deliveryDate']) ?? '-',
      motherNoOfChildren: _readInt(motherData['noOfChildren']),
      motherProfileImageUrl: _readString(motherData['profileImage']) ?? '',
      relationship:
          _readString(context.guardianLink?['relationship']) ?? 'Guardian',
      nextEpdsAssessmentDate: _nextEpdsAssessmentDate(motherData),
      doctor: staffAssignments.doctor,
      midwife: staffAssignments.midwife,
      visits: visits.whereType<GuardianVisitSummary>().toList(),
      emergencyContacts: emergencyContacts,
    );
  }

  Future<GuardianVisitSummary?> _fetchSoonestMidwifeVisit(
    String motherUid,
    String visitType,
  ) async {
    final snapshot = await _db
        .collection('midwifeVisits')
        .where('motherUid', isEqualTo: motherUid)
        .get();

    final data = _pickNextUpcoming(
      snapshot.docs
          .map((doc) => doc.data())
          .where((item) =>
              '${item['visitType'] ?? ''}'.trim().toLowerCase() ==
              visitType.toLowerCase())
          .toList(),
    );

    if (data == null) {
      return null;
    }

    return GuardianVisitSummary(
      label: visitType == 'clinic' ? 'Clinic visit' : 'Home visit',
      subtitle: visitType == 'clinic'
          ? 'Planned follow-up at the clinic.'
          : 'Midwife support visit at home.',
      scheduledAt: _readDate(data['scheduledAt']),
      staffRole: 'Midwife',
    );
  }

  Future<GuardianVisitSummary?> _fetchSoonestDoctorCheckup(String motherUid) async {
    final snapshot = await _db
        .collection('doctorCheckups')
        .where('motherUid', isEqualTo: motherUid)
        .get();

    final data = _pickNextUpcoming(snapshot.docs.map((doc) => doc.data()).toList());
    if (data == null) {
      return null;
    }

    return GuardianVisitSummary(
      label: 'Doctor checkup',
      subtitle: 'Next scheduled clinical review.',
      scheduledAt: _readDate(data['scheduledAt']),
      staffRole: 'Doctor',
    );
  }

  Map<String, dynamic>? _pickNextUpcoming(List<Map<String, dynamic>> items) {
    final now = DateTime.now();
    Map<String, dynamic>? bestItem;
    DateTime? bestDate;

    for (final item in items) {
      final status = '${item['status'] ?? ''}'.trim().toLowerCase();
      if (status == 'completed' || status == 'cancelled') {
        continue;
      }

      final scheduledAt = _readDate(item['scheduledAt']);
      if (scheduledAt == null || scheduledAt.isBefore(now)) {
        continue;
      }

      if (bestDate == null || scheduledAt.isBefore(bestDate)) {
        bestDate = scheduledAt;
        bestItem = item;
      }
    }

    return bestItem;
  }

  Future<_GuardianStaffAssignments> _resolveStaffAssignments({
    required String doctorUid,
    required String midwifeUid,
  }) async {
    final staffDocs = await Future.wait([
      _fetchStaffDoc(doctorUid),
      _fetchStaffDoc(midwifeUid),
    ]);

    return _GuardianStaffAssignments(
      doctor: _buildStaffContact(
        data: staffDocs[0],
        fallbackName: 'Assigned doctor',
      ),
      midwife: _buildStaffContact(
        data: staffDocs[1],
        fallbackName: 'Assigned midwife',
      ) ??
          const GuardianStaffContact(
            name: 'Assigned midwife',
            phoneNumber: '-',
          ),
    );
  }

  Future<Map<String, dynamic>?> _fetchStaffDoc(String staffUid) async {
    if (staffUid.isEmpty) {
      return null;
    }

    try {
      final staffDoc = await _db.collection('users').doc(staffUid).get();
      return staffDoc.data();
    } catch (_) {
      return null;
    }
  }

  GuardianStaffContact? _buildStaffContact({
    required Map<String, dynamic>? data,
    required String fallbackName,
  }) {
    if (data == null) {
      return null;
    }

    return GuardianStaffContact(
      name: _readString(data['displayName']) ??
          _readString(data['fullName']) ??
          fallbackName,
      phoneNumber: _readString(data['phoneNumber']) ?? '-',
    );
  }

  List<GuardianEmergencyContact> _readEmergencyContacts(dynamic value) {
    if (value is! Iterable) {
      return const [];
    }

    return value
        .whereType<Map>()
        .map(
          (item) => GuardianEmergencyContact(
            name: _readString(item['name']) ?? 'Emergency contact',
            relationship: _readString(item['relationship']) ?? 'Support contact',
            phoneNumber: _readString(item['phoneNumber']) ?? '-',
          ),
        )
        .toList();
  }

  DateTime? _readDate(dynamic value) {
    if (value == null) return null;
    if (value is Timestamp) return value.toDate();
    if (value is DateTime) return value;
    return DateTime.tryParse('$value');
  }

  DateTime? _nextEpdsAssessmentDate(Map<String, dynamic> motherData) {
    final latestSubmittedAt = _readDate(motherData['latestEpdsSubmittedAt']);
    return WeeklyCheckInService.nextAvailableAtFrom(latestSubmittedAt);
  }

  String? _readString(dynamic value) {
    if (value == null) return null;
    final raw = '$value'.trim();
    return raw.isEmpty ? null : raw;
  }

  int _readInt(dynamic value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse('$value') ?? 0;
  }
}

class _GuardianStaffAssignments {
  final GuardianStaffContact? doctor;
  final GuardianStaffContact midwife;

  const _GuardianStaffAssignments({
    required this.doctor,
    required this.midwife,
  });
}
