import 'package:flutter_test/flutter_test.dart';
import 'package:mamabalance/services/weekly_checkin_service.dart';

void main() {
  group('WeeklyCheckInService', () {
    test('calculates next available date seven calendar days later', () {
      final lastSubmitted = DateTime.utc(2026, 4, 20, 15, 30);

      final next =
          WeeklyCheckInService.nextAvailableAtFrom(lastSubmitted)!.toLocal();

      expect(next.year, 2026);
      expect(next.month, 4);
      expect(next.day, 27);
      expect(next.hour, 0);
      expect(next.minute, 0);
    });

    test('returns null when there is no previous submission', () {
      expect(WeeklyCheckInService.nextAvailableAtFrom(null), isNull);
    });
  });
}
