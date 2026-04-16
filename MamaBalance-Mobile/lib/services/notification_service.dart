import 'dart:async';
import 'dart:convert';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:app_badge_plus/app_badge_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'auth_service.dart';
import 'messaging_service.dart';

class MotherNotificationItem {
  final String id;
  final String title;
  final String description;
  final String type;
  final String priority;
  final DateTime createdAt;
  final bool read;

  const MotherNotificationItem({
    required this.id,
    required this.title,
    required this.description,
    required this.type,
    required this.priority,
    required this.createdAt,
    required this.read,
  });
}

class MotherNotificationSummary {
  final List<MotherNotificationItem> items;

  const MotherNotificationSummary({required this.items});

  int get unreadMessagesCount =>
      items.where((item) => !item.read && item.type == 'Message').length;

  int get unreadNotificationsCount =>
      items.where((item) => !item.read && item.type != 'Message').length;

  int get unreadCount => items.where((item) => !item.read).length;

  int get importantCount =>
      items.where((item) => item.priority == 'high').length;

  int get todayCount {
    final now = DateTime.now();
    final start = DateTime(now.year, now.month, now.day);
    final end = start.add(const Duration(days: 1));
    return items
        .where(
          (item) =>
              item.createdAt.isAfter(start.subtract(const Duration(milliseconds: 1))) &&
              item.createdAt.isBefore(end),
        )
        .length;
  }
}

class NotificationService {
  NotificationService._();

  static final NotificationService instance = NotificationService._();

  final FirebaseFirestore _db = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  Stream<MotherNotificationSummary> watchSummary() async* {
    yield await fetchSummary();

    final user = _auth.currentUser;
    if (user == null) return;

    try {
      final motherDoc = await _resolveMotherDoc(user);
      final controller = StreamController<void>.broadcast();

      final s1 = _db
          .collection('conversations')
          .where('motherUid', isEqualTo: motherDoc.id)
          .snapshots()
          .listen((_) => controller.add(null));
      final s2 = _db
          .collection('mothers')
          .doc(motherDoc.id)
          .snapshots()
          .listen((_) => controller.add(null));
      final s3 = _db
          .collection('midwifeVisits')
          .where('motherUid', isEqualTo: motherDoc.id)
          .snapshots()
          .listen((_) => controller.add(null));
      final s4 = _db
          .collection('doctorCheckups')
          .where('motherUid', isEqualTo: motherDoc.id)
          .snapshots()
          .listen((_) => controller.add(null));

      yield* controller.stream.asyncMap((_) => fetchSummary());

      // Note: In a real app, you'd want to ensure these are cancelled when the stream is disposed.
      // async* handled this partially, but explicitly:
    } catch (_) {
      // If profile not found yet or other error
      yield const MotherNotificationSummary(items: []);
    }
  }

  static const String _readKey = 'mother_notification_read_ids';
  static const String _dismissedKey = 'mother_notification_dismissed_ids';

  Future<MotherNotificationSummary> fetchSummary() async {
    final user = _auth.currentUser;
    if (user == null) {
      throw const AppAuthException('Please sign in to continue.');
    }

    final motherDoc = await _resolveMotherDoc(user);
    final motherData = motherDoc.data() ?? <String, dynamic>{};
    final readIds = await _readIds(_readKey);
    final dismissedIds = await _readIds(_dismissedKey);
    final now = DateTime.now();

    final notifications = <MotherNotificationItem>[];

    notifications.addAll(_buildCheckInNotifications(motherData, now, readIds));
    notifications.addAll(
      await _buildAssignmentNotifications(
        motherData: motherData,
        now: now,
        readIds: readIds,
      ),
    );
    notifications.addAll(
      await _buildResourceNotifications(readIds: readIds),
    );
    notifications.addAll(
      await _buildVisitNotifications(
        motherUid: motherDoc.id,
        now: now,
        readIds: readIds,
      ),
    );
    notifications.addAll(
      await _buildMessageNotifications(
        motherUid: motherDoc.id,
        currentUserUid: user.uid,
        readIds: readIds,
      ),
    );

    final visible = notifications
        .where((item) => !dismissedIds.contains(item.id))
        .toList()
      ..sort((left, right) => right.createdAt.compareTo(left.createdAt));

    final summary = MotherNotificationSummary(items: visible);
    _updateLauncherBadge(summary.unreadCount);
    return summary;
  }

  void _updateLauncherBadge(int count) {
    try {
      AppBadgePlus.isSupported().then((supported) {
        if (supported) {
          AppBadgePlus.updateBadge(count);
        }
      });
    } catch (_) {}
  }

