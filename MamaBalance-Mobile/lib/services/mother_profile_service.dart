import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_storage/firebase_storage.dart';

import '../models/mother_profile.dart';
import 'auth_service.dart';

class MotherProfileService {
  MotherProfileService._();

  static final MotherProfileService instance = MotherProfileService._();

  final FirebaseFirestore _db = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseStorage _storage = FirebaseStorage.instance;

  Future<MotherProfile> fetchCurrentProfile() async {
    final user = _auth.currentUser;
    if (user == null) {
      throw const AppAuthException('Please sign in to continue.');
    }
    try {
      final resolved = await _resolveCurrentProfileDocs();
      final userDoc = resolved.userDoc;
      final motherDoc = resolved.motherDoc;

      final userData = userDoc.data() ?? <String, dynamic>{};
      final motherData = motherDoc.data() ?? <String, dynamic>{};

      final noOfChildrenValue = motherData['noOfChildren'];
      final noOfChildren = noOfChildrenValue is num
          ? noOfChildrenValue.toInt()
          : int.tryParse('${noOfChildrenValue ?? 0}') ?? 0;

      return MotherProfile(
        uid: resolved.uid,
        fullName: _readString(motherData['fullName']) ??
            _readString(userData['displayName']) ??
            user.displayName ??
            'Mother',
        loginEmail: _readString(userData['email']) ?? user.email ?? '-',
        personalEmail: _readString(motherData['personalEmail']) ??
            _readString(userData['personalEmail']) ??
            user.email ??
            '-',
        phoneNumber: _readString(motherData['phoneNumber']) ??
            _readString(userData['phoneNumber']) ??
            _readString(user.phoneNumber) ??
            '-',
        birthdate: _readDateLike(motherData['birthdate']),
        address: _readString(motherData['address']) ?? '-',
        guardianName: _readString(motherData['guardianName']) ?? '-',
        guardianContact: _readString(motherData['guardianContact']) ?? '-',
        deliveryDate: _readDateLike(motherData['deliveryDate']),
        noOfChildren: noOfChildren,
        profileImageUrl: _readString(motherData['profileImage']) ??
            _readString(userData['profileImage']) ??
            '',
        profileImagePath: _readString(motherData['profileImagePath']) ??
            _readString(userData['profileImagePath']) ??
            '',
        assignedDoctorUid: _readString(motherData['assignedDoctorUid']),
        assignedMidwifeUid: _readString(motherData['assignedMidwifeUid']),
        latestEpdsScore: int.tryParse('${motherData['latestEpdsScore'] ?? 0}') ?? 0,
        latestEpdsDate: _parseLatestEpdsDate(motherData),
      );
    } catch (_) {
      return _buildFallbackProfile(user);
    }
  }

  Future<void> updateCurrentProfile(MotherProfile profile) async {
    final resolved = await _resolveCurrentProfileDocs();
    final user = _auth.currentUser!;
    final canonicalUid = resolved.uid;

    final trimmedName = profile.fullName.trim();
    final normalizedPersonalEmail = profile.personalEmail.trim().toLowerCase();
    final normalizedPhone = AuthService.instance.normalizePhoneNumber(
      profile.phoneNumber,
    );

    final updatesForUser = <String, dynamic>{
      'displayName': trimmedName,
      'personalEmail': normalizedPersonalEmail,
      'phoneNumber': normalizedPhone,
      'profileImage': profile.profileImageUrl.trim(),
      'profileImagePath': profile.profileImagePath.trim(),
      'updatedAt': FieldValue.serverTimestamp(),
    };

    final updatesForMother = <String, dynamic>{
      'fullName': trimmedName,
      'personalEmail': normalizedPersonalEmail,
      'phoneNumber': normalizedPhone,
      'birthdate': profile.birthdate.trim(),
      'address': profile.address.trim(),
      'guardianName': profile.guardianName.trim(),
      'guardianContact': profile.guardianContact.trim(),
      'deliveryDate': profile.deliveryDate.trim(),
      'noOfChildren': profile.noOfChildren,
      'profileImage': profile.profileImageUrl.trim(),
      'profileImagePath': profile.profileImagePath.trim(),
      'updatedAt': FieldValue.serverTimestamp(),
    };

    await Future.wait([
      _db.collection('users').doc(canonicalUid).set(updatesForUser, SetOptions(merge: true)),
      resolved.motherDoc.reference.set(updatesForMother, SetOptions(merge: true)),
    ]);

    if (trimmedName.isNotEmpty && user.displayName != trimmedName) {
      await user.updateDisplayName(trimmedName);
      await user.reload();
    }
  }

  Future<MotherProfile> uploadProfileImage(File imageFile) async {
    final user = _auth.currentUser;
    if (user == null) {
      throw const AppAuthException('Please sign in to continue.');
    }

    final resolved = await _resolveCurrentProfileDocs();
    final canonicalUid = resolved.uid;

    // 1. Convert image to Base64 for database-direct sync (Web Parity)
    final bytes = await imageFile.readAsBytes();
    final extension = imageFile.path.split('.').last.toLowerCase();
    final mimeType = (extension == 'png') ? 'image/png' : 'image/jpeg';
    
    final base64String = base64Encode(bytes);
    final dataUrl = 'data:$mimeType;base64,$base64String';

    // 2. Update databases (Firestore is the source of truth for synchronization)
    final updates = <String, dynamic>{
      'profileImage': dataUrl,
      'profileImagePath': '', // Clear path as we are using Base64 now
      'updatedAt': FieldValue.serverTimestamp(),
    };

    await Future.wait([
      _db.collection('users').doc(canonicalUid).set(updates, SetOptions(merge: true)),
      resolved.motherDoc.reference.set(updates, SetOptions(merge: true)),
    ]);

    await user.reload();
    return fetchCurrentProfile();
  }

