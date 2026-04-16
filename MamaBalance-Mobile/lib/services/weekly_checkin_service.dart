import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

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

  final FirebaseFirestore _db = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;
  static const Duration _checkInWindow = Duration(days: 7);

  Future<WeeklyCheckInAvailability> fetchAvailability() async {
    final user = _auth.currentUser;
    if (user == null) {
      throw const AppAuthException('Please sign in to continue.');
    }

    final motherSnapshot = await _resolveMotherDoc(user);
    final motherData = motherSnapshot.data() ?? <String, dynamic>{};
    final lastSubmittedAt = _readSubmittedAt(motherData['latestEpdsSubmittedAt']);
    final nextAvailableAt = lastSubmittedAt?.add(_checkInWindow);
    final now = DateTime.now().toUtc();

    return WeeklyCheckInAvailability(
      canStart: nextAvailableAt == null || !nextAvailableAt.isAfter(now),
      lastSubmittedAt: lastSubmittedAt,
      nextAvailableAt: nextAvailableAt,
    );
  }

  Future<WeeklyCheckInResult> submitCheckIn({
    required String language,
    required List<int> answers,
    required int score,
  }) async {
    final user = _auth.currentUser;
    if (user == null) {
      throw const AppAuthException('Please sign in to continue.');
    }

    final motherSnapshot = await _resolveMotherDoc(user);
    final motherUid = motherSnapshot.id;
    final motherRef = motherSnapshot.reference;

    final motherData = motherSnapshot.data() ?? <String, dynamic>{};
    _ensureCheckInUnlocked(_readSubmittedAt(motherData['latestEpdsSubmittedAt']));
    final riskLevel = _resolveRiskLevel(score);
    final attemptedAt = DateTime.now().toUtc();
    final attemptRef = motherRef.collection('epdsAttempts').doc();

    await _db.runTransaction((transaction) async {
      final freshMotherSnapshot = await transaction.get(motherRef);
      final freshMotherData = freshMotherSnapshot.data() ?? <String, dynamic>{};
      _ensureCheckInUnlocked(_readSubmittedAt(freshMotherData['latestEpdsSubmittedAt']));

      transaction.set(attemptRef, {
        'motherUid': motherUid,
        'answers': answers,
        'language': language,
        'score': score,
        'riskLevel': riskLevel,
        'attemptedAt': Timestamp.fromDate(attemptedAt),
        'createdAt': FieldValue.serverTimestamp(),
      });

      transaction.set(
        motherRef,
        {
          'latestEpdsScore': score,
          'latestEpdsAttemptId': attemptRef.id,
          'latestEpdsLanguage': language,
          'latestEpdsSubmittedAt': Timestamp.fromDate(attemptedAt),
          'riskLevel': riskLevel,
          'isHighRisk': riskLevel == 'high',
          'updatedAt': FieldValue.serverTimestamp(),
        },
        SetOptions(merge: true),
      );
    });

    final assignedMidwifeUid = '${motherData['assignedMidwifeUid'] ?? ''}'.trim();
    if (riskLevel == 'high' && assignedMidwifeUid.isNotEmpty) {
      await _createHighRiskNotification(
        assignedMidwifeUid: assignedMidwifeUid,
        motherUid: motherUid,
        motherData: motherData,
        score: score,
        attemptedAt: attemptedAt,
        attemptId: attemptRef.id,
      );
    }

    return WeeklyCheckInResult(
      attemptId: attemptRef.id,
      motherUid: motherUid,
      score: score,
      riskLevel: riskLevel,
      attemptedAt: attemptedAt,
    );
  }

  void _ensureCheckInUnlocked(DateTime? lastSubmittedAt) {
    if (lastSubmittedAt == null) return;

    final nextAvailableAt = lastSubmittedAt.add(_checkInWindow);
    final now = DateTime.now().toUtc();

    if (nextAvailableAt.isAfter(now)) {
      final local = nextAvailableAt.toLocal();
      final day = local.day.toString().padLeft(2, '0');
      final month = _monthName(local.month);
      final year = local.year;
      throw AppAuthException(
        'You can complete your next weekly check-in after $day $month $year.',
      );
    }
  }

  DateTime? _readSubmittedAt(dynamic value) {
    if (value == null) return null;
    if (value is Timestamp) return value.toDate().toUtc();
    if (value is DateTime) return value.toUtc();
    if (value is String) return DateTime.tryParse(value)?.toUtc();
    return null;
  }

  String _monthName(int month) {
    const months = [
      '',
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return months[month];
  }

  String _resolveRiskLevel(int score) {
    if (score >= 13) {
      return 'high';
    }
    if (score >= 10) {
      return 'moderate';
    }
    return 'low';
  }

  Future<void> _createHighRiskNotification({
    required String assignedMidwifeUid,
    required String motherUid,
    required Map<String, dynamic> motherData,
    required int score,
    required DateTime attemptedAt,
    required String attemptId,
  }) async {
    final motherName = '${motherData['fullName'] ?? motherData['username'] ?? 'A mother'}'.trim();

    await _db.collection('notifications').add({
      'recipientUid': assignedMidwifeUid,
      'recipientRole': 'midwife',
      'type': 'high-risk-epds',
      'title': 'High-risk mother identified',
      'message': '$motherName submitted an EPDS score of $score and needs early follow-up.',
      'motherUid': motherUid,
      'motherName': motherName,
      'score': score,
      'riskLevel': 'high',
      'attemptId': attemptId,
      'attemptedAt': Timestamp.fromDate(attemptedAt),
      'read': false,
      'priority': 'high',
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    });
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
}
