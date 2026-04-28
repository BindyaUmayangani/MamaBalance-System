import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:app_badge_plus/app_badge_plus.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../config/app_config.dart';
import 'auth_service.dart';

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

  MotherNotificationItem copyWith({bool? read}) {
    return MotherNotificationItem(
      id: id,
      title: title,
      description: description,
      type: type,
      priority: priority,
      createdAt: createdAt,
      read: read ?? this.read,
    );
  }
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

  final FirebaseAuth _auth = FirebaseAuth.instance;
  static const Duration _backendTimeout = Duration(seconds: 20);
  static const Duration _pollInterval = Duration(seconds: 20);

  static const String _readKey = 'mother_notification_read_ids';
  static const String _dismissedKey = 'mother_notification_dismissed_ids';
  static const String _guardianReadKey = 'guardian_notification_read_ids';
  static const String _guardianDismissedKey =
      'guardian_notification_dismissed_ids';

  Stream<MotherNotificationSummary> watchSummary() async* {
    while (true) {
      yield await fetchSummary();
      await Future<void>.delayed(_pollInterval);
    }
  }

  Stream<MotherNotificationSummary> watchGuardianSummary() async* {
    while (true) {
      yield await fetchGuardianSummary();
      await Future<void>.delayed(_pollInterval);
    }
  }

  Future<MotherNotificationSummary> fetchSummary() async {
    return _fetchSummary(readKey: _readKey, dismissedKey: _dismissedKey);
  }

  Future<MotherNotificationSummary> fetchGuardianSummary() async {
    return _fetchSummary(
      readKey: _guardianReadKey,
      dismissedKey: _guardianDismissedKey,
    );
  }

  Future<MotherNotificationSummary> _fetchSummary({
    required String readKey,
    required String dismissedKey,
  }) async {
    final payload = await _sendNotificationRequest();
    final readIds = await _readIds(readKey);
    final dismissedIds = await _readIds(dismissedKey);
    final rawItems = payload['items'];
    final items = (rawItems is List ? rawItems : const [])
        .whereType<Map<String, dynamic>>()
        .map((item) => _itemFromJson(item, readIds))
        .where((item) => !dismissedIds.contains(item.id))
        .toList()
      ..sort((left, right) => right.createdAt.compareTo(left.createdAt));

    final summary = MotherNotificationSummary(items: items);
    _updateLauncherBadge(summary.unreadCount);
    return summary;
  }

  Future<void> markRead(String id) async {
    final ids = await _readIds(_readKey);
    ids.add(id);
    await _writeIds(_readKey, ids);
  }

  Future<void> markGuardianRead(String id) async {
    final ids = await _readIds(_guardianReadKey);
    ids.add(id);
    await _writeIds(_guardianReadKey, ids);
  }

  Future<void> dismiss(String id) async {
    final ids = await _readIds(_dismissedKey);
    ids.add(id);
    await _writeIds(_dismissedKey, ids);
  }

  Future<void> dismissGuardian(String id) async {
    final ids = await _readIds(_guardianDismissedKey);
    ids.add(id);
    await _writeIds(_guardianDismissedKey, ids);
  }

  Future<void> markAllRead(List<String> ids) async {
    final current = await _readIds(_readKey);
    current.addAll(ids);
    await _writeIds(_readKey, current);
  }

  Future<void> markAllGuardianRead(List<String> ids) async {
    final current = await _readIds(_guardianReadKey);
    current.addAll(ids);
    await _writeIds(_guardianReadKey, current);
  }

  Future<Map<String, dynamic>> _sendNotificationRequest() async {
    final user = _auth.currentUser;
    if (user == null) {
      throw const AppAuthException('Please sign in to continue.');
    }

    final token = await user.getIdToken();
    if (token == null || token.trim().isEmpty) {
      throw const AppAuthException('Please sign in again to continue.');
    }

    final headers = <String, String>{
      'Authorization': 'Bearer $token',
      'Accept': 'application/json',
    };

    try {
      final response = await http
          .get(_notificationsEndpoint(), headers: headers)
          .timeout(_backendTimeout);
      final payload = _decodeJson(response.body);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AppAuthException(
          payload['error'] as String? ?? 'Unable to load notifications.',
        );
      }
      return payload;
    } on AppAuthException {
      rethrow;
    } on TimeoutException {
      throw const AppAuthException(
        'The notifications request timed out. Check the backend connection and try again.',
      );
    } on SocketException {
      throw const AppAuthException(
        'Unable to reach the notifications backend. Check your connection and try again.',
      );
    } on FormatException {
      throw const AppAuthException(
        'The notifications backend returned an invalid response.',
      );
    }
  }

  Uri _notificationsEndpoint() {
    final baseUrl = AppConfig.backendBaseUrl.trim();
    if (baseUrl.isEmpty) {
      throw const AppAuthException('The mobile backend URL has not been configured.');
    }

    return Uri.parse(
      '${baseUrl.replaceFirst(RegExp(r'/$'), '')}/api/mobile/notifications',
    );
  }

  MotherNotificationItem _itemFromJson(
    Map<String, dynamic> data,
    Set<String> readIds,
  ) {
    final id = _readString(data['id']);
    return MotherNotificationItem(
      id: id,
      title: _readString(data['title'], fallback: 'Notification'),
      description: _readString(data['description']),
      type: _readString(data['type'], fallback: 'Reminder'),
      priority: _readString(data['priority'], fallback: 'medium'),
      createdAt: DateTime.tryParse(_readString(data['createdAt'])) ??
          DateTime.now(),
      read: readIds.contains(id) || data['read'] == true,
    );
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
