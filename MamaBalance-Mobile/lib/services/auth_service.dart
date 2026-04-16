import 'dart:convert';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../config/app_config.dart';

class AppAuthException implements Exception {
  final String message;

  const AppAuthException(this.message);

  @override
  String toString() => message;
}

class OtpSession {
  final String verificationId;
  final String phoneNumber;
  final String purpose;

  const OtpSession({
    required this.verificationId,
    required this.phoneNumber,
    this.purpose = 'login',
  });
}

class AuthService {
  AuthService._();

  static final AuthService instance = AuthService._();

  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _db = FirebaseFirestore.instance;
  static const Duration _otpRequestCooldown = Duration(seconds: 60);
  static const Duration _otpRateLimitCooldown = Duration(minutes: 5);

  User? get currentUser => _auth.currentUser;

  String normalizePhoneNumber(String value) {
    final digits = value.replaceAll(RegExp(r'[\s()-]'), '');

    if (digits.isEmpty) {
      return '';
    }

    if (digits.startsWith('+')) {
      return digits;
    }

    if (digits.startsWith('94')) {
      return '+$digits';
    }

    if (digits.startsWith('0')) {
      return '+94${digits.substring(1)}';
    }

    return digits;
  }

  Future<void> signInMotherWithEmail({
    required String email,
    required String password,
  }) async {
    try {
      final credential = await _auth.signInWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
      await _ensureMotherAccess(credential.user);
    } on FirebaseAuthException catch (error) {
      throw AppAuthException(_mapFirebaseError(error));
    }
  }

