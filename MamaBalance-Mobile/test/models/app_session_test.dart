import 'package:flutter_test/flutter_test.dart';
import 'package:mamabalance/models/app_session.dart';

void main() {
  group('AppUserRole', () {
    test('parses mobile roles from strings', () {
      expect(AppUserRoleX.fromString('mother'), AppUserRole.mother);
      expect(AppUserRoleX.fromString(' Guardian '), AppUserRole.guardian);
      expect(AppUserRoleX.fromString('doctor'), AppUserRole.unknown);
      expect(AppUserRoleX.fromString(null), AppUserRole.unknown);
    });

    test('identifies mobile users only', () {
      expect(AppUserRole.mother.isMobileUser, isTrue);
      expect(AppUserRole.guardian.isMobileUser, isTrue);
      expect(AppUserRole.unknown.isMobileUser, isFalse);
    });

    test('maps roles to correct home routes and labels', () {
      expect(AppUserRole.mother.homeRoute, '/home');
      expect(AppUserRole.guardian.homeRoute, '/guardian-home');
      expect(AppUserRole.unknown.homeRoute, '/home');

      expect(AppUserRole.mother.label, 'Mother');
      expect(AppUserRole.guardian.label, 'Guardian');
      expect(AppUserRole.unknown.label, 'User');
    });
  });
}
