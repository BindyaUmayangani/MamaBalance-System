import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../config/app_config.dart';
import '../models/app_session.dart';

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

class EmailPasswordResetSession {
  final String requestId;
  final String email;

  const EmailPasswordResetSession({
    required this.requestId,
    required this.email,
  });
}

class VerifiedEmailPasswordResetSession {
  final String requestId;
  final String email;
  final String resetToken;

  const VerifiedEmailPasswordResetSession({
    required this.requestId,
    required this.email,
    required this.resetToken,
  });
}

enum SessionRestoreStatus {
  restored,
  noSession,
  expired,
}

class AuthService {
  AuthService._();

  static final AuthService instance = AuthService._();

  FirebaseAuth get _auth => FirebaseAuth.instance;
  static const Duration _otpRequestCooldown = Duration(seconds: 60);
  static const Duration _otpRateLimitCooldown = Duration(minutes: 5);
  static const Duration _backendTimeout = Duration(seconds: 20);
  static const Duration _fullLoginLifetime = Duration(days: 7);
  static const String _lastFullLoginAtKey = 'last_full_login_at';

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
      final response = await http.post(
        _emailLoginEndpoint(),
        headers: const {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email.trim().toLowerCase(),
          'password': password,
        }),
      ).timeout(_backendTimeout);

      final payload = _decodeJson(response.body);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AppAuthException(
          payload['error'] as String? ??
              'Incorrect email or password. Use your registered personal email, or sign in with your phone number.',
        );
      }

      final customToken = '${payload['customToken'] ?? ''}'.trim();
      if (customToken.isEmpty) {
        throw const AppAuthException('Unable to complete sign-in right now.');
      }

      final credential = await _auth.signInWithCustomToken(customToken);
      await _ensureMobileAccess(credential.user);
      await _recordFreshFullLogin();
    } on AppAuthException {
      rethrow;
    } on SocketException {
      throw const AppAuthException(
        'Cannot reach the MamaBalance mobile backend. Make sure the web API is running and the phone can access that IP address.',
      );
    } on HttpException {
      throw const AppAuthException(
        'The email login service returned an invalid response. Please try again shortly.',
      );
    } on FormatException {
      throw const AppAuthException(
        'The email login service returned an unreadable response. Please try again shortly.',
      );
    } on TimeoutException {
      throw const AppAuthException(
        'The email login request timed out. Check the backend connection and try again.',
      );
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
      ).timeout(_backendTimeout);

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
    } on SocketException {
      throw const AppAuthException(
        'Cannot reach the MamaBalance mobile backend. Make sure the web API is running and the phone can access that IP address.',
      );
    } on HttpException {
      throw const AppAuthException(
        'The OTP service returned an invalid response. Please try again shortly.',
      );
    } on FormatException {
      throw const AppAuthException(
        'The OTP service returned an unreadable response. Please try again shortly.',
      );
    } on TimeoutException {
      throw const AppAuthException(
        'The OTP request timed out. Check the backend connection and try again.',
      );
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
      ).timeout(_backendTimeout);

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
      await _ensureMobileAccess(result.user);
      await _recordFreshFullLogin();
    } on AppAuthException {
      rethrow;
    } on SocketException {
      throw const AppAuthException(
        'Cannot reach the MamaBalance mobile backend. Make sure the web API is running and the phone can access that IP address.',
      );
    } on HttpException {
      throw const AppAuthException(
        'The OTP verification service returned an invalid response. Please try again shortly.',
      );
    } on FormatException {
      throw const AppAuthException(
        'The OTP verification service returned an unreadable response. Please try again shortly.',
      );
    } on TimeoutException {
      throw const AppAuthException(
        'The OTP verification request timed out. Check the backend connection and try again.',
      );
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

  Future<EmailPasswordResetSession> sendMotherPasswordResetEmailOtp(
    String email,
  ) async {
    final normalizedEmail = email.trim().toLowerCase();

    if (normalizedEmail.isEmpty) {
      throw const AppAuthException('Please enter your personal email.');
    }

    try {
      final response = await http
          .post(
            _emailPasswordResetEndpoint(),
            headers: const {'Content-Type': 'application/json'},
            body: jsonEncode({'email': normalizedEmail}),
          )
          .timeout(_backendTimeout);

      final payload = _decodeJson(response.body);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AppAuthException(
          payload['error'] as String? ?? 'Unable to send OTP right now.',
        );
      }

      return EmailPasswordResetSession(
        requestId: '${payload['requestId'] ?? ''}',
        email: '${payload['email'] ?? normalizedEmail}',
      );
    } on AppAuthException {
      rethrow;
    } on SocketException {
      throw const AppAuthException(
        'Cannot reach the MamaBalance mobile backend. Make sure the web API is running and the phone can access that IP address.',
      );
    } on TimeoutException {
      throw const AppAuthException(
        'The OTP request timed out. Check the backend connection and try again.',
      );
    } catch (_) {
      throw const AppAuthException('Unable to send OTP right now.');
    }
  }

  Future<VerifiedEmailPasswordResetSession> verifyMotherPasswordResetEmailOtp({
    required String requestId,
    required String otp,
  }) async {
    try {
      final response = await http
          .patch(
            _emailPasswordResetEndpoint(),
            headers: const {'Content-Type': 'application/json'},
            body: jsonEncode({
              'requestId': requestId,
              'otp': otp.trim(),
            }),
          )
          .timeout(_backendTimeout);

      final payload = _decodeJson(response.body);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AppAuthException(
          payload['error'] as String? ?? 'Unable to verify OTP right now.',
        );
      }

      return VerifiedEmailPasswordResetSession(
        requestId: '${payload['requestId'] ?? requestId}',
        email: '${payload['email'] ?? ''}',
        resetToken: '${payload['resetToken'] ?? ''}',
      );
    } on AppAuthException {
      rethrow;
    } on SocketException {
      throw const AppAuthException(
        'Cannot reach the MamaBalance mobile backend. Make sure the web API is running and the phone can access that IP address.',
      );
    } on TimeoutException {
      throw const AppAuthException(
        'The OTP verification request timed out. Check the backend connection and try again.',
      );
    } catch (_) {
      throw const AppAuthException('Unable to verify OTP right now.');
    }
  }

  Future<void> resetMotherPasswordWithEmailOtp({
    required String requestId,
    required String resetToken,
    required String newPassword,
    required String confirmPassword,
  }) async {
    try {
      final response = await http
          .put(
            _emailPasswordResetEndpoint(),
            headers: const {'Content-Type': 'application/json'},
            body: jsonEncode({
              'requestId': requestId,
              'resetToken': resetToken,
              'password': newPassword.trim(),
              'confirmPassword': confirmPassword.trim(),
            }),
          )
          .timeout(_backendTimeout);

      final payload = _decodeJson(response.body);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AppAuthException(
          payload['error'] as String? ?? 'Unable to reset password right now.',
        );
      }
    } on AppAuthException {
      rethrow;
    } on SocketException {
      throw const AppAuthException(
        'Cannot reach the MamaBalance mobile backend. Make sure the web API is running and the phone can access that IP address.',
      );
    } on TimeoutException {
      throw const AppAuthException(
        'The password reset request timed out. Check the backend connection and try again.',
      );
    } catch (_) {
      throw const AppAuthException('Unable to reset password right now.');
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
      await _ensureMobileAccess(user);
      await user.updatePassword(newPassword.trim());
      await user.reload();
    } on FirebaseAuthException catch (error) {
      throw AppAuthException(_mapFirebaseError(error));
    }
  }

  Future<SessionRestoreStatus> restoreSession() async {
    final user = _auth.currentUser;

    if (user == null) {
      return SessionRestoreStatus.noSession;
    }

    try {
      await _ensureMobileAccess(user);
      final isFresh = await isFullLoginStillValid();
      if (!isFresh) {
        await signOut();
        return SessionRestoreStatus.expired;
      }

      return SessionRestoreStatus.restored;
    } catch (_) {
      return SessionRestoreStatus.noSession;
    }
  }

  Future<SessionRestoreStatus> restoreMotherSession() async {
    return restoreSession();
  }

  Future<void> signOut() async {
    await _clearFullLoginRecord();
    await _auth.signOut();
  }

  Future<bool> isFullLoginStillValid() async {
    final prefs = await SharedPreferences.getInstance();
    final lastLoginMillis = prefs.getInt(_lastFullLoginAtKey);
    if (lastLoginMillis == null) {
      return false;
    }

    final expiresAt = DateTime.fromMillisecondsSinceEpoch(lastLoginMillis)
        .add(_fullLoginLifetime);
    return DateTime.now().isBefore(expiresAt);
  }

  Future<void> expireCurrentSession() async {
    await signOut();
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

  Future<AppSession?> currentSession() async {
    final user = _auth.currentUser;
    if (user == null) {
      return null;
    }

    return _fetchMobileSession(user);
  }

  Future<String> homeRouteForCurrentUser() async {
    final session = await currentSession();
    return session?.role.homeRoute ?? '/home';
  }

  Future<void> _ensureMobileAccess(User? user) async {
    if (user == null) {
      throw const AppAuthException('Authentication failed. Please try again.');
    }

    try {
      await _fetchMobileSession(user);
    } on AppAuthException {
      await signOut();
      rethrow;
    }
  }

  Future<AppSession> _fetchMobileSession(User user) async {
    final token = await user.getIdToken();
    if (token == null || token.trim().isEmpty) {
      throw const AppAuthException('Please sign in again to continue.');
    }

    try {
      final response = await http.get(
        _sessionEndpoint(),
        headers: {
          'Authorization': 'Bearer $token',
          'Accept': 'application/json',
        },
      ).timeout(_backendTimeout);
      final payload = _decodeJson(response.body);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AppAuthException(
          payload['error'] as String? ??
              'This account has not been registered in MamaBalance yet.',
        );
      }
      final session = payload['session'] is Map<String, dynamic>
          ? payload['session'] as Map<String, dynamic>
          : <String, dynamic>{};
      final role = AppUserRoleX.fromString(session['role']);
      if (!role.isMobileUser) {
        throw const AppAuthException(
          'This sign-in page is only for mothers and guardians. Staff must use the web portal.',
        );
      }
      return AppSession(
        uid: '${session['uid'] ?? user.uid}',
        role: role,
      );
    } on AppAuthException {
      rethrow;
    } on TimeoutException {
      throw const AppAuthException('The session check timed out.');
    } on SocketException {
      throw const AppAuthException('Unable to reach the mobile backend.');
    } on FormatException {
      throw const AppAuthException('The mobile backend returned an invalid session response.');
    }
  }

  String _mapFirebaseError(FirebaseAuthException error) {
    switch (error.code) {
      case 'invalid-email':
        return 'Please enter a valid email address.';
      case 'invalid-credential':
      case 'wrong-password':
      case 'user-not-found':
        return 'Incorrect email or password. Use your registered personal email, or sign in with your phone number.';
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

  Future<void> _recordFreshFullLogin() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(
      _lastFullLoginAtKey,
      DateTime.now().millisecondsSinceEpoch,
    );
  }

  Future<void> _clearFullLoginRecord() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_lastFullLoginAtKey);
  }

  String _otpCooldownKey(String phoneNumber) => 'otp_cooldown_$phoneNumber';

  Uri _otpEndpoint() {
    final baseUrl = AppConfig.backendBaseUrl.trim();
    if (baseUrl.isEmpty) {
      throw const AppAuthException('The mobile backend URL has not been configured.');
    }

    return Uri.parse('${baseUrl.replaceFirst(RegExp(r'/$'), '')}/api/mobile/auth/otp');
  }

  Uri _emailLoginEndpoint() {
    final baseUrl = AppConfig.backendBaseUrl.trim();
    if (baseUrl.isEmpty) {
      throw const AppAuthException('The mobile backend URL has not been configured.');
    }

    return Uri.parse(
      '${baseUrl.replaceFirst(RegExp(r'/$'), '')}/api/mobile/auth/email-login',
    );
  }

  Uri _sessionEndpoint() {
    final baseUrl = AppConfig.backendBaseUrl.trim();
    if (baseUrl.isEmpty) {
      throw const AppAuthException('The mobile backend URL has not been configured.');
    }

    return Uri.parse(
      '${baseUrl.replaceFirst(RegExp(r'/$'), '')}/api/mobile/session',
    );
  }

  Uri _emailPasswordResetEndpoint() {
    final baseUrl = AppConfig.backendBaseUrl.trim();
    if (baseUrl.isEmpty) {
      throw const AppAuthException('The mobile backend URL has not been configured.');
    }

    return Uri.parse(
      '${baseUrl.replaceFirst(RegExp(r'/$'), '')}/api/mobile/auth/email-password-reset',
    );
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