  Future<OtpSession> sendMotherOtp(
    String phoneNumber, {
    void Function(User?)? onAutoVerify,
    bool signOutFirst = false,
    String purpose = 'login',
  }) async {
    final normalizedPhone = normalizePhoneNumber(phoneNumber);

    if (normalizedPhone.isEmpty) {
      throw const AppAuthException('Please enter your phone number.');
    }

    final cooldownRemaining = await getOtpCooldownRemaining(normalizedPhone);
    if (cooldownRemaining > Duration.zero) {
      throw AppAuthException(_otpCooldownMessage(cooldownRemaining));
    }

    try {
      if (signOutFirst && _auth.currentUser != null) {
        await signOut();
      }

      final response = await http.post(
        _otpEndpoint(),
        headers: const {'Content-Type': 'application/json'},
        body: jsonEncode({
          'phoneNumber': normalizedPhone,
          'purpose': purpose,
        }),
      );

      final payload = _decodeJson(response.body);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        final message = payload['error'] as String? ?? 'Unable to send OTP right now.';
        if (message.toLowerCase().contains('wait')) {
          await _setOtpCooldown(normalizedPhone, _otpRequestCooldown);
        }
        throw AppAuthException(message);
      }

      await _setOtpCooldown(normalizedPhone, _otpRequestCooldown);
      return OtpSession(
        verificationId: '${payload['requestId'] ?? ''}',
        phoneNumber: '${payload['phoneNumber'] ?? normalizedPhone}',
        purpose: '${payload['purpose'] ?? purpose}',
      );
    } on AppAuthException {
      rethrow;
    } catch (_) {
      throw const AppAuthException('Unable to send OTP right now.');
    }
  }

  Future<void> verifyMotherOtp({
    required String verificationId,
    required String smsCode,
  }) async {
    try {
      final response = await http.patch(
        _otpEndpoint(),
        headers: const {'Content-Type': 'application/json'},
        body: jsonEncode({
          'requestId': verificationId,
          'otp': smsCode.trim(),
        }),
      );

      final payload = _decodeJson(response.body);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AppAuthException(
          payload['error'] as String? ?? 'Unable to verify OTP right now.',
        );
      }

      final customToken = '${payload['customToken'] ?? ''}'.trim();
      if (customToken.isEmpty) {
        throw const AppAuthException('Unable to complete sign-in right now.');
      }

      final result = await _auth.signInWithCustomToken(customToken);
      await _ensureMotherAccess(result.user);
    } on AppAuthException {
      rethrow;
    } on FirebaseAuthException catch (error) {
      throw AppAuthException(_mapFirebaseError(error));
    }
  }

  Future<void> sendPasswordResetEmail(String email) async {
    try {
      await _auth.sendPasswordResetEmail(email: email.trim());
    } on FirebaseAuthException catch (error) {
      throw AppAuthException(_mapFirebaseError(error));
    }
  }

  Future<void> resetMotherPassword({
    required String newPassword,
  }) async {
    final user = _auth.currentUser;

    if (user == null) {
      throw const AppAuthException(
        'Your reset session expired. Please verify your phone number again.',
      );
    }

    if (newPassword.trim().length < 8) {
      throw const AppAuthException(
        'Your new password must be at least 8 characters long.',
      );
    }

    try {
      await _ensureMotherAccess(user);
      await user.updatePassword(newPassword.trim());
      await user.reload();
    } on FirebaseAuthException catch (error) {
      throw AppAuthException(_mapFirebaseError(error));
    }
  }

  Future<bool> restoreMotherSession() async {
    final user = _auth.currentUser;

    if (user == null) {
      return false;
    }

    try {
      await _ensureMotherAccess(user);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> signOut() {
    return _auth.signOut();
  }

  Future<Duration> getOtpCooldownRemaining(String phoneNumber) async {
    final normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (normalizedPhone.isEmpty) {
      return Duration.zero;
    }

    final prefs = await SharedPreferences.getInstance();
    final untilMillis = prefs.getInt(_otpCooldownKey(normalizedPhone));
    if (untilMillis == null) {
      return Duration.zero;
    }

    final remaining = DateTime.fromMillisecondsSinceEpoch(untilMillis)
        .difference(DateTime.now());
    if (remaining <= Duration.zero) {
      await prefs.remove(_otpCooldownKey(normalizedPhone));
      return Duration.zero;
    }

    return remaining;
  }

  Future<void> _ensureMotherAccess(User? user) async {
    if (user == null) {
      throw const AppAuthException('Authentication failed. Please try again.');
    }

    final snapshot = await _resolveMotherUserDoc(user);

    if (snapshot == null || !snapshot.exists) {
      await signOut();
      throw const AppAuthException(
        'This account has not been registered in MamaBalance yet.',
      );
    }

    final data = snapshot.data();
    final role = data?['role'] as String?;
    final status = data?['status'] as String?;

    if (role != 'mother') {
      await signOut();
      throw const AppAuthException(
        'This sign-in page is only for mothers. Staff must use the web portal.',
      );
    }

    if (status != 'active') {
      await signOut();
      throw const AppAuthException(
        'Your account is not active yet. Please contact your care team.',
      );
    }
  }

  Future<DocumentSnapshot<Map<String, dynamic>>?> _resolveMotherUserDoc(
    User user,
  ) async {
    final direct = await _db.collection('users').doc(user.uid).get();
    if (direct.exists) {
      return direct;
    }

    final normalizedPhone = normalizePhoneNumber(user.phoneNumber ?? '');
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

    return null;
  }

  String _mapFirebaseError(FirebaseAuthException error) {
    switch (error.code) {
      case 'invalid-email':
        return 'Please enter a valid email address.';
      case 'invalid-credential':
      case 'wrong-password':
      case 'user-not-found':
        return 'Incorrect email or password. Use your MamaBalance Firebase login email, or sign in with your phone number.';
      case 'invalid-phone-number':
        return 'Please enter a valid phone number.';
      case 'user-disabled':
        return 'This account has been disabled.';
      case 'too-many-requests':
        return _otpCooldownMessage(_otpRateLimitCooldown);
      case 'network-request-failed':
        return 'Network error. Please check your connection.';
      case 'invalid-verification-code':
        return 'The OTP code is invalid.';
      case 'invalid-verification-id':
        return 'This OTP session expired. Please request a new code.';
      case 'session-expired':
        return 'The OTP session expired. Please request a new code.';
      case 'app-not-authorized':
        return 'This app is not authorized for Firebase phone verification yet. Please complete the Android Firebase setup and try again.';
      case 'captcha-check-failed':
      case 'missing-client-identifier':
      case 'internal-error':
        return 'Phone verification is unavailable for this app build right now. Please try again shortly. If it keeps failing, the Firebase Android phone-auth verification setup still needs attention.';
      case 'requires-recent-login':
        return 'Please verify your phone number again before resetting the password.';
      case 'weak-password':
        return 'Please choose a stronger password.';
      default:
        return error.message ?? 'Authentication failed. Please try again.';
    }
  }

  Future<void> _setOtpCooldown(String phoneNumber, Duration duration) async {
    final prefs = await SharedPreferences.getInstance();
    final until = DateTime.now().add(duration).millisecondsSinceEpoch;
    await prefs.setInt(_otpCooldownKey(phoneNumber), until);
  }

  String _otpCooldownKey(String phoneNumber) => 'otp_cooldown_$phoneNumber';

  Uri _otpEndpoint() {
    final baseUrl = AppConfig.backendBaseUrl.trim();
    if (baseUrl.isEmpty) {
      throw const AppAuthException('The mobile backend URL has not been configured.');
    }

    return Uri.parse('${baseUrl.replaceFirst(RegExp(r'/$'), '')}/api/mobile/auth/otp');
  }

  Map<String, dynamic> _decodeJson(String raw) {
    if (raw.trim().isEmpty) {
      return <String, dynamic>{};
    }

    final decoded = jsonDecode(raw);
    return decoded is Map<String, dynamic> ? decoded : <String, dynamic>{};
  }

  String _otpCooldownMessage(Duration remaining) {
    final totalSeconds = remaining.inSeconds;
    if (totalSeconds <= 60) {
      return 'Please wait ${totalSeconds.clamp(1, 60)} seconds before requesting another OTP.';
    }

    final minutes = (totalSeconds / 60).ceil();
    return 'Too many attempts. Please wait about $minutes minute${minutes == 1 ? '' : 's'} before trying again.';
  }
}