  /// Safely attempts to delete a file from Firebase Storage.
  /// Ignores "object-not-found" errors to prevent crashing the flow.
  Future<void> _safeDeleteStorageFile(String path) async {
    try {
      await _storage.ref(path).delete();
    } on FirebaseException catch (e) {
      if (e.code != 'object-not-found') {
        // Log other exceptions but don't rethrow to avoid breaking the user flow
        debugPrint('Non-critical error deleting old profile image: $e');
      }
    } catch (e) {
      debugPrint('Unexpected error deleting old profile image: $e');
    }
  }

  String _readDateLike(dynamic value) {
    if (value == null) return '-';
    if (value is Timestamp) {
      final date = value.toDate();
      return date.toIso8601String().split('T').first;
    }
    final raw = '$value'.trim();
    return raw.isEmpty ? '-' : raw;
  }

  String? _readString(dynamic value) {
    if (value == null) return null;
    final raw = '$value'.trim();
    return raw.isEmpty ? null : raw;
  }

  DateTime? _parseLatestEpdsDate(Map<String, dynamic> motherData) {
    final raw = motherData['latestEpdsSubmittedAt'];

    if (raw == null) return null;
    if (raw is Timestamp) return raw.toDate();
    if (raw is String) return DateTime.tryParse(raw);
    return null;
  }

  MotherProfile _buildFallbackProfile(User user) {
    return MotherProfile(
      uid: user.uid,
      fullName: (user.displayName != null && user.displayName!.trim().isNotEmpty)
          ? user.displayName!.trim()
          : 'Mother',
      loginEmail: user.email?.trim().isNotEmpty == true ? user.email!.trim() : '-',
      personalEmail: user.email?.trim().isNotEmpty == true ? user.email!.trim() : '-',
      phoneNumber: _readString(user.phoneNumber) ?? '-',
      birthdate: '-',
      address: '-',
      guardianName: '-',
      guardianContact: '-',
      deliveryDate: '-',
      noOfChildren: 0,
      profileImageUrl: '',
      profileImagePath: '',
      assignedDoctorUid: null,
    );
  }

  Future<_ResolvedProfileDocs> _resolveCurrentProfileDocs() async {
    final user = _auth.currentUser;
    if (user == null) {
      throw const AppAuthException('Please sign in to continue.');
    }

    final directUserDoc = await _db.collection('users').doc(user.uid).get();
    if (directUserDoc.exists) {
      final directMotherDoc = await _resolveMotherDocForUid(user.uid, user);
      return _ResolvedProfileDocs(
        uid: user.uid,
        userDoc: directUserDoc,
        motherDoc: directMotherDoc,
      );
    }

    final normalizedPhone = AuthService.instance.normalizePhoneNumber(
      user.phoneNumber ?? '',
    );

    DocumentSnapshot<Map<String, dynamic>>? matchedUserDoc;

    if (normalizedPhone.isNotEmpty) {
      final byPhone = await _db
          .collection('users')
          .where('phoneNumber', isEqualTo: normalizedPhone)
          .limit(1)
          .get();

      if (byPhone.docs.isNotEmpty) {
        matchedUserDoc = byPhone.docs.first;
      }
    }

    final email = user.email?.trim().toLowerCase() ?? '';
    if (matchedUserDoc == null && email.isNotEmpty) {
      final byLoginEmail = await _db
          .collection('users')
          .where('email', isEqualTo: email)
          .limit(1)
          .get();

      if (byLoginEmail.docs.isNotEmpty) {
        matchedUserDoc = byLoginEmail.docs.first;
      }
    }

    if (matchedUserDoc == null && email.isNotEmpty) {
      final byPersonalEmail = await _db
          .collection('users')
          .where('personalEmail', isEqualTo: email)
          .limit(1)
          .get();

      if (byPersonalEmail.docs.isNotEmpty) {
        matchedUserDoc = byPersonalEmail.docs.first;
      }
    }

    if (matchedUserDoc == null) {
      throw const AppAuthException('Unable to find your account details.');
    }

    final canonicalUid = matchedUserDoc.id;
    final motherDoc = await _resolveMotherDocForUid(canonicalUid, user);

    return _ResolvedProfileDocs(
      uid: canonicalUid,
      userDoc: matchedUserDoc,
      motherDoc: motherDoc,
    );
  }

  Future<DocumentSnapshot<Map<String, dynamic>>> _resolveMotherDocForUid(
    String uid,
    User user,
  ) async {
    final directMotherDoc = await _db.collection('mothers').doc(uid).get();
    if (directMotherDoc.exists) {
      return directMotherDoc;
    }

    final byUserUid = await _db
        .collection('mothers')
        .where('userUid', isEqualTo: uid)
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

    return directMotherDoc;
  }
}

class _ResolvedProfileDocs {
  final String uid;
  final DocumentSnapshot<Map<String, dynamic>> userDoc;
  final DocumentSnapshot<Map<String, dynamic>> motherDoc;

  const _ResolvedProfileDocs({
    required this.uid,
    required this.userDoc,
    required this.motherDoc,
  });
}
