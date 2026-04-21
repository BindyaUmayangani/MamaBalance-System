import 'package:flutter/material.dart';

class IntroScreen extends StatefulWidget {
  const IntroScreen({super.key});

  @override
  State<IntroScreen> createState() => _IntroScreenState();
}

class _IntroScreenState extends State<IntroScreen> {
  final PageController _controller = PageController();
  int _currentPage = 0;

  final List<Map<String, String>> _pages = [
    {
      'image': 'assets/images/intro1.png',
      'eyebrow': 'MamaBalance Care',
      'heading': 'Welcome to MamaBalance',
      'text': 'Support your emotional wellbeing through motherhood with check-ins, guidance, and care that stays close to you.',
    },
    {
      'image': 'assets/images/intro2.png',
      'eyebrow': 'Weekly EPDS',
      'heading': 'Track how you feel each week',
      'text': 'Complete your EPDS questionnaire in just a few minutes and help your care team understand how you are doing.',
    },
    {
      'image': 'assets/images/intro3.png',
      'eyebrow': 'Care Team Support',
      'heading': 'Stay connected with your doctor',
      'text': 'Reach your assigned doctor, review support updates, and keep important care information in one safe place.',
    },
    {
      'image': 'assets/images/intro4.png',
      'eyebrow': 'Private and Secure',
      'heading': 'Your information stays protected',
      'text': 'Your records are shared only with authorized medical professionals so you can use MamaBalance with confidence.',
    },
  ];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _nextPage() {
    if (_currentPage < _pages.length - 1) {
      _controller.nextPage(
        duration: const Duration(milliseconds: 280),
        curve: Curves.easeInOut,
      );
    } else {
      Navigator.pushReplacementNamed(context, '/signin');
    }
  }

  void _skipIntro() {
    Navigator.pushReplacementNamed(context, '/signin');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFEFF8F4),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 24),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.8),
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(color: const Color(0xFFD5EAE2)),
                    ),
                    child: const Text(
                      'MamaBalance',
                      style: TextStyle(
                        color: Color(0xFF2F5D50),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  TextButton(
                    onPressed: _skipIntro,
                    child: const Text(
                      'Skip',
                      style: TextStyle(
                        color: Color(0xFF4FA38A),
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Expanded(
                child: PageView.builder(
                  controller: _controller,
                  itemCount: _pages.length,
                  onPageChanged: (index) => setState(() => _currentPage = index),
                  itemBuilder: (context, index) {
                    final page = _pages[index];

                    return Column(
                      children: [
                        Expanded(
                          child: Container(
                            width: double.infinity,
                            margin: const EdgeInsets.only(top: 10),
                            padding: const EdgeInsets.fromLTRB(22, 28, 22, 26),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(32),
                              gradient: const LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: [Color(0xFFF7FCFA), Color(0xFFE8F6F1)],
                              ),
                              border: Border.all(color: const Color(0xFFDCEDE6)),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF4FA38A).withOpacity(0.10),
                                  blurRadius: 28,
                                  offset: const Offset(0, 16),
                                ),
                              ],
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFDDF3EC),
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                  child: Text(
                                    page['eyebrow']!,
                                    style: const TextStyle(
                                      color: Color(0xFF4A9079),
                                      fontWeight: FontWeight.w700,
                                      fontSize: 12,
                                      letterSpacing: 0.2,
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 24),
                                Container(
                                  width: 240,
                                  height: 240,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: Colors.white.withOpacity(0.65),
                                    boxShadow: [
                                      BoxShadow(
                                        color: const Color(0xFF4FA38A).withOpacity(0.12),
                                        blurRadius: 22,
                                        offset: const Offset(0, 14),
                                      ),
                                    ],
                                  ),
                                  child: Padding(
                                    padding: const EdgeInsets.all(22),
                                    child: Image.asset(page['image']!),
                                  ),
                                ),
                                const SizedBox(height: 30),
                                Text(
                                  page['heading']!,
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(
                                    fontSize: 28,
                                    height: 1.2,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFF203C35),
                                  ),
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  page['text']!,
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(
                                    fontSize: 16,
                                    height: 1.6,
                                    color: Color(0xFF5F736B),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),
              const SizedBox(height: 22),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(
                  _pages.length,
                  (index) => AnimatedContainer(
                    duration: const Duration(milliseconds: 220),
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    height: 8,
                    width: _currentPage == index ? 28 : 8,
                    decoration: BoxDecoration(
                      color: _currentPage == index
                          ? const Color(0xFF4FA38A)
                          : const Color(0xFFC6DDD5),
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _nextPage,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF4FA38A),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 17),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(18),
                    ),
                  ),
                  child: Text(
                    _currentPage == _pages.length - 1 ? 'Get Started' : 'Next',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
