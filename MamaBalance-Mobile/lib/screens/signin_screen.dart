import 'package:flutter/material.dart';

import '../services/auth_service.dart';
import '../services/post_login_biometric_flow.dart';

enum SignInMethod { email, phone }

class SignInScreen extends StatefulWidget {
  final SignInMethod initialMethod;

  const SignInScreen({
    super.key,
    this.initialMethod = SignInMethod.email,
  });

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();

  late SignInMethod _selectedMethod;
  bool _obscurePassword = true;
  bool _isSubmitting = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _selectedMethod = widget.initialMethod;
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _signInWithEmail() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty || password.isEmpty) {
      setState(() {
        _errorMessage = 'Please enter both your email and password.';
      });
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      await AuthService.instance.signInMotherWithEmail(
        email: email,
        password: password,
      );

      if (!mounted) return;
      await PostLoginBiometricFlow.complete(context);
    } on AppAuthException catch (error) {
      setState(() => _errorMessage = error.message);
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  Future<void> _sendOtp() async {
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
        signOutFirst: true,
        onAutoVerify: (user) {
          if (!mounted) return;
          PostLoginBiometricFlow.complete(context);
        },
      );

      if (!mounted) return;
      Navigator.pushNamed(context, '/otp', arguments: otpSession);
    } on AppAuthException catch (error) {
      setState(() => _errorMessage = error.message);
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  Widget _buildMethodToggle() {
    return Container(
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        color: const Color(0xFFF4F8F7),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFD8E8E2)),
      ),
      child: Row(
        children: [
          Expanded(
            child: _buildMethodButton(
              label: 'Email Login',
              method: SignInMethod.email,
              icon: Icons.mail_outline,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _buildMethodButton(
              label: 'Phone Login',
              method: SignInMethod.phone,
              icon: Icons.phone_outlined,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMethodButton({
    required String label,
    required SignInMethod method,
    required IconData icon,
  }) {
    final isSelected = _selectedMethod == method;

    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedMethod = method;
          _errorMessage = null;
        });
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF4FA38A) : Colors.transparent,
          borderRadius: BorderRadius.circular(14),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: const Color(0xFF4FA38A).withOpacity(0.22),
                    blurRadius: 16,
                    offset: const Offset(0, 8),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 18,
              color: isSelected ? Colors.white : const Color(0xFF49635A),
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : const Color(0xFF35584E),
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmailForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Sign in with the Firebase login email shared for your MamaBalance account, or use your phone number below.',
          style: TextStyle(
            fontSize: 14,
            color: Color(0xFF5E6F69),
            height: 1.45,
          ),
        ),
        const SizedBox(height: 18),
        TextField(
          controller: _emailController,
          cursorColor: const Color(0xFF4FA38A),
          keyboardType: TextInputType.emailAddress,
          decoration: InputDecoration(
            labelText: 'Email address',
            floatingLabelStyle: const TextStyle(color: Color(0xFF4FA38A)),
            hintText: 'your MamaBalance login email',
            prefixIcon: const Icon(Icons.alternate_email),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(color: Colors.grey.shade300),
            ),
            focusedBorder: const OutlineInputBorder(
              borderRadius: BorderRadius.all(Radius.circular(14)),
              borderSide: BorderSide(color: Color(0xFF4FA38A), width: 1.5),
            ),
          ),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _passwordController,
          cursorColor: const Color(0xFF4FA38A),
          obscureText: _obscurePassword,
          decoration: InputDecoration(
            labelText: 'Password',
            floatingLabelStyle: const TextStyle(color: Color(0xFF4FA38A)),
            prefixIcon: const Icon(Icons.lock_outline),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(color: Colors.grey.shade300),
            ),
            focusedBorder: const OutlineInputBorder(
              borderRadius: BorderRadius.all(Radius.circular(14)),
              borderSide: BorderSide(color: Color(0xFF4FA38A), width: 1.5),
            ),
            suffixIcon: IconButton(
              icon: Icon(
                _obscurePassword ? Icons.visibility_off : Icons.visibility,
              ),
              onPressed: () {
                setState(() {
                  _obscurePassword = !_obscurePassword;
                });
              },
            ),
          ),
        ),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            onPressed: () => Navigator.pushNamed(context, '/forgot'),
            child: const Text(
              'Forgot Password?',
              style: TextStyle(
                color: Color(0xFF4FA38A),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _isSubmitting ? null : _signInWithEmail,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF4FA38A),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
            child: Text(_isSubmitting ? 'Signing In...' : 'Sign In'),
          ),
        ),
      ],
    );
  }

  Widget _buildPhoneForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Use the phone number saved on your MamaBalance account. You can enter it as +94 or 07XXXXXXXX.',
          style: TextStyle(
            fontSize: 14,
            color: Color(0xFF5E6F69),
            height: 1.45,
          ),
        ),
        const SizedBox(height: 18),
        TextField(
          controller: _phoneController,
          cursorColor: const Color(0xFF4FA38A),
          keyboardType: TextInputType.phone,
          decoration: InputDecoration(
            labelText: 'Phone number',
            floatingLabelStyle: const TextStyle(color: Color(0xFF4FA38A)),
            hintText: '+94 7X XXX XXXX',
            prefixIcon: const Icon(Icons.phone_iphone_outlined),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(color: Colors.grey.shade300),
            ),
            focusedBorder: const OutlineInputBorder(
              borderRadius: BorderRadius.all(Radius.circular(14)),
              borderSide: BorderSide(color: Color(0xFF4FA38A), width: 1.5),
            ),
          ),
        ),
        const SizedBox(height: 10),
        const Text(
          'We will send a one-time verification code to this number.',
          style: TextStyle(
            fontSize: 13,
            color: Color(0xFF7A8B85),
          ),
        ),
        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _isSubmitting ? null : _sendOtp,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF4FA38A),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
            child: Text(_isSubmitting ? 'Sending OTP...' : 'Send OTP'),
          ),
        ),
      ],
    );
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
              const SizedBox(height: 18),
              const Text(
                'Welcome Back',
                style: TextStyle(
                  fontSize: 30,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF203C35),
                ),
              ),
              const SizedBox(height: 10),
              const Text(
                'Sign in to continue your wellbeing journey, view check-ins, and stay connected with your care team.',
                style: TextStyle(
                  fontSize: 15,
                  color: Color(0xFF5F736B),
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 28),
              Center(
                child: Container(
                  width: 180,
                  height: 180,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF4FA38A).withOpacity(0.14),
                        blurRadius: 24,
                        offset: const Offset(0, 14),
                      ),
                    ],
                  ),
                  child: ClipOval(
                    child: Image.asset(
                      'assets/images/signin.png',
                      fit: BoxFit.cover,
                    ),
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
                    const Text(
                      'Choose your sign-in method',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF203C35),
                      ),
                    ),
                    const SizedBox(height: 16),
                    _buildMethodToggle(),
                    const SizedBox(height: 22),
                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 220),
                      child: _selectedMethod == SignInMethod.email
                          ? _buildEmailForm()
                          : _buildPhoneForm(),
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
