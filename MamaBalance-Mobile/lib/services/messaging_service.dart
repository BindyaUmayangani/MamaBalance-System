import 'dart:convert';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cryptography/cryptography.dart';

import 'auth_service.dart';

class SecureChatMessage {
  final String id;
  final String senderUid;
  final String senderRole;
  final String text;
  final DateTime? createdAt;

  const SecureChatMessage({
    required this.id,
    required this.senderUid,
    required this.senderRole,
    required this.text,
    required this.createdAt,
  });

  bool isSentBy(String uid) => senderUid == uid;
}

class SecureConversation {
  final String id;
  final String motherUid;
  final String careTeamUid;
  final String careTeamRole;
  final String careTeamName;

  const SecureConversation({
    required this.id,
    required this.motherUid,
    required this.careTeamUid,
    required this.careTeamRole,
    required this.careTeamName,
  });
}

class MotherChatOptions {
  final SecureConversation? doctor;
  final SecureConversation midwife;

  const MotherChatOptions({
    required this.doctor,
    required this.midwife,
  });
}

class MessagingService {
  MessagingService._();

  static final MessagingService instance = MessagingService._();

  final FirebaseFirestore _db = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final AesGcm _cipher = AesGcm.with256bits();
  static const String _algorithm = 'AES-256-GCM';
  static const String _keyVersion = 'v1';
  static const String _defaultDevelopmentKey = 'MamaBalance demo message key v1!';
  static const String _configuredKey = String.fromEnvironment(
    'MESSAGE_ENCRYPTION_KEY',
  );

  User? get currentUser => _auth.currentUser;

  Future<MotherChatOptions> resolveMotherChatOptions() async {
    final user = _auth.currentUser;
    if (user == null) {
      throw const AppAuthException('Please sign in to continue.');
    }

    final motherDoc = await _resolveMotherDoc(user);
    final mother = motherDoc.data() ?? {};
    final doctorUid = '${mother['assignedDoctorUid'] ?? ''}'.trim();
    final midwifeUid = '${mother['assignedMidwifeUid'] ?? ''}'.trim();

    if (midwifeUid.isEmpty) {
      throw const AppAuthException('No midwife has been assigned yet.');
    }

    final doctor = doctorUid.isEmpty
        ? null
        : SecureConversation(
            id: _conversationId(motherDoc.id, doctorUid, 'doctor'),
            motherUid: motherDoc.id,
            careTeamUid: doctorUid,
            careTeamRole: 'doctor',
            careTeamName: await _resolveStaffName(
              staffUid: doctorUid,
              role: 'doctor',
              fallback:
                  '${mother['assignedDoctorName'] ?? mother['doctorName'] ?? ''}',
            ),
          );

    final midwife = SecureConversation(
      id: _conversationId(motherDoc.id, midwifeUid, 'midwife'),
      motherUid: motherDoc.id,
      careTeamUid: midwifeUid,
      careTeamRole: 'midwife',
      careTeamName: await _resolveStaffName(
        staffUid: midwifeUid,
        role: 'midwife',
        fallback:
            '${mother['assignedMidwifeName'] ?? mother['midwifeName'] ?? ''}',
      ),
    );

    return MotherChatOptions(doctor: doctor, midwife: midwife);
  }

  Future<SecureConversation> resolveMotherConversation() async {
    final options = await resolveMotherChatOptions();
    return options.doctor ?? options.midwife;
  }

  Future<String> _resolveStaffName({
    required String staffUid,
    required String role,
    required String fallback,
  }) async {
    var staffName = _staffName(fallback, role);
    try {
      final staffDoc = await _db.collection('users').doc(staffUid).get();
      staffName = _staffName(
        '${staffDoc.data()?['displayName'] ?? staffDoc.data()?['fullName'] ?? fallback}',
        role,
      );
    } catch (_) {
      staffName = _staffName(fallback, role);
    }

    return staffName;
  }

  Stream<List<SecureChatMessage>> watchMessages(String conversationId) {
    return _db
        .collection('conversations')
        .doc(conversationId)
        .snapshots()
        .asyncExpand((conversationDoc) {
          if (!conversationDoc.exists) {
            return Stream<List<SecureChatMessage>>.value([]);
          }

          return conversationDoc.reference
              .collection('messages')
              .orderBy('createdAt', descending: false)
              .limit(100)
              .snapshots()
              .asyncMap(
                (snapshot) async => Future.wait(snapshot.docs.map((doc) async {
                  final data = doc.data();
                  return SecureChatMessage(
                    id: doc.id,
                    senderUid: '${data['senderUid'] ?? ''}',
                    senderRole: '${data['senderRole'] ?? ''}',
                    text: await _decryptMessageText(data),
                    createdAt: _readDate(data['createdAt']),
                  );
                })),
              );
        });
  }