  Future<void> markRead(String id) async {
    final ids = await _readIds(_readKey);
    ids.add(id);
    await _writeIds(_readKey, ids);
  }

  Future<void> dismiss(String id) async {
    final ids = await _readIds(_dismissedKey);
    ids.add(id);
    await _writeIds(_dismissedKey, ids);
  }

  Future<void> markAllRead(List<String> ids) async {
    final current = await _readIds(_readKey);
    current.addAll(ids);
    await _writeIds(_readKey, current);
  }

  List<MotherNotificationItem> _buildCheckInNotifications(
    Map<String, dynamic> motherData,
    DateTime now,
    Set<String> readIds,
  ) {
    final items = <MotherNotificationItem>[];
    final lastSubmittedAt = _readDate(motherData['latestEpdsSubmittedAt']);
    final nextDue = lastSubmittedAt?.add(const Duration(days: 7));

    if (nextDue == null) {
      const id = 'epds:first-checkin';
      items.add(
        MotherNotificationItem(
          id: id,
          title: 'Your weekly EPDS check-in is ready',
          description:
              'Complete your first check-in to start tracking your emotional wellbeing week by week.',
          type: 'Reminder',
          priority: 'medium',
          createdAt: now,
          read: readIds.contains(id),
        ),
      );
      return items;
    }

    if (!nextDue.isAfter(now)) {
      final overdueDays = now.difference(nextDue).inDays;
      final id = overdueDays > 0 ? 'epds:overdue:$overdueDays' : 'epds:due';
      items.add(
        MotherNotificationItem(
          id: id,
          title: overdueDays > 0
              ? 'Your weekly EPDS check-in is overdue'
              : 'Time for your weekly EPDS check-in',
          description: overdueDays > 0
              ? 'Your next assessment was due on ${_formatDate(nextDue)}. Complete it when you can so your care team stays up to date.'
              : 'Your next weekly check-in is now available. A short check-in helps your care team support you early.',
          type: 'Assessment',
          priority: overdueDays > 0 ? 'high' : 'medium',
          createdAt: nextDue,
          read: readIds.contains(id),
        ),
      );
    }

    return items;
  }

  Future<List<MotherNotificationItem>> _buildAssignmentNotifications({
    required Map<String, dynamic> motherData,
    required DateTime now,
    required Set<String> readIds,
  }) async {
    final doctorUid = '${motherData['assignedDoctorUid'] ?? ''}'.trim();
    if (doctorUid.isEmpty) return const [];

    final doctorName = await _resolveStaffName(
      staffUid: doctorUid,
      fallback:
          '${motherData['assignedDoctorName'] ?? motherData['doctorName'] ?? ''}',
      role: 'doctor',
    );
    final id = 'assignment:doctor:$doctorUid';
    return [
      MotherNotificationItem(
        id: id,
        title: 'A doctor has been assigned to your care',
        description:
            '$doctorName is now part of your care team and available through secure messaging and checkups.',
        type: 'Care team',
        priority: 'medium',
        createdAt: _readDate(motherData['updatedAt']) ?? now,
        read: readIds.contains(id),
      ),
    ];
  }

  Future<List<MotherNotificationItem>> _buildResourceNotifications({
    required Set<String> readIds,
  }) async {
    final snapshot = await _db
        .collection('educationalContents')
        .where('visibility', isEqualTo: 'visible')
        .get();

    final now = DateTime.now();
    final items = <MotherNotificationItem>[];

    for (final doc in snapshot.docs) {
      final data = doc.data();
      final createdAt =
          _readDate(data['createdAt']) ?? _readDate(data['updatedAt']) ?? now;
      if (createdAt.isBefore(now.subtract(const Duration(days: 30)))) {
        continue;
      }

      final title = '${data['title'] ?? 'New resource'}'.trim();
      final id = 'resource:${doc.id}';
      items.add(
        MotherNotificationItem(
          id: id,
          title: 'New educational content is available',
          description:
              title.isEmpty ? 'A new learning resource has been added for you.' : '$title has been added to your educational resources.',
          type: 'Resource',
          priority: 'low',
          createdAt: createdAt,
          read: readIds.contains(id),
        ),
      );
    }

    return items;
  }

