import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/services.dart';
import 'package:local_auth/local_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum BiometricSetupAvailability {
  available,
  unavailable,
}

class BiometricAuthService {
  BiometricAuthService._();

  static final BiometricAuthService instance = BiometricAuthService._();

  final LocalAuthentication _localAuth = LocalAuthentication();
  final FirebaseAuth _auth = FirebaseAuth.instance;

  static const String _enabledPrefix = 'biometric_enabled_';
  static const String _globalEnabledKey = 'biometric_enabled';
  static const String _protectedUidKey = 'biometric_protected_uid';
  bool _authenticationInProgress = false;
  DateTime? _suppressResumeLockUntil;

  String get _currentUid => _auth.currentUser?.uid ?? '';

  bool get authenticationInProgress => _authenticationInProgress;

  bool get shouldSuppressResumeLock {
    final until = _suppressResumeLockUntil;
    if (until == null) {
      return false;
    }

    if (DateTime.now().isAfter(until)) {
      _suppressResumeLockUntil = null;
      return false;
    }

    return true;
  }

  void suppressResumeLockFor(Duration duration) {
    _suppressResumeLockUntil = DateTime.now().add(duration);
  }

  Future<bool> shouldRequireUnlock() async {
    final uid = _currentUid;
    if (uid.isEmpty) {
      return false;
    }

    final prefs = await SharedPreferences.getInstance();
    final enabledForCurrentUser = prefs.getBool('$_enabledPrefix$uid') ?? false;
    final globallyEnabled = prefs.getBool(_globalEnabledKey) ?? false;
    final protectedUid = prefs.getString(_protectedUidKey) ?? '';

    return enabledForCurrentUser || (globallyEnabled && protectedUid == uid);
  }

  Future<bool> isEnabledForCurrentUser() async {
    final uid = _currentUid;
    if (uid.isEmpty) {
      return false;
    }

    final prefs = await SharedPreferences.getInstance();
    final enabledForCurrentUser = prefs.getBool('$_enabledPrefix$uid') ?? false;
    final globallyEnabled = prefs.getBool(_globalEnabledKey) ?? false;
    final protectedUid = prefs.getString(_protectedUidKey) ?? '';

    return enabledForCurrentUser || (globallyEnabled && protectedUid == uid);
  }

  Future<bool> shouldPromptForEnrollment() async {
    final uid = _currentUid;
    if (uid.isEmpty) {
      return false;
    }

    if (await isEnabledForCurrentUser()) {
      return false;
    }

    if (await getAvailability() != BiometricSetupAvailability.available) {
      return false;
    }
    
    return true;
  }

  Future<void> enableForCurrentUser() async {
    final uid = _currentUid;
    if (uid.isEmpty) {
      return;
    }

    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('$_enabledPrefix$uid', true);
    await prefs.setBool(_globalEnabledKey, true);
    await prefs.setString(_protectedUidKey, uid);
  }

  Future<void> disableForCurrentUser() async {
    final uid = _currentUid;
    if (uid.isEmpty) {
      return;
    }

    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('$_enabledPrefix$uid', false);

    final protectedUid = prefs.getString(_protectedUidKey) ?? '';
    if (protectedUid == uid) {
      await prefs.setBool(_globalEnabledKey, false);
      await prefs.remove(_protectedUidKey);
    }
  }

  Future<BiometricSetupAvailability> getAvailability() async {
    try {
      final isSupported = await _localAuth.isDeviceSupported();
      final canCheck = await _localAuth.canCheckBiometrics;
      final enrolled = await _localAuth.getAvailableBiometrics();

      if (!isSupported || !canCheck || enrolled.isEmpty) {
        return BiometricSetupAvailability.unavailable;
      }

      return BiometricSetupAvailability.available;
    } on PlatformException {
      return BiometricSetupAvailability.unavailable;
    }
  }

  Future<String> biometricLabel() async {
    try {
      final biometrics = await _localAuth.getAvailableBiometrics();
      if (biometrics.contains(BiometricType.face)) {
        return 'Face ID';
      }
      if (biometrics.contains(BiometricType.fingerprint) ||
          biometrics.contains(BiometricType.strong) ||
          biometrics.contains(BiometricType.weak)) {
        return 'Fingerprint';
      }
    } on PlatformException {
      return 'biometric';
    }

    return 'biometric';
  }

  Future<bool> authenticateToUnlock({
    String reason = 'Unlock your MamaBalance session',
  }) async {
    _authenticationInProgress = true;
    try {
      final authenticated = await _localAuth.authenticate(
        localizedReason: reason,
        options: const AuthenticationOptions(
          biometricOnly: true,
          stickyAuth: true,
          sensitiveTransaction: true,
        ),
      );

      if (authenticated) {
        suppressResumeLockFor(const Duration(seconds: 2));
      }

      return authenticated;
    } on PlatformException {
      return false;
    } finally {
      _authenticationInProgress = false;
    }
  }
}
