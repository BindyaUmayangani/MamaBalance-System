import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../models/app_session.dart';
import 'auth_service.dart';

class MobileLinkedMotherContext {
  final AppUserRole role;
  final User authUser;
  final DocumentSnapshot<Map<String, dynamic>> userDoc;
  final DocumentSnapshot<Map<String, dynamic>> motherDoc;
  final Map<String, dynamic>? guardianLink;

  const MobileLinkedMotherContext({
    required this.role,
    required this.authUser,
    required this.userDoc,
    required this.motherDoc,
    this.guardianLink,
  });
}

class _GuardianResolution {
  final DocumentSnapshot<Map<String, dynamic>> motherDoc;
  final Map<String, dynamic> guardianLink;

  const _GuardianResolution({
    required this.motherDoc,
    required this.guardianLink,
  });
}

class MobileUserContextService {
  MobileUserContextService._();

  static final MobileUserContextService instance = MobileUserContextService._();

  final FirebaseFirestore _db = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  Future<MobileLinkedMotherContext> resolveCurrent() async {
    final authUser = _auth.currentUser;
    if (authUser == null) {
      throw const AppAuthException('Please sign in to continue.');
    }

    final userDoc = await resolveCurrentUserDoc();
    final userData = userDoc.data() ?? <String, dynamic>{};
    final role = AppUserRoleX.fromString(userData['role']);

    if (role == AppUserRole.guardian) {
      final guardianResolution = await _resolveGuardianContext(authUser, userDoc.id);

      return MobileLinkedMotherContext(
        role: role,
        authUser: authUser,
        userDoc: userDoc,
        motherDoc: guardianResolution.motherDoc,
        guardianLink: guardianResolution.guardianLink,
      );
    }

    final motherDoc = await _resolveMotherDoc(authUser, userDoc.id);
    return MobileLinkedMotherContext(
      role: role,
      authUser: authUser,
      userDoc: userDoc,
      motherDoc: motherDoc,
    );
  }

  Future<DocumentSnapshot<Map<String, dynamic>>> resolveCurrentUserDoc() async {
    final user = _auth.currentUser;
    if (user == null) {
      throw const AppAuthException('Please sign in to continue.');
    }

    final direct = await _db.collection('users').doc(user.uid).get();
    if (direct.exists) {
      return direct;
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
        return byPhone.docs.first;
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
        return byLoginEmail.docs.first;
      }

      final byPersonalEmail = await _db
          .collection('users')
          .where('personalEmail', isEqualTo: email)
          .limit(1)
          .get();
      if (byPersonalEmail.docs.isNotEmpty) {
        return byPersonalEmail.docs.first;
      }
    }

    throw const AppAuthException(
      'This account has not been registered in MamaBalance yet.',
    );
  }

  Future<DocumentSnapshot<Map<String, dynamic>>> _resolveMotherDoc(
    User authUser,
    String canonicalUid,
  ) async {
    final directMotherDoc = await _db.collection('mothers').doc(authUser.uid).get();
    if (directMotherDoc.exists) {
      return directMotherDoc;
    }

    final byUserUid = await _db
        .collection('mothers')
        .where('userUid', isEqualTo: canonicalUid)
        .limit(1)
        .get();
    if (byUserUid.docs.isNotEmpty) {
      return byUserUid.docs.first;
    }

    final normalizedPhone = AuthService.instance.normalizePhoneNumber(
      authUser.phoneNumber ?? '',
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

    final email = authUser.email?.trim().toLowerCase() ?? '';
    if (email.isNotEmpty) {
      final byPersonalEmail = await _db
          .collection('mothers')
          .where('personalEmail', isEqualTo: email)
          .limit(1)
          .get();
      if (byPersonalEmail.docs.isNotEmpty) {
        return byPersonalEmail.docs.first;
      }

      final byEmail = await _db
          .collection('mothers')
          .where('email', isEqualTo: email)
          .limit(1)
          .get();
      if (byEmail.docs.isNotEmpty) {
        return byEmail.docs.first;
      }
    }

    throw const AppAuthException('Unable to find your linked mother profile.');
  }

  Future<_GuardianResolution> _resolveGuardianContext(
    User authUser,
    String canonicalGuardianUid,
  ) async {
    final byGuardianUid = await _queryMotherByGuardianUid(canonicalGuardianUid);
    if (byGuardianUid != null) {
      return _GuardianResolution(
        motherDoc: byGuardianUid,
        guardianLink: {
          'motherId': byGuardianUid.id,
          'relationship':
              '${byGuardianUid.data()?['guardianRelationship'] ?? 'guardian'}',
        },
      );
    }

    final normalizedPhone = AuthService.instance.normalizePhoneNumber(
      authUser.phoneNumber ?? '',
    );
    if (normalizedPhone.isNotEmpty) {
      final byGuardianContact = await _queryMotherByGuardianContact(normalizedPhone);
      if (byGuardianContact != null) {
        return _GuardianResolution(
          motherDoc: byGuardianContact,
          guardianLink: {
            'motherId': byGuardianContact.id,
            'relationship':
                '${byGuardianContact.data()?['guardianRelationship'] ?? 'guardian'}',
          },
        );
      }
    }

    try {
      final byUid = await _db
          .collection('guardianLinks')
          .where('guardianUid', isEqualTo: canonicalGuardianUid)
          .where('isActive', isEqualTo: true)
          .limit(1)
          .get();
      if (byUid.docs.isNotEmpty) {
        final guardianLink = byUid.docs.first.data();
        final motherId = '${guardianLink['motherId'] ?? ''}'.trim();
        if (motherId.isNotEmpty) {
          final motherDoc = await _db.collection('mothers').doc(motherId).get();
          if (motherDoc.exists) {
            return _GuardianResolution(
              motherDoc: motherDoc,
              guardianLink: guardianLink,
            );
          }
        }
      }
    } catch (_) {
      // Guardian-linked mother fallback above is preferred because some Firestore
      // rules block direct guardianLinks reads on mobile clients.
    }

    throw const AppAuthException(
      'No active mother link was found for this guardian account yet.',
    );
  }

  Future<DocumentSnapshot<Map<String, dynamic>>?> _queryMotherByGuardianUid(
    String guardianUid,
  ) async {
    if (guardianUid.trim().isEmpty) {
      return null;
    }

    try {
      final snapshot = await _db
          .collection('mothers')
          .where('guardianUid', isEqualTo: guardianUid)
          .limit(1)
          .get();
      if (snapshot.docs.isNotEmpty) {
        return snapshot.docs.first;
      }
    } catch (_) {}

    return null;
  }

  Future<DocumentSnapshot<Map<String, dynamic>>?> _queryMotherByGuardianContact(
    String normalizedPhone,
  ) async {
    if (normalizedPhone.trim().isEmpty) {
      return null;
    }

    try {
      final snapshot = await _db
          .collection('mothers')
          .where('guardianContact', isEqualTo: normalizedPhone)
          .limit(1)
          .get();
      if (snapshot.docs.isNotEmpty) {
        return snapshot.docs.first;
      }
    } catch (_) {}

    return null;
  }
}
