import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class EmergencyContactsPage extends StatelessWidget {
  EmergencyContactsPage({super.key, this.audience = 'mother'});

  final String audience;

  static const Color _mint = Color(0xFF4A90C2);
  static const Color _deepMint = Color(0xFF1F6F99);
  static const Color _bg = Color(0xFFF3FAFD);
  static const Color _surface = Color(0xFFEAF6FC);
  static const Color _text = Color(0xFF1F3A5F);
  static const Color _muted = Color(0xFF5F7285);

  bool get _isGuardian => audience.trim().toLowerCase() == 'guardian';

  Widget _buildContactCard({
    required BuildContext context,
    required IconData icon,
    required String label,
    required String contact,
    required String description,
    bool isPhone = false,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFD6EAF5)),
        boxShadow: [
          BoxShadow(
            color: _mint.withOpacity(0.08),
            blurRadius: 18,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: const Color(0xFFDDF1FA),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFD6EAF5)),
            ),
            child: Icon(icon, color: _mint),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: _text,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  description,
                  style: const TextStyle(
                    fontSize: 14,
                    color: _muted,
                    height: 1.45,
                  ),
                ),
                const SizedBox(height: 12),
                if (isPhone)
                  Semantics(
                    button: true,
                    label: 'Call $label',
                    hint: 'Opens a confirmation before calling',
                    child: InkWell(
                      onTap:
                          () =>
                              _confirmAndLaunchDialer(context, contact, label),
                      borderRadius: BorderRadius.circular(14),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 12,
                        ),
                        decoration: BoxDecoration(
                          color: _surface,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFFD6EAF5)),
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.call_rounded,
                              color: _mint,
                              size: 18,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                contact,
                                style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                  color: _deepMint,
                                ),
                              ),
                            ),
                            const Text(
                              'Call now',
                              style: TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w700,
                                color: _mint,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  )
                else
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      color: _surface,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Text(
                      contact,
                      style: const TextStyle(
                        fontSize: 14.5,
                        color: _text,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
              ],
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
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  IconButton(
                    icon: const Icon(
                      Icons.arrow_back_ios_new_rounded,
                      color: _text,
                    ),
                    onPressed: () => Navigator.of(context).pop(),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(
                      minWidth: 36,
                      minHeight: 36,
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Text(
                      'Emergency Contacts',
                      style: TextStyle(
                        color: _text,
                        fontWeight: FontWeight.w800,
                        fontSize: 28,
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
                      ? 'Quick access to urgent support when the linked mother, baby, or family needs immediate help.'
                      : 'Quick access to immediate support when you, your baby, or your family need urgent help.',
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
                    colors: [Color(0xFF7EC8E3), Color(0xFF4A90C2)],
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
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 52,
                          height: 52,
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.18),
                            borderRadius: BorderRadius.circular(18),
                          ),
                          child: const Icon(
                            Icons.support_agent_rounded,
                            color: Colors.white,
                            size: 28,
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Need help right now?',
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                _isGuardian
                                    ? 'Choose the contact that best fits the situation and call straight away to support the mother safely.'
                                    : 'Choose the contact that matches your situation and call straight away.',
                                style: const TextStyle(
                                  fontSize: 14,
                                  height: 1.45,
                                  color: Colors.white70,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 12,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.14),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: Colors.white.withOpacity(0.18),
                        ),
                      ),
                      child: const Row(
                        children: [
                          Icon(
                            Icons.info_outline_rounded,
                            color: Colors.white,
                            size: 18,
                          ),
                          SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'If someone is in immediate danger, call 119 first.',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 13.5,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              _buildContactCard(
                context: context,
                icon: Icons.local_hospital_outlined,
                label: '24/7 Mental Health Helpline (Sri Lanka)',
                contact: '1926',
                description:
                    _isGuardian
                        ? 'Call any time for urgent mental health support, crisis guidance, or help supporting the mother safely.'
                        : 'Call any time for urgent mental health support, guidance, or crisis help.',
                isPhone: true,
              ),
              const SizedBox(height: 14),
              _buildContactCard(
                context: context,
                icon: Icons.support_agent_outlined,
                label: 'MOH Mental Health Hotline',
                contact: '071 234 5678',
                description:
                    _isGuardian
                        ? 'Reach trained support staff for advice, follow-up, and the next steps for guardian support.'
                        : 'Reach trained support staff for advice, follow-up, and next steps.',
                isPhone: true,
              ),
              const SizedBox(height: 14),
              _buildContactCard(
                context: context,
                icon: Icons.location_on_outlined,
                label: 'Nearest PPD Support Center',
                contact: 'Visit your local MOH clinic',
                description:
                    _isGuardian
                        ? 'If in-person support is needed, the nearest clinic can guide the guardian and family to the right service.'
                        : 'If you prefer in-person help, your nearest clinic can guide you to the right service.',
              ),
              const SizedBox(height: 14),
              _buildContactCard(
                context: context,
                icon: Icons.emergency_outlined,
                label: 'In an Emergency',
                contact: 'Call 119 immediately',
                description:
                    _isGuardian
                        ? 'Use this first if the mother, baby, or anyone nearby is in immediate danger or there is an urgent safety concern.'
                        : 'Use this first if there is immediate danger, a medical emergency, or urgent safety concern.',
                isPhone: true,
              ),
              const SizedBox(height: 10),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFD6EAF5)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(
                      Icons.favorite_outline_rounded,
                      color: _mint,
                      size: 22,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _isGuardian
                            ? 'If the situation feels overwhelming, ask another trusted family member or caregiver to help make the call with you.'
                            : 'If speaking feels difficult, ask a trusted family member or caregiver to make the call with you.',
                        style: const TextStyle(
                          fontSize: 13.5,
                          color: _muted,
                          height: 1.45,
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

  Future<void> _confirmAndLaunchDialer(
    BuildContext context,
    String contact,
    String label,
  ) async {
    final number =
        RegExp(
          r'[+\d]+',
        ).allMatches(contact).map((match) => match.group(0) ?? '').join();
    if (number.isEmpty) return;

    final shouldCall = await showDialog<bool>(
      context: context,
      barrierColor: Colors.black.withOpacity(0.35),
      builder:
          (dialogContext) => AlertDialog(
            backgroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(24),
            ),
            titlePadding: const EdgeInsets.fromLTRB(22, 22, 22, 10),
            contentPadding: const EdgeInsets.fromLTRB(22, 0, 22, 18),
            title: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: _surface,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFD6EAF5)),
                  ),
                  child: const Icon(Icons.call_rounded, color: _mint),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Text(
                    'Call this contact?',
                    style: TextStyle(
                      color: _text,
                      fontWeight: FontWeight.w800,
                      fontSize: 20,
                    ),
                  ),
                ),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    color: _text,
                    fontWeight: FontWeight.w700,
                    fontSize: 15,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'This will open your phone dialer for $number. You can still choose whether to place the call.',
                  style: const TextStyle(color: _muted, height: 1.5),
                ),
              ],
            ),
            actions: [
              OutlinedButton(
                style: OutlinedButton.styleFrom(
                  foregroundColor: _mint,
                  side: const BorderSide(color: _mint),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 18,
                    vertical: 12,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: const Text('Cancel'),
                onPressed: () => Navigator.of(dialogContext).pop(false),
              ),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: _mint,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                icon: const Icon(Icons.call_rounded, size: 18),
                label: const Text('Open Dialer'),
                onPressed: () => Navigator.of(dialogContext).pop(true),
              ),
            ],
          ),
    );

    if (shouldCall != true) return;

    final Uri url = Uri(scheme: 'tel', path: number);
    final launched = await canLaunchUrl(url) && await launchUrl(url);
    if (!launched && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Unable to open the phone dialer right now.'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }
}
