import 'package:flutter/material.dart';

class PrivacyPolicyPage extends StatelessWidget {
  const PrivacyPolicyPage({
    super.key,
    this.audience = 'mother',
  });

  final String audience;

  static const Color _mint = Color(0xFF4FA38A);
  static const Color _deepMint = Color(0xFF2F7D68);
  static const Color _bg = Color(0xFFF3FBF8);
  static const Color _surface = Color(0xFFECF8F4);
  static const Color _text = Color(0xFF173C3A);
  static const Color _muted = Color(0xFF60756D);

  bool get _isGuardian => audience.trim().toLowerCase() == 'guardian';

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
        child: SingleChildScrollView(
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
                      'Privacy Policy',
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
              Padding(
                padding: const EdgeInsets.only(left: 48),
                child: Text(
                  _isGuardian
                      ? 'Your privacy matters to us. This page explains how MamaBalance handles guardian account details and the linked mother information you are allowed to view.'
                      : 'Your privacy matters to us. This page explains how MamaBalance collects, uses, and protects your information.',
                  style: const TextStyle(
                    fontSize: 15,
                    height: 1.5,
                    color: _muted,
                  ),
                ),
              ),
              const SizedBox(height: 24),
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
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _isGuardian
                          ? 'Guardian access stays limited and protected'
                          : 'Your information stays part of your care',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 21,
                        fontWeight: FontWeight.w800,
                        height: 1.25,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      _isGuardian
                          ? 'Guardian access is limited to linked mother details, care team information, notifications, and support resources needed to help safely.'
                          : 'We collect only the information needed to support your check-ins, communication, and wellbeing journey inside MamaBalance.',
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 14,
                        height: 1.5,
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
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.verified_user_outlined, color: _deepMint, size: 22),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _isGuardian
                            ? 'We do not sell or rent guardian or linked mother information. Access is limited to care support, app services, and required safety or legal reasons.'
                            : 'We do not sell or rent your personal information. Your data is handled only for care support, app services, and required safety or legal reasons.',
                        style: const TextStyle(fontSize: 13.5, color: _muted, height: 1.45),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              _buildSection(
                title: '1. Information We Collect',
                content: _isGuardian
                    ? 'Guardian account details such as your name, phone number, and the linked mother information the app is allowed to display for support purposes.'
                    : 'Personal information such as your name, contact details, and the health information you share through questionnaires, interactions, and app usage.',
                icon: Icons.inventory_2_outlined,
              ),
              const SizedBox(height: 12),
              _buildSection(
                title: '2. How We Use Your Information',
                content: _isGuardian
                    ? 'We use guardian information to verify linked access, show assigned care team details, deliver guardian notifications, and support urgent contact features when needed.'
                    : 'We use your information to personalize your experience, improve MamaBalance features, and support communication related to your care and wellbeing.',
                icon: Icons.settings_suggest_outlined,
              ),
              const SizedBox(height: 12),
              _buildSection(
                title: '3. Data Security',
                content:
                    'We use appropriate technical and organizational measures to protect your information from unauthorized access, disclosure, or misuse.',
                icon: Icons.lock_outline_rounded,
              ),
              const SizedBox(height: 12),
              _buildSection(
                title: '4. Sharing Your Information',
                content: _isGuardian
                    ? 'We do not sell or rent guardian data. Linked mother information is shown only within the permissions allowed for guardian support, legal compliance, and safety.'
                    : 'We do not sell or rent your personal information. Data may only be shared where necessary for your care, legal compliance, or protection of rights.',
                icon: Icons.share_outlined,
              ),
              const SizedBox(height: 12),
              _buildSection(
                title: '5. Your Rights',
                content: _isGuardian
                    ? 'You may request access to or correction of your guardian account details according to the permissions and policies that apply to linked guardian access.'
                    : 'You may request access to, correction of, or deletion of your personal data according to the policies and permissions that apply to your account.',
                icon: Icons.fact_check_outlined,
              ),
              const SizedBox(height: 12),
              _buildSection(
                title: '6. Contact Us',
                content:
                    'If you have any questions about this Privacy Policy, please contact the MamaBalance support team for help.',
                icon: Icons.mail_outline_rounded,
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
