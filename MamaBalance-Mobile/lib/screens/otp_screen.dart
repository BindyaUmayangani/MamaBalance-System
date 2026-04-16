import 'dart:async';
import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../widgets/otp_code_field.dart';

class OtpScreen extends StatefulWidget {
  const OtpScreen({super.key});

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  int _secondsRemaining = 60;
  Timer? _timer;
  bool _isSubmitting = false;
  bool _isResending = false;
  String? _errorMessage;
  String _otpCode = '';

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

  Future<void> _verifyOtp(String verificationId) async {
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
      await AuthService.instance.verifyMotherOtp(
        verificationId: verificationId,
        smsCode: code,
      );

      if (!mounted) return;
      Navigator.pushNamedAndRemoveUntil(context, '/home', (route) => false);
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
      final otpSession = await AuthService.instance.sendMotherOtp(
        session.phoneNumber,
        purpose: session.purpose,
        signOutFirst: true,
        onAutoVerify: (user) {
          if (mounted) {
            Navigator.pushNamedAndRemoveUntil(context, '/home', (route) => false);
          }
        },
      );

      if (!mounted) return;
      _startTimer();
      Navigator.pushReplacementNamed(context, '/otp', arguments: otpSession);
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
    final otpSession =
        ModalRoute.of(context)?.settings.arguments as OtpSession?;

    return Scaffold(
      backgroundColor: const Color(0xFFEFF8F4),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Color(0xFF203C35)),
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
                        color: Color(0xFF203C35),
                      ),
                    ),
                  ),
                ],
              ),
              Padding(
                padding: const EdgeInsets.only(left: 48),
                child: Text(
                  otpSession == null
                      ? 'Request a new OTP session to continue.'
                      : 'Enter the code sent to ${otpSession.phoneNumber}',
                  style: const TextStyle(fontSize: 16, color: Colors.black87),
                ),
              ),
              const SizedBox(height: 32),
              Center(
                child: ClipOval(
                  child: Image.asset(
                    'assets/images/signin.png',
                    height: 200,
                    width: 200,
                    fit: BoxFit.cover,
                  ),
                ),
              ),
              const SizedBox(height: 40),
              Container(
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: const Color(0xFFDCEBE5)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    OtpCodeField(
                      onChanged: (value) {
                        setState(() {
                          _otpCode = value;
                        });
                      },
                    ),
                    if (_errorMessage != null) ...[
                      const SizedBox(height: 12),
                      Text(
                        _errorMessage!,
                        style: const TextStyle(
                          color: Color(0xFFB6403D),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed:
                            otpSession == null || _isSubmitting
                                ? null
                                : () => _verifyOtp(otpSession.verificationId),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF4FA38A),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: Text(
                          _isSubmitting ? 'Verifying...' : 'Verify OTP',
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),
                    TextButton(
                      onPressed:
                          otpSession == null || _isSubmitting || _isResending || _secondsRemaining > 0
                              ? null
                              : () => _resendOtp(otpSession),
                      child: Text(
                        _isResending 
                            ? 'Sending code...' 
                            : _secondsRemaining > 0 
                                ? 'Resend code in ${_secondsRemaining}s' 
                                : 'Resend OTP',
                        style: TextStyle(
                          color: _secondsRemaining > 0 ? Color(0xFF6A7B79) : const Color(0xFF4FA38A),
                          fontWeight: FontWeight.w700,
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