  Future<List<MotherNotificationItem>> _buildVisitNotifications({
    required String motherUid,
    required DateTime now,
    required Set<String> readIds,
  }) async {
    final results = await Future.wait([
      _db.collection('midwifeVisits').where('motherUid', isEqualTo: motherUid).get(),
      _db.collection('doctorCheckups').where('motherUid', isEqualTo: motherUid).get(),
    ]);

    final items = <MotherNotificationItem>[];

    for (final doc in results[0].docs) {
      final data = doc.data();
      final scheduledAt = _readDate(data['scheduledAt']);
      if (scheduledAt == null) continue;

      final createdAt = _readDate(data['createdAt']) ?? scheduledAt;
      final updatedAt = _readDate(data['updatedAt']) ?? createdAt;
      final status = '${data['status'] ?? ''}'.trim().toLowerCase();
      final visitType = '${data['visitType'] ?? 'home'}'.trim().toLowerCase();
      final label = visitType == 'clinic' ? 'clinic visit' : 'home visit';

      if (_isOverdue(status: status, scheduledAt: scheduledAt, now: now)) {
        final id = 'overdue:midwife:${doc.id}';
        items.add(
          MotherNotificationItem(
            id: id,
            title: '${_capitalize(label)} is overdue',
            description:
                'Your $label scheduled for ${_formatDateTime(scheduledAt)} is now overdue. Please check with your care team.',
            type: 'Visit',
            priority: 'high',
            createdAt: scheduledAt,
            read: readIds.contains(id),
          ),
        );
        continue;
      }

      if (_isRescheduled(status: status, createdAt: createdAt, updatedAt: updatedAt)) {
        final id = 'rescheduled:midwife:${doc.id}';
        items.add(
          MotherNotificationItem(
            id: id,
            title: '${_capitalize(label)} rescheduled',
            description:
                'Your $label has been updated to ${_formatDateTime(scheduledAt)}.',
            type: 'Visit',
            priority: 'medium',
            createdAt: updatedAt,
            read: readIds.contains(id),
          ),
        );
        continue;
      }

      if (createdAt.isAfter(now.subtract(const Duration(days: 30)))) {
        final id = 'new:midwife:${doc.id}';
        items.add(
          MotherNotificationItem(
            id: id,
            title: 'New $label added',
            description:
                'A $label has been scheduled for ${_formatDateTime(scheduledAt)}.',
            type: 'Visit',
            priority: 'medium',
            createdAt: createdAt,
            read: readIds.contains(id),
          ),
        );
      }
    }

    for (final doc in results[1].docs) {
      final data = doc.data();
      final scheduledAt = _readDate(data['scheduledAt']);
      if (scheduledAt == null) continue;

      final createdAt = _readDate(data['createdAt']) ?? scheduledAt;
      final updatedAt = _readDate(data['updatedAt']) ?? createdAt;
      final status = '${data['status'] ?? ''}'.trim().toLowerCase();

      if (_isOverdue(status: status, scheduledAt: scheduledAt, now: now)) {
        final id = 'overdue:doctor:${doc.id}';
        items.add(
          MotherNotificationItem(
            id: id,
            title: 'Doctor checkup is overdue',
            description:
                'Your doctor checkup scheduled for ${_formatDateTime(scheduledAt)} is overdue. Please review it with your care team.',
            type: 'Checkup',
            priority: 'high',
            createdAt: scheduledAt,
            read: readIds.contains(id),
          ),
        );
        continue;
      }

      if (_isRescheduled(status: status, createdAt: createdAt, updatedAt: updatedAt)) {
        final id = 'rescheduled:doctor:${doc.id}';
        items.add(
          MotherNotificationItem(
            id: id,
            title: 'Doctor checkup rescheduled',
            description:
                'Your doctor checkup has been updated to ${_formatDateTime(scheduledAt)}.',
            type: 'Checkup',
            priority: 'medium',
            createdAt: updatedAt,
            read: readIds.contains(id),
          ),
        );
        continue;
      }

      if (createdAt.isAfter(now.subtract(const Duration(days: 30)))) {
        final id = 'new:doctor:${doc.id}';
        items.add(
          MotherNotificationItem(
            id: id,
            title: 'New doctor checkup added',
            description:
                'A doctor checkup has been scheduled for ${_formatDateTime(scheduledAt)}.',
            type: 'Checkup',
            priority: 'medium',
            createdAt: createdAt,
            read: readIds.contains(id),
          ),
        );
      }
    }

    return items;
  }

