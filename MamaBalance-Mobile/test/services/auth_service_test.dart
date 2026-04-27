import 'package:flutter_test/flutter_test.dart';
import 'package:mamabalance/services/auth_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('AuthService mobile helpers', () {
    setUp(() {
      SharedPreferences.setMockInitialValues({});
    });

    test('normalizes Sri Lankan phone numbers for OTP login', () {
      final service = AuthService.instance;

      expect(service.normalizePhoneNumber(''), '');
      expect(service.normalizePhoneNumber('071 234 5678'), '+94712345678');
      expect(service.normalizePhoneNumber('(071) 234-5678'), '+94712345678');
      expect(service.normalizePhoneNumber('94712345678'), '+94712345678');
      expect(service.normalizePhoneNumber('+94712345678'), '+94712345678');
      expect(service.normalizePhoneNumber('712345678'), '712345678');
    });

    test('returns remaining OTP cooldown from shared preferences', () async {
      final phone = AuthService.instance.normalizePhoneNumber('0712345678');
      final until = DateTime.now()
          .add(const Duration(seconds: 45))
          .millisecondsSinceEpoch;
      SharedPreferences.setMockInitialValues({
        'otp_cooldown_$phone': until,
      });

      final remaining =
          await AuthService.instance.getOtpCooldownRemaining(phone);

      expect(remaining, greaterThan(Duration.zero));
      expect(remaining.inSeconds, lessThanOrEqualTo(45));
    });

    test('clears expired OTP cooldowns', () async {
      final phone = AuthService.instance.normalizePhoneNumber('0712345678');
      final expired = DateTime.now()
          .subtract(const Duration(seconds: 1))
          .millisecondsSinceEpoch;
      SharedPreferences.setMockInitialValues({
        'otp_cooldown_$phone': expired,
      });

      final remaining =
          await AuthService.instance.getOtpCooldownRemaining(phone);

      expect(remaining, Duration.zero);
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.containsKey('otp_cooldown_$phone'), isFalse);
    });
  });
}
