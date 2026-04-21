import 'package:flutter/material.dart';

import '../services/auth_service.dart';
import '../services/biometric_auth_service.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  bool _contentVisible = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        setState(() => _contentVisible = true);
      }
    });
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    await Future.delayed(const Duration(seconds: 3));
    final restoreStatus = await AuthService.instance.restoreSession();
    final hasSession = restoreStatus == SessionRestoreStatus.restored;
    final shouldRequireUnlock =
        hasSession && await BiometricAuthService.instance.shouldRequireUnlock();
    final homeRoute = hasSession
        ? await AuthService.instance.homeRouteForCurrentUser()
        : '/home';

    if (!mounted) return;

    Navigator.pushReplacementNamed(
      context,
      hasSession
          ? (shouldRequireUnlock ? '/biometric-lock' : homeRoute)
          : (restoreStatus == SessionRestoreStatus.expired
                ? '/signin'
                : '/intro'),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFFF7FCFA), Color(0xFFE7F5F0), Color(0xFFF1FAF7)],
          ),
        ),
        child: Stack(
          children: [
            Positioned(
              top: -110,
              right: -70,
              child: _decorCircle(
                size: 250,
                colors: const [Color(0xFFD8F0E7), Color(0xFFC6E9DB)],
              ),
            ),
            Positioned(
              left: -90,
              bottom: 90,
              child: _decorCircle(
                size: 210,
                colors: const [Color(0xFFEAF8F3), Color(0xFFD9F0E6)],
              ),
            ),
            Positioned(
              top: 130,
              left: -40,
              child: Transform.rotate(
                angle: -0.35,
                child: Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    color: const Color(0xFFDFF3EB).withOpacity(0.7),
                    borderRadius: BorderRadius.circular(34),
                  ),
                ),
              ),
            ),
            Positioned(
              right: 22,
              bottom: 210,
              child: Container(
                width: 90,
                height: 90,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.34),
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(
                    color: const Color(0xFFD3ECE3).withOpacity(0.9),
                  ),
                ),
              ),
            ),
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(28, 36, 28, 36),
                child: AnimatedOpacity(
                  duration: const Duration(milliseconds: 500),
                  opacity: _contentVisible ? 1 : 0,
                  child: AnimatedSlide(
                    duration: const Duration(milliseconds: 500),
                    offset: _contentVisible
                        ? Offset.zero
                        : const Offset(0, 0.04),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 13,
                            vertical: 8,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.82),
                            borderRadius: BorderRadius.circular(999),
                            border: Border.all(color: const Color(0xFFD6ECE6)),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFF4FA38A).withOpacity(0.06),
                                blurRadius: 18,
                                offset: const Offset(0, 10),
                              ),
                            ],
                          ),
                          child: const Text(
                            'Your care journey starts here',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF4FA38A),
                            ),
                          ),
                        ),
                        const Spacer(),
                        Center(
                          child: Column(
                            children: [
                              Image.asset(
                                'assets/images/logo.png',
                                fit: BoxFit.contain,
                                height: 200,
                              ),
                              const SizedBox(height: 22),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: List.generate(
                                  3,
                                  (index) => Container(
                                    width: index == 1 ? 28 : 8,
                                    height: 8,
                                    margin: const EdgeInsets.symmetric(
                                      horizontal: 4,
                                    ),
                                    decoration: BoxDecoration(
                                      color: index == 1
                                          ? const Color(0xFF4FA38A)
                                          : const Color(0xFFCFE3DB),
                                      borderRadius: BorderRadius.circular(999),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 30),
                        const Center(
                          child: Text(
                            'MamaBalance',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 32,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF173C3A),
                              letterSpacing: -0.4,
                            ),
                          ),
                        ),
                        const SizedBox(height: 10),
                        const Center(
                          child: Text(
                            'Support for check-ins, care visits, and everyday wellbeing in one calm, trusted space.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 15.5,
                              height: 1.5,
                              color: Color(0xFF5E746B),
                            ),
                          ),
                        ),
                        const Spacer(),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 18,
                            vertical: 17,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.88),
                            borderRadius: BorderRadius.circular(24),
                            border: Border.all(color: const Color(0xFFD6ECE6)),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFF4FA38A).withOpacity(0.08),
                                blurRadius: 20,
                                offset: const Offset(0, 10),
                              ),
                            ],
                          ),
                          child: const Row(
                            children: [
                              SizedBox(
                                width: 24,
                                height: 24,
                                child: CircularProgressIndicator(
                                  strokeWidth: 3,
                                  valueColor: AlwaysStoppedAnimation<Color>(
                                    Color(0xFF4FA38A),
                                  ),
                                ),
                              ),
                              SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      'Preparing your care space',
                                      style: TextStyle(
                                        fontSize: 14.5,
                                        fontWeight: FontWeight.w700,
                                        color: Color(0xFF173C3A),
                                      ),
                                    ),
                                    SizedBox(height: 4),
                                    Text(
                                      'Checking your account and loading your latest updates.',
                                      style: TextStyle(
                                        fontSize: 12.5,
                                        height: 1.4,
                                        color: Color(0xFF6A7B79),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _decorCircle({
    required double size,
    required List<Color> colors,
  }) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: colors,
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        shape: BoxShape.circle,
      ),
    );
  }
}
