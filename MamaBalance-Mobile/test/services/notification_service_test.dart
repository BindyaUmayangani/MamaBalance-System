import 'package:flutter_test/flutter_test.dart';
import 'package:mamabalance/services/notification_service.dart';

void main() {
  group('MotherNotificationSummary', () {
    test('counts unread messages, notifications, important and today items', () {
      final now = DateTime.now();
      final summary = MotherNotificationSummary(
        items: [
          MotherNotificationItem(
            id: 'message-1',
            title: 'New message',
            description: 'Open secure chat',
            type: 'Message',
            priority: 'medium',
            createdAt: now,
            read: false,
          ),
          MotherNotificationItem(
            id: 'visit-1',
            title: 'Visit overdue',
            description: 'Check with your care team',
            type: 'Visit',
            priority: 'high',
            createdAt: now.subtract(const Duration(hours: 1)),
            read: false,
          ),
          MotherNotificationItem(
            id: 'resource-1',
            title: 'Resource',
            description: 'Educational content',
            type: 'Resource',
            priority: 'low',
            createdAt: now.subtract(const Duration(days: 2)),
            read: true,
          ),
        ],
      );

      expect(summary.unreadMessagesCount, 1);
      expect(summary.unreadNotificationsCount, 1);
      expect(summary.unreadCount, 2);
      expect(summary.importantCount, 1);
      expect(summary.todayCount, 2);
    });
  });
}
