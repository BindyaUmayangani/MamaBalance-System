import 'package:flutter/material.dart';

import '../services/auth_service.dart';
import 'otp_verification_screen.dart';
import 'reset_password_screen.dart';

enum ForgotPasswordMethod { email, phone }

class ForgotPasswordScreen extends StatefulWidget {
  final ForgotPasswordMethod method;

  const ForgotPasswordScreen({
    super.key,
    this.method = ForgotPasswordMethod.email,
  });

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  bool _isSubmitting = false;
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  bool get _usesEmail => widget.method == ForgotPasswordMethod.email;

  Future<void> _continueWithEmail() async {
    final email = _emailController.text.trim();

    if (email.isEmpty || !email.contains('@')) {
      setState(() {
        _errorMessage = 'Please enter your registered personal email.';
      });
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      final emailResetSession =
          await AuthService.instance.sendMotherPasswordResetEmailOtp(email);

      if (!mounted) return;
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => OTPVerificationScreen(
            emailResetSession: emailResetSession,
          ),
        ),
      );
    } on AppAuthException catch (error) {
      setState(() => _errorMessage = error.message);
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  Future<void> _continueWithPhone() async {
    final phoneNumber = _phoneController.text.trim();

    // Basic validation for Sri Lankan format (9-10 digits)
    final digitsOnly = phoneNumber.replaceAll(RegExp(r'[^0-9]'), '');
    if (digitsOnly.length < 9) {
      setState(() {
        _errorMessage = 'Please enter a valid mobile number (e.g. 07XXXXXXXX).';
      });
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      final otpSession = await AuthService.instance.sendMotherOtp(
        phoneNumber,
        purpose: 'forgot-password',
        signOutFirst: true,
        onAutoVerify: (user) {
          if (mounted) {
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(
                builder: (_) => const ResetPasswordScreen(),
              ),
            );
          }
        },
      );

      if (!mounted) return;
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => OTPVerificationScreen(session: otpSession),
        ),
      );
    } on AppAuthException catch (error) {
      setState(() => _errorMessage = error.message);
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFEFF8F4),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
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
                      'Forgot Password',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF203C35),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Padding(
                padding: const EdgeInsets.only(left: 48),
                child: Text(
                  _usesEmail
                      ? 'Enter your personal email and we will send a verification code to reset your password.'
                      : 'Enter your mobile number and we will guide you through verifying your account and resetting your password.',
                  style: const TextStyle(
                    fontSize: 15,
                    height: 1.5,
                    color: Color(0xFF5F736B),
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
                        color: const Color(0xFF4FA38A).withOpacity(0.14),
                        blurRadius: 24,
                        offset: const Offset(0, 14),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.lock_reset_rounded,
                    size: 74,
                    color: Color(0xFF4FA38A),
                  ),
                ),
              ),
              const SizedBox(height: 28),
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
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _usesEmail
                          ? 'Verify with your personal email'
                          : 'Verify with your phone number',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF203C35),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      _usesEmail
                          ? 'Use the personal email saved on your MamaBalance mother account.'
                          : 'Use the phone number saved on your MamaBalance account.',
                      style: const TextStyle(
                        fontSize: 14,
                        color: Color(0xFF60756D),
                      ),
                    ),
                    const SizedBox(height: 18),
                    TextField(
                      controller: _usesEmail ? _emailController : _phoneController,
                      cursorColor: const Color(0xFF4FA38A),
                      keyboardType:
                          _usesEmail ? TextInputType.emailAddress : TextInputType.phone,
                      decoration: InputDecoration(
                        labelText: _usesEmail ? 'Personal email' : 'Mobile number',
                        floatingLabelStyle:
                            const TextStyle(color: Color(0xFF4FA38A)),
                        hintText:
                            _usesEmail ? 'your@email.com' : '+94 7X XXX XXXX',
                        prefixIcon: Icon(
                          _usesEmail
                              ? Icons.alternate_email_rounded
                              : Icons.phone_iphone_outlined,
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide(color: Colors.grey.shade300),
                        ),
                        focusedBorder: const OutlineInputBorder(
                          borderRadius: BorderRadius.all(Radius.circular(14)),
                          borderSide:
                              BorderSide(color: Color(0xFF4FA38A), width: 1.5),
                        ),
                      ),
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
                        onPressed: _isSubmitting
                            ? null
                            : _usesEmail
                                ? _continueWithEmail
                                : _continueWithPhone,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF4FA38A),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: Text(
                          _isSubmitting ? 'Sending OTP...' : 'Continue',
                          style: const TextStyle(fontWeight: FontWeight.w700),
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
