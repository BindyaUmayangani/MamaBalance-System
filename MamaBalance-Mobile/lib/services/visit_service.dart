import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import 'auth_service.dart';

class VisitService {
  VisitService._();
  static final VisitService instance = VisitService._();
  final FirebaseFirestore _db = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  Future<Map<String, dynamic>?> fetchSoonestMidwifeVisit(String _unusedMotherUid, String visitType) async {
    try {
      final motherDoc = await _resolveMotherDoc();
      final snapshot = await _db
          .collection('midwifeVisits')
          .where('motherUid', isEqualTo: motherDoc.id)
          .get();

      return _pickNextUpcoming(
        snapshot.docs
            .map((doc) => doc.data())
            .where((item) => '${item['visitType'] ?? ''}'.trim().toLowerCase() == visitType.toLowerCase())
            .toList(),
      );
    } catch (e) {
      print('Error fetching midwife visit: $e');
      return null;
    }
  }

  Future<Map<String, dynamic>?> fetchSoonestDoctorCheckup(String _unusedMotherUid) async {
    try {
      final motherDoc = await _resolveMotherDoc();
      final snapshot = await _db
          .collection('doctorCheckups')
          .where('motherUid', isEqualTo: motherDoc.id)
          .get();

      return _pickNextUpcoming(snapshot.docs.map((doc) => doc.data()).toList());
    } catch (e) {
      print('Error fetching doctor checkup: $e');
      return null;
    }
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

  DateTime? _readDate(dynamic value) {
    if (value == null) return null;
    if (value is Timestamp) return value.toDate();
    if (value is DateTime) return value;
    return DateTime.tryParse('$value');
  }

  Future<DocumentSnapshot<Map<String, dynamic>>> _resolveMotherDoc() async {
    final user = _auth.currentUser;
    if (user == null) {
      throw Exception('User not signed in');
    }

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

    throw Exception('Unable to find mother profile');
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

    return user.uid;
  }
}
