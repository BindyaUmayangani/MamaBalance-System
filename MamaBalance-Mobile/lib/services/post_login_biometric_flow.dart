import 'package:flutter/material.dart';

import 'auth_service.dart';
import 'biometric_auth_service.dart';

class PostLoginBiometricFlow {
  PostLoginBiometricFlow._();

  static Future<void> complete(BuildContext context) async {
    final biometricService = BiometricAuthService.instance;

    if (await biometricService.shouldPromptForEnrollment()) {
      if (!context.mounted) return;
      await _showEnrollmentDialog(context, biometricService);
    }

    if (!context.mounted) return;
    final shouldRequireUnlock =
        await biometricService.isEnabledForCurrentUser();
    final homeRoute = await AuthService.instance.homeRouteForCurrentUser();
    if (!context.mounted) return;

    Navigator.pushNamedAndRemoveUntil(
      context,
      shouldRequireUnlock ? '/biometric-lock' : homeRoute,
      (route) => false,
    );
  }

  static Future<void> _showEnrollmentDialog(
    BuildContext context,
    BiometricAuthService biometricService,
  ) async {
    final biometricLabel = await biometricService.biometricLabel();
    if (!context.mounted) return;

    final enableBiometrics = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) {
        return Dialog(
          insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
          backgroundColor: Colors.transparent,
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(28),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.08),
                  blurRadius: 30,
                  offset: const Offset(0, 18),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        color: const Color(0xFFE9F6F1),
                        borderRadius: BorderRadius.circular(18),
                      ),
                      child: const Icon(
                        Icons.fingerprint_rounded,
                        color: Color(0xFF4FA38A),
                        size: 30,
                      ),
                    ),
                    const SizedBox(width: 14),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Enable Quick Unlock?',
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF203C35),
                            ),
                          ),
                          SizedBox(height: 4),
                          Text(
                            'Optional for faster access on this device',
                            style: TextStyle(
                              fontSize: 13,
                              color: Color(0xFF6B8078),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                Text(
                  'You are already signed in. Next time, you can use $biometricLabel to unlock your saved MamaBalance session faster.',
                  style: const TextStyle(
                    fontSize: 15,
                    height: 1.55,
                    color: Color(0xFF4E645C),
                  ),
                ),
                const SizedBox(height: 16),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF5FAF8),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: const Color(0xFFD8ECE4)),
                  ),
                  child: const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(
                            Icons.verified_user_outlined,
                            size: 18,
                            color: Color(0xFF4FA38A),
                          ),
                          SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'Your OTP or password is still your real sign-in method.',
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF203C35),
                              ),
                            ),
                          ),
                        ],
                      ),
                      SizedBox(height: 10),
                      Text(
                        'MamaBalance only uses the fingerprint or face ID already added in your phone settings. The app does not create or store a new fingerprint.',
                        style: TextStyle(
                          height: 1.5,
                          color: Color(0xFF60756D),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 22),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF4FA38A),
                          side: const BorderSide(color: Color(0xFF4FA38A)),
                          padding: const EdgeInsets.symmetric(vertical: 15),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        onPressed: () => Navigator.of(dialogContext).pop(false),
                        child: const Text(
                          'Not Now',
                          style: TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF4FA38A),
                          foregroundColor: Colors.white,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(vertical: 15),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        onPressed: () => Navigator.of(dialogContext).pop(true),
                        child: const Text(
                          'Enable',
                          style: TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );

    if (enableBiometrics == true) {
      final authenticated = await biometricService.authenticateToUnlock(
        reason: 'Confirm $biometricLabel for quick MamaBalance unlock',
      );

      if (authenticated) {
        await biometricService.enableForCurrentUser();
        if (!context.mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              '$biometricLabel unlock is now enabled for this device.',
            ),
          ),
        );
      } else {
        if (!context.mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              '$biometricLabel was not confirmed, so quick unlock stayed off.',
            ),
          ),
        );
      }
      return;
    }
  }
}