  Future<List<MotherNotificationItem>> _buildMessageNotifications({
    required String motherUid,
    required String currentUserUid,
    required Set<String> readIds,
  }) async {
    final options = await MessagingService.instance.resolveMotherChatOptions();
    final ids = <String>[
      options.midwife.id,
      if (options.doctor != null) options.doctor!.id,
    ];

    final items = <MotherNotificationItem>[];
    for (final conversationId in ids) {
      final doc = await _db.collection('conversations').doc(conversationId).get();
      if (!doc.exists) continue;

      final data = doc.data() ?? <String, dynamic>{};
      final lastMessageAt = _readDate(data['lastMessageAt']);
      final lastReadByMotherAt = _readDate(data['lastReadByMotherAt']);
      final senderUid = '${data['lastMessageSenderUid'] ?? ''}'.trim();

      if (lastMessageAt == null || senderUid.isEmpty || senderUid == currentUserUid) {
        continue;
      }

      if (lastReadByMotherAt != null && !lastMessageAt.isAfter(lastReadByMotherAt)) {
        continue;
      }

      final isDoctor = conversationId.contains('_doctor_');
      final name = isDoctor
          ? (options.doctor?.careTeamName ?? 'Dr. Doctor')
          : options.midwife.careTeamName;
      final id = 'message:$conversationId:${lastMessageAt.millisecondsSinceEpoch}';
      items.add(
        MotherNotificationItem(
          id: id,
          title: 'New message from $name',
          description: 'Open secure chat to read the latest care message.',
          type: 'Message',
          priority: 'medium',
          createdAt: lastMessageAt,
          read: readIds.contains(id),
        ),
      );
    }

    return items;
  }

  bool _isOverdue({
    required String status,
    required DateTime scheduledAt,
    required DateTime now,
  }) {
    return status != 'completed' &&
        status != 'cancelled' &&
        !scheduledAt.isAfter(now);
  }

  bool _isRescheduled({
    required String status,
    required DateTime createdAt,
    required DateTime updatedAt,
  }) {
    return status == 'rescheduled' ||
        updatedAt.isAfter(createdAt.add(const Duration(minutes: 1)));
  }

  Future<DocumentSnapshot<Map<String, dynamic>>> _resolveMotherDoc(User user) async {
    final directMotherDoc = await _db.collection('mothers').doc(user.uid).get();
    if (directMotherDoc.exists) {
      return directMotherDoc;
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

  Future<String> _resolveStaffName({
    required String staffUid,
    required String fallback,
    required String role,
  }) async {
    try {
      final doc = await _db.collection('users').doc(staffUid).get();
      final raw =
          '${doc.data()?['displayName'] ?? doc.data()?['fullName'] ?? fallback}'
              .trim();
      if (role == 'doctor') {
        if (raw.isEmpty) return 'Dr. Doctor';
        return raw.toLowerCase().startsWith('dr.') ? raw : 'Dr. $raw';
      }
      if (raw.isEmpty) return 'Assigned midwife';
      return raw.toLowerCase().startsWith('midwife ') ? raw : 'Midwife $raw';
    } catch (_) {
      if (role == 'doctor') {
        final raw = fallback.trim();
        if (raw.isEmpty) return 'Dr. Doctor';
        return raw.toLowerCase().startsWith('dr.') ? raw : 'Dr. $raw';
      }
      return fallback.trim().isEmpty ? 'Assigned midwife' : fallback.trim();
    }
  }

  DateTime? _readDate(dynamic value) {
    if (value == null) return null;
    if (value is Timestamp) return value.toDate().toLocal();
    if (value is DateTime) return value.toLocal();
    return DateTime.tryParse('$value')?.toLocal();
  }

  Future<Set<String>> _readIds(String key) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(key);
    if (raw == null || raw.isEmpty) return <String>{};

    try {
      final decoded = jsonDecode(raw);
      if (decoded is List) {
        return decoded.map((item) => '$item').toSet();
      }
    } catch (_) {
      return <String>{};
    }

    return <String>{};
  }

  Future<void> _writeIds(String key, Set<String> ids) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(key, jsonEncode(ids.toList()));
  }

  String _formatDate(DateTime value) {
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
    return '${value.day.toString().padLeft(2, '0')} ${months[value.month]} ${value.year}';
  }

  String _formatDateTime(DateTime value) {
    final hour = value.hour == 0 ? 12 : (value.hour > 12 ? value.hour - 12 : value.hour);
    final minute = value.minute.toString().padLeft(2, '0');
    final period = value.hour >= 12 ? 'PM' : 'AM';
    return '${_formatDate(value)} at $hour:$minute $period';
  }

  String _capitalize(String value) {
    if (value.isEmpty) return value;
    return value[0].toUpperCase() + value.substring(1);
  }
}
