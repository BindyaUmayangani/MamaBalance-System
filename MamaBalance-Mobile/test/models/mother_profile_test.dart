import 'package:flutter_test/flutter_test.dart';
import 'package:mamabalance/models/mother_profile.dart';

MotherProfile _profile() {
  return MotherProfile(
    uid: 'mother-1',
    fullName: 'Amara Silva',
    loginEmail: 'amara.system@mamabalance.lk',
    personalEmail: 'amara@example.com',
    phoneNumber: '+94711111111',
    birthdate: '1995-04-10',
    address: 'Colombo',
    guardianName: 'Nimal',
    guardianContact: '+94722222222',
    deliveryDate: '2026-06-01',
    noOfChildren: 1,
    profileImageUrl: 'https://example.com/profile.jpg',
    profileImagePath: 'profiles/mother-1.jpg',
    assignedDoctorUid: 'doctor-1',
    assignedMidwifeUid: 'midwife-1',
    assignedDoctorName: 'Dr. Perera',
    assignedMidwifeName: 'Midwife Silva',
    latestEpdsScore: 8,
    latestEpdsDate: DateTime.utc(2026, 4, 20),
  );
}

void main() {
  group('MotherProfile', () {
    test('returns first name with fallback', () {
      expect(_profile().firstName, 'Amara');

      final blankName = _profile().copyWith(fullName: '   ');
      expect(blankName.firstName, 'Mother');
    });

    test('copyWith updates selected fields and preserves the rest', () {
      final updated = _profile().copyWith(
        fullName: 'Amara Fernando',
        phoneNumber: '+94733333333',
        latestEpdsScore: 14,
      );

      expect(updated.uid, 'mother-1');
      expect(updated.fullName, 'Amara Fernando');
      expect(updated.phoneNumber, '+94733333333');
      expect(updated.latestEpdsScore, 14);
      expect(updated.loginEmail, 'amara.system@mamabalance.lk');
      expect(updated.assignedDoctorName, 'Dr. Perera');
    });
  });
}