  Future<void> sendMessage({
    required SecureConversation conversation,
    required String text,
  }) async {
    final user = _auth.currentUser;
    final trimmed = text.trim();

    if (user == null) {
      throw const AppAuthException('Please sign in to continue.');
    }
    if (trimmed.isEmpty) {
      return;
    }

    final conversationRef =
        _db.collection('conversations').doc(conversation.id);
    final messageRef = conversationRef.collection('messages').doc();
    final encrypted = await _encryptMessageText(trimmed);

    await _db.runTransaction((transaction) async {
      transaction.set(
        conversationRef,
        {
          'motherUid': conversation.motherUid,
          if (conversation.careTeamRole == 'doctor')
            'doctorUid': conversation.careTeamUid,
          if (conversation.careTeamRole == 'midwife')
            'midwifeUid': conversation.careTeamUid,
          'careTeamRole': conversation.careTeamRole,
          'participantUids': [conversation.motherUid, conversation.careTeamUid],
          'isOpen': true,
          'lastMessageText': 'Secure message',
          'lastMessageAt': FieldValue.serverTimestamp(),
          'lastMessageSenderUid': user.uid,
          'lastReadByMotherAt': FieldValue.serverTimestamp(),
          'createdAt': FieldValue.serverTimestamp(),
          'updatedAt': FieldValue.serverTimestamp(),
        },
        SetOptions(merge: true),
      );

      transaction.set(messageRef, {
        'senderUid': user.uid,
        'senderRole': 'mother',
        ...encrypted,
        'attachments': [],
        'readBy': [user.uid],
        'createdAt': FieldValue.serverTimestamp(),
      });
    });
  }

  Future<void> markConversationRead(String conversationId) async {
    await _db.collection('conversations').doc(conversationId).set({
      'lastReadByMotherAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));
  }

  Future<DocumentSnapshot<Map<String, dynamic>>> _resolveMotherDoc(
    User user,
  ) async {
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

      final byEmail = await _db
          .collection('mothers')
          .where('email', isEqualTo: email)
          .limit(1)
          .get();
      if (byEmail.docs.isNotEmpty) {
        return byEmail.docs.first;
      }
    }

    throw const AppAuthException('Unable to find your mother profile.');
  }

  DateTime? _readDate(dynamic value) {
    if (value == null) return null;
    if (value is Timestamp) return value.toDate();
    if (value is DateTime) return value;
    return DateTime.tryParse('$value');
  }

  String _conversationId(String motherUid, String staffUid, String role) {
    return '${motherUid}_${role}_$staffUid';
  }

  Future<Map<String, String>> _encryptMessageText(String text) async {
    final secretBox = await _cipher.encrypt(
      utf8.encode(text),
      secretKey: await _secretKey(),
    );

    return {
      'algorithm': _algorithm,
      'keyVersion': _keyVersion,
      'ciphertext': base64Encode(secretBox.cipherText),
      'iv': base64Encode(secretBox.nonce),
      'authTag': base64Encode(secretBox.mac.bytes),
    };
  }

  Future<SecretKey> _secretKey() async {
    final configured = _configuredKey.trim();
    if (configured.isNotEmpty) {
      return SecretKey(base64Decode(configured));
    }

    return SecretKey(utf8.encode(_defaultDevelopmentKey));
  }

  Future<String> _decryptMessageText(Map<String, dynamic> data) async {
    final legacyText = '${data['text'] ?? ''}';
    final ciphertext = '${data['ciphertext'] ?? ''}';
    final iv = '${data['iv'] ?? ''}';
    final authTag = '${data['authTag'] ?? ''}';

    if (ciphertext.isEmpty || iv.isEmpty || authTag.isEmpty) {
      return legacyText;
    }

    try {
      final clearBytes = await _cipher.decrypt(
        SecretBox(
          base64Decode(ciphertext),
          nonce: base64Decode(iv),
          mac: Mac(base64Decode(authTag)),
        ),
        secretKey: await _secretKey(),
      );
      return utf8.decode(clearBytes);
    } catch (_) {
      return 'Unable to decrypt message';
    }
  }

  String _staffName(String value, String role) {
    final name = value.trim();
    if (role == 'doctor') {
      if (name.isEmpty || name.toLowerCase() == 'doctor') {
        return 'Assigned doctor';
      }
      return name.toLowerCase().startsWith('dr.') ? name : 'Dr. $name';
    }

    if (name.isEmpty || name.toLowerCase() == 'midwife') {
      return 'Assigned midwife';
    }
    return name.toLowerCase().startsWith('midwife ') ? name : 'Midwife $name';
  }
}
