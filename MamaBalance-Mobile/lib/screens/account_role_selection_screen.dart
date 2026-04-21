import 'package:flutter/material.dart';

class AccountRoleSelectionScreen extends StatelessWidget {
  const AccountRoleSelectionScreen({super.key});

  static const Color _accent = Color(0xFF4FA38A);
  static const Color _text = Color(0xFF203C35);
  static const Color _muted = Color(0xFF5F736B);

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
                'Choose Your Account',
                style: TextStyle(
                  fontSize: 30,
                  fontWeight: FontWeight.w800,
                  color: _text,
                ),
              ),
              const SizedBox(height: 10),
              const Text(
                'Select how you want to continue. Mothers can use email or phone sign-in. Guardians use phone OTP and can unlock saved sessions with biometrics later.',
                style: TextStyle(
                  fontSize: 15,
                  color: _muted,
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
                        color: _accent.withOpacity(0.14),
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
              _RoleCard(
                icon: Icons.favorite_border_rounded,
                title: 'Mother Account',
                subtitle:
                    'Use your MamaBalance email and password, or sign in with your phone number.',
                actionLabel: 'Continue as Mother',
                onTap: () {
                  Navigator.pushNamed(context, '/mother-signin');
                },
              ),
              const SizedBox(height: 16),
              _RoleCard(
                icon: Icons.family_restroom_outlined,
                title: 'Guardian Account',
                subtitle:
                    'Use the guardian phone number linked to the mother profile. Saved sessions can be unlocked with fingerprint or face ID.',
                actionLabel: 'Continue as Guardian',
                onTap: () {
                  Navigator.pushNamed(context, '/guardian-signin');
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RoleCard extends StatelessWidget {
  const _RoleCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.actionLabel,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final String actionLabel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
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
          Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
              color: const Color(0xFFEAF6F1),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Icon(icon, color: AccountRoleSelectionScreen._accent),
          ),
          const SizedBox(height: 16),
          Text(
            title,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: AccountRoleSelectionScreen._text,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            style: const TextStyle(
              fontSize: 14,
              height: 1.5,
              color: AccountRoleSelectionScreen._muted,
            ),
          ),
          const SizedBox(height: 18),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: onTap,
              style: ElevatedButton.styleFrom(
                backgroundColor: AccountRoleSelectionScreen._accent,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: Text(
                actionLabel,
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
