import 'dart:async';
import 'package:flutter/material.dart';

import '../services/auth_service.dart';
import '../services/post_login_biometric_flow.dart';
import '../widgets/otp_code_field.dart';
import 'reset_password_screen.dart';

class OTPVerificationScreen extends StatefulWidget {
  final OtpSession? session;
  final EmailPasswordResetSession? emailResetSession;

  const OTPVerificationScreen({
    super.key,
    this.session,
    this.emailResetSession,
  });

  @override
  State<OTPVerificationScreen> createState() => _OTPVerificationScreenState();
}

class _OTPVerificationScreenState extends State<OTPVerificationScreen> {
  int _secondsRemaining = 60;
  Timer? _timer;
  bool _isSubmitting = false;
  bool _isResending = false;
  String? _errorMessage;
  String _otpCode = '';

  bool get _isForgotPasswordFlow =>
      widget.session?.purpose == 'forgot-password' ||
      widget.emailResetSession != null;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  void _startTimer() {
    _secondsRemaining = 60;
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_secondsRemaining == 0) {
        timer.cancel();
      } else {
        setState(() {
          _secondsRemaining--;
        });
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _verifyOtp() async {
    final code = _otpCode.trim();

    if (code.isEmpty) {
      setState(() {
        _errorMessage = 'Please enter the OTP code.';
      });
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      final emailResetSession = widget.emailResetSession;
      final phoneSession = widget.session;

      if (emailResetSession != null) {
        final verifiedSession =
            await AuthService.instance.verifyMotherPasswordResetEmailOtp(
          requestId: emailResetSession.requestId,
          otp: code,
        );

        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => ResetPasswordScreen(
              emailResetSession: verifiedSession,
            ),
          ),
        );
        return;
      }

      if (phoneSession == null) {
        throw const AppAuthException(
          'Your reset session has expired. Please request a new OTP.',
        );
      }

      await AuthService.instance.verifyMotherOtp(
        verificationId: phoneSession.verificationId,
        smsCode: code,
      );

      if (!mounted) return;
      if (_isForgotPasswordFlow) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => const ResetPasswordScreen(),
          ),
        );
      } else {
        await PostLoginBiometricFlow.complete(context);
      }
    } on AppAuthException catch (error) {
      setState(() => _errorMessage = error.message);
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  Future<void> _resendOtp(OtpSession session) async {
    setState(() {
      _isResending = true;
      _errorMessage = null;
    });

    try {
      final refreshed = await AuthService.instance.sendMotherOtp(
        session.phoneNumber,
        purpose: session.purpose,
        signOutFirst: true,
        onAutoVerify: (user) {
          if (!mounted) return;
          if (session.purpose == 'forgot-password') {
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(
                builder: (_) => const ResetPasswordScreen(),
              ),
            );
          } else {
            PostLoginBiometricFlow.complete(context);
          }
        },
      );

      if (!mounted) return;
      _startTimer();
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (_) => OTPVerificationScreen(session: refreshed),
        ),
      );
    } on AppAuthException catch (error) {
      setState(() => _errorMessage = error.message);
    } finally {
      if (mounted) {
        setState(() => _isResending = false);
      }
    }
  }

  Future<void> _resendEmailOtp(EmailPasswordResetSession session) async {
    setState(() {
      _isResending = true;
      _errorMessage = null;
    });

    try {
      final refreshed =
          await AuthService.instance.sendMotherPasswordResetEmailOtp(
        session.email,
      );

      if (!mounted) return;
      _startTimer();
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (_) => OTPVerificationScreen(emailResetSession: refreshed),
        ),
      );
    } on AppAuthException catch (error) {
      setState(() => _errorMessage = error.message);
    } finally {
      if (mounted) {
        setState(() => _isResending = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = widget.session;
    final emailResetSession = widget.emailResetSession;
    final hasSession = session != null || emailResetSession != null;
    final destination = emailResetSession?.email ?? session?.phoneNumber ?? '';

    return Scaffold(
      backgroundColor: const Color(0xFFF3FAFD),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Color(0xFF1F3A5F)),
                    onPressed: () => Navigator.pop(context),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Text(
                      'Verify OTP',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF1F3A5F),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Padding(
                padding: const EdgeInsets.only(left: 48),
                child: Text(
                  !hasSession
                      ? 'Your reset session has expired. Please go back and request a new OTP.'
                      : _isForgotPasswordFlow
                          ? 'Enter the verification code sent to $destination so we can let you reset your password.'
                          : 'Enter the verification code sent to $destination so we can safely sign you in.',
                  style: const TextStyle(
                    fontSize: 15,
                    height: 1.5,
                    color: Color(0xFF5F7285),
                  ),
                ),
              ),
              const SizedBox(height: 28),
              Center(
                child: Container(
                  width: 170,
                  height: 170,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withOpacity(0.7),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF4A90C2).withOpacity(0.14),
                        blurRadius: 24,
                        offset: const Offset(0, 14),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.verified_user_outlined,
                    size: 72,
                    color: Color(0xFF4A90C2),
                  ),
                ),
              ),
              const SizedBox(height: 28),
              Container(
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: const Color(0xFFD6EAF5)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Security check',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF1F3A5F),
                      ),
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      'Type the OTP exactly as it appears in the message.',
                      style: TextStyle(
                        fontSize: 14,
                        color: Color(0xFF5F7285),
                      ),
                    ),
                    const SizedBox(height: 18),
                    OtpCodeField(
                      onChanged: (value) {
                        setState(() {
                          _otpCode = value;
                        });
                      },
                    ),
                    if (_errorMessage != null) ...[
                      const SizedBox(height: 16),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFF1F0),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFFF3B7B4)),
                        ),
                        child: Text(
                          _errorMessage!,
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
                        onPressed: !hasSession || _isSubmitting || _isResending
                            ? null
                            : () => _verifyOtp(),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF4A90C2),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: Text(
                          _isSubmitting ? 'Verifying...' : 'Verify Code',
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),
                    Center(
                      child: TextButton(
                        onPressed: !hasSession ||
                                _isSubmitting ||
                                _isResending ||
                                _secondsRemaining > 0
                            ? null
                            : () {
                                if (emailResetSession != null) {
                                  _resendEmailOtp(emailResetSession);
                                } else if (session != null) {
                                  _resendOtp(session);
                                }
                              },
                        child: Text(
                          _isResending 
                              ? 'Sending code...' 
                              : _secondsRemaining > 0 
                                  ? 'Resend code in ${_secondsRemaining}s' 
                                  : 'Resend OTP',
                          style: TextStyle(
                            color: _secondsRemaining > 0 ? const Color(0xFF5F7285) : const Color(0xFF4A90C2),
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
