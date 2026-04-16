import 'package:flutter/material.dart';

class AboutAppScreen extends StatelessWidget {
  const AboutAppScreen({super.key});

  static const Color _mint = Color(0xFF4FA38A);
  static const Color _deepMint = Color(0xFF2F7D68);
  static const Color _bg = Color(0xFFF3FBF8);
  static const Color _surface = Color(0xFFECF8F4);
  static const Color _text = Color(0xFF173C3A);
  static const Color _muted = Color(0xFF60756D);

  Widget _buildSection({
    required String title,
    required String content,
    IconData? icon,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFD7EAE3)),
        boxShadow: [
          BoxShadow(
            color: _mint.withOpacity(0.08),
            blurRadius: 18,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (icon != null) ...[
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: _surface,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(icon, color: _mint, size: 22),
                ),
                const SizedBox(width: 12),
              ],
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: _text,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            content,
            style: const TextStyle(
              fontSize: 14,
              height: 1.6,
              color: _muted,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      body: SafeArea(
        child: Stack(
          children: [
            SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.arrow_back_ios_new_rounded, color: _text),
                        onPressed: () => Navigator.of(context).pop(),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Text(
                          'About MamaBalance',
                          style: TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.w800,
                            color: _text,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  const Padding(
                    padding: EdgeInsets.only(left: 48),
                    child: Text(
                      'A gentle digital support space created to help mothers feel seen, supported, and connected through their mental wellbeing journey.',
                      style: TextStyle(
                        fontSize: 15,
                        height: 1.5,
                        color: _muted,
                      ),
                    ),
                  ),
                  const SizedBox(height: 26),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [Color(0xFF67BBA1), Color(0xFF4FA38A)],
                      ),
                      borderRadius: BorderRadius.circular(28),
                      boxShadow: [
                        BoxShadow(
                          color: _mint.withOpacity(0.18),
                          blurRadius: 20,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: const [
                              Text(
                                'Care, connection, and early support',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 22,
                                  fontWeight: FontWeight.w800,
                                  height: 1.25,
                                ),
                              ),
                              SizedBox(height: 10),
                              Text(
                                'MamaBalance was created to make emotional support feel more reachable during motherhood.',
                                style: TextStyle(
                                  color: Colors.white70,
                                  fontSize: 14,
                                  height: 1.45,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 14),
                        Container(
                          width: 96,
                          height: 96,
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.14),
                            borderRadius: BorderRadius.circular(22),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Image.asset(
                              'assets/images/about.png',
                              fit: BoxFit.contain,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFFD7EAE3)),
                    ),
                    child: const Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(Icons.favorite_outline_rounded, color: _deepMint, size: 22),
                        SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'We focus on helping mothers feel seen, supported, and connected through regular check-ins and easier access to care guidance.',
                            style: TextStyle(fontSize: 13.5, color: _muted, height: 1.45),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),
                  _buildSection(
                    title: 'Our Mission',
                    content:
                        'At MamaBalance, we believe every mother deserves emotional support after childbirth. We aim to provide a simple, secure, and compassionate way to monitor and manage postpartum mental health using thoughtful digital care.',
                    icon: Icons.flag_outlined,
                  ),
                  const SizedBox(height: 14),
                  _buildSection(
                    title: 'Why We Exist',
                    content:
                        'Postpartum depression often goes unnoticed after delivery, especially when regular follow-up becomes difficult. MamaBalance helps bridge that gap by making screening, support, and connection easier to access.',
                    icon: Icons.wb_sunny_outlined,
                  ),
                  const SizedBox(height: 14),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [Color(0xFFF7FCFA), Color(0xFFE8F6F1)],
                      ),
                      borderRadius: BorderRadius.circular(22),
                      border: Border.all(color: const Color(0xFFDCEDE6)),
                    ),
                    child: const Text.rich(
                      TextSpan(
                        style: TextStyle(
                          fontSize: 14,
                          height: 1.6,
                          color: _muted,
                        ),
                        children: [
                          TextSpan(
                            text: 'MamaBalance ',
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              color: _text,
                            ),
                          ),
                          TextSpan(
                            text:
                                'is a support space designed to encourage early detection, reduce emotional risk, and help mothers feel heard and safe throughout motherhood.',
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 80),
                ],
              ),
            ),
            const Positioned(
              bottom: 16,
              left: 0,
              right: 0,
              child: Center(
                child: Text(
                  'Version 1.0',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                    color: Color(0xFF7A8D85),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
