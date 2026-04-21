import 'package:flutter/material.dart';

import '../services/auth_service.dart';
import '../services/biometric_auth_service.dart';

class BiometricLockScreen extends StatefulWidget {
  const BiometricLockScreen({super.key});

  @override
  State<BiometricLockScreen> createState() => _BiometricLockScreenState();
}

class _BiometricLockScreenState extends State<BiometricLockScreen> {
  bool _isUnlocking = false;
  bool _isLoading = true;
  bool _isAvailable = false;
  String _biometricLabel = 'biometric';
  String? _message;

  @override
  void initState() {
    super.initState();
    _loadBiometricState();
  }

  Future<void> _loadBiometricState() async {
    final service = BiometricAuthService.instance;
    final availability = await service.getAvailability();
    final label = await service.biometricLabel();

    if (!mounted) return;
    setState(() {
      _isAvailable = availability == BiometricSetupAvailability.available;
      _biometricLabel = label;
      _message = _isAvailable
          ? null
          : 'Quick unlock is turned on for this account, but $_biometricLabel is not available on this device right now. Sign in again to continue safely.';
      _isLoading = false;
    });
  }

  Future<void> _unlock() async {
    setState(() {
      _isUnlocking = true;
      _message = null;
    });

    final unlocked = await BiometricAuthService.instance.authenticateToUnlock(
      reason: 'Use $_biometricLabel to unlock MamaBalance',
    );

    if (!mounted) return;
    if (unlocked) {
      final homeRoute = await AuthService.instance.homeRouteForCurrentUser();
      if (!mounted) return;
      Navigator.pushNamedAndRemoveUntil(context, homeRoute, (route) => false);
      return;
    }

    setState(() {
      _message = '$_biometricLabel did not match. Please try again or sign out and use OTP login.';
      _isUnlocking = false;
    });
  }

  Future<void> _signOut() async {
    await AuthService.instance.signOut();
    if (!mounted) return;
    Navigator.pushNamedAndRemoveUntil(context, '/signin', (route) => false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFEFF8F4),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Container(
              width: 420,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(28),
                border: Border.all(color: const Color(0xFFDCEBE5)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.06),
                    blurRadius: 24,
                    offset: const Offset(0, 12),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 92,
                    height: 92,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0xFFE8F5F0),
                    ),
                    child: const Icon(
                      Icons.fingerprint_rounded,
                      size: 48,
                      color: Color(0xFF4FA38A),
                    ),
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'Quick Unlock',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF203C35),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Use ${_biometricLabel == 'biometric' ? 'your device biometrics' : _biometricLabel} to unlock your saved MamaBalance session.',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 15,
                      height: 1.5,
                      color: Color(0xFF5F736B),
                    ),
                  ),
                  if (_message != null) ...[
                    const SizedBox(height: 18),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFF1F0),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFFF3B7B4)),
                      ),
                      child: Text(
                        _message!,
                        style: const TextStyle(
                          color: Color(0xFFB6403D),
                          fontWeight: FontWeight.w600,
                          height: 1.4,
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _isLoading || !_isAvailable || _isUnlocking
                          ? null
                          : _unlock,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF4FA38A),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: Text(
                        _isLoading
                            ? 'Checking device...'
                            : _isUnlocking
                                ? 'Unlocking...'
                                : 'Unlock with ${_biometricLabel == 'biometric' ? 'Biometrics' : _biometricLabel}',
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: _signOut,
                    child: const Text(
                      'Sign out and use OTP login',
                      style: TextStyle(
                        color: Color(0xFF4FA38A),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
