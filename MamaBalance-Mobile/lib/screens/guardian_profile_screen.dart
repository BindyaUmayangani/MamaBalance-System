import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../services/auth_service.dart';
import '../services/biometric_auth_service.dart';
import '../services/guardian_dashboard_service.dart';
import 'educational_resources_screen.dart';
import 'emergency_contacts_page.dart';
import 'faq_page.dart';
import 'privacy_policy_page.dart';

class GuardianProfileScreen extends StatelessWidget {
  const GuardianProfileScreen({
    super.key,
    this.showBackButton = true,
  });

  final bool showBackButton;

  static const Color _mint = Color(0xFF4FA38A);
  static const Color _bg = Color(0xFFEFF8F4);
  static const Color _surface = Color(0xFFECF8F4);
  static const Color _text = Color(0xFF203C35);
  static const Color _muted = Color(0xFF60756D);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      body: SafeArea(
        child: FutureBuilder<GuardianDashboardData>(
          future: GuardianDashboardService.instance.fetchDashboard(),
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(
                child: CircularProgressIndicator(color: _mint),
              );
            }

            if (snapshot.hasError || !snapshot.hasData) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        Icons.person_off_outlined,
                        size: 48,
                        color: _mint,
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'Unable to load your guardian profile right now.',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: _text,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '${snapshot.error ?? 'Please try again.'}',
                        style: const TextStyle(color: _muted),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              );
            }

            final data = snapshot.data!;

            return SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      if (showBackButton) ...[
                        IconButton(
                          icon: const Icon(
                            Icons.arrow_back_ios_new_rounded,
                            color: _text,
                          ),
                          onPressed: () => Navigator.pop(context),
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(
                            minWidth: 36,
                            minHeight: 36,
                          ),
                        ),
                        const SizedBox(width: 12),
                      ],
                      const Expanded(
                        child: Text(
                          'Guardian Profile',
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
                    padding: EdgeInsets.only(left: showBackButton ? 48 : 0),
                    child: const Text(
                      'Review your linked mother details, support options, and account settings in one place.',
                      style: TextStyle(
                        fontSize: 14,
                        color: _muted,
                        height: 1.45,
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Container(
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
                          color: _mint.withOpacity(0.20),
                          blurRadius: 20,
                          offset: const Offset(0, 12),
                        ),
                      ],
                    ),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 68,
                              height: 68,
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(22),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                _initials(data.guardianName),
                                style: const TextStyle(
                                  color: _mint,
                                  fontSize: 24,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    data.guardianName,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 20,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    data.guardianPhoneNumber,
                                    style: const TextStyle(
                                      color: Colors.white70,
                                      fontSize: 14,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'Linked to ${data.motherName}',
                                    style: const TextStyle(
                                      color: Colors.white70,
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: _heroInfoChip(
                                Icons.link_outlined,
                                data.relationship,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: _heroInfoChip(
                                Icons.phone_in_talk_outlined,
                                data.motherPhoneNumber,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 22),
                  const Text(
                    'Linked Mother',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 16,
                      color: _text,
                    ),
                  ),
                  const SizedBox(height: 12),
                  _buildSection(
                    children: [
                      _buildListTile(
                        context,
                        icon: Icons.woman_rounded,
                        text: data.motherName,
                        subtitle: 'Tap to view linked mother personal details',
                        onTap: () => _showLinkedMotherDetails(context, data),
                      ),
                      _buildDivider(),
                      if (data.doctor != null)
                        _buildListTile(
                          context,
                          icon: Icons.local_hospital_outlined,
                          text: _doctorDisplayName(data.doctor!.name),
                          subtitle:
                              'Assigned doctor | ${data.doctor!.phoneNumber}',
                          onTap: () => _showCareTeamContactDialog(
                            context,
                            title: _doctorDisplayName(data.doctor!.name),
                            roleLabel: 'Assigned doctor',
                            phoneNumber: data.doctor!.phoneNumber,
                            icon: Icons.local_hospital_outlined,
                          ),
                        ),
                      if (data.doctor != null) _buildDivider(),
                      _buildListTile(
                        context,
                        icon: Icons.health_and_safety_outlined,
                        text: _midwifeDisplayName(data.midwife.name),
                        subtitle:
                            'Assigned midwife | ${data.midwife.phoneNumber}',
                        onTap: () => _showCareTeamContactDialog(
                          context,
                          title: _midwifeDisplayName(data.midwife.name),
                          roleLabel: 'Assigned midwife',
                          phoneNumber: data.midwife.phoneNumber,
                          icon: Icons.health_and_safety_outlined,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'Account',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 16,
                      color: _text,
                    ),
                  ),
                  const SizedBox(height: 12),
                  _buildSection(
                    children: [
                      _buildListTile(
                        context,
                        icon: Icons.fingerprint_rounded,
                        text: 'Biometric Login',
                        subtitle: 'Manage fingerprint or face unlock',
                        onTap: () => _manageBiometricLogin(context),
                      ),
                      _buildDivider(),
                      _buildListTile(
                        context,
                        icon: Icons.contacts_outlined,
                        text: 'Emergency Contacts',
                        subtitle: 'Important support numbers',
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => EmergencyContactsPage(
                                audience: 'guardian',
                              ),
                            ),
                          );
                        },
                      ),
                      _buildDivider(),
                      _buildListTile(
                        context,
                        icon: Icons.menu_book_outlined,
                        text: 'Resources',
                        subtitle: 'Browse educational content for guardians',
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => const EducationalResourcesScreen(
                              showBackButton: true,
                              audience: 'guardian',
                            ),
                          ),
                        ),
                      ),
                      _buildDivider(),
                      _buildListTile(
                        context,
                        icon: Icons.logout_rounded,
                        text: 'Logout',
                        subtitle: 'Sign out from this device',
                        isDestructive: true,
                        onTap: () => _showLogoutConfirmation(context),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'More',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 16,
                      color: _text,
                    ),
                  ),
                  const SizedBox(height: 12),
                  _buildSection(
                    children: [
                      _buildListTile(
                        context,
                        icon: Icons.info_outline_rounded,
                        text: 'About App',
                        subtitle: 'Learn more about MamaBalance',
                        onTap: () => Navigator.pushNamed(context, '/about'),
                      ),
                      _buildDivider(),
                      _buildListTile(
                        context,
                        icon: Icons.privacy_tip_outlined,
                        text: 'Privacy Policy',
                        subtitle: 'Read how your information is handled',
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => const PrivacyPolicyPage(
                                audience: 'guardian',
                              ),
                            ),
                          );
                        },
                      ),
                      _buildDivider(),
                      _buildListTile(
                        context,
                        icon: Icons.question_answer_outlined,
                        text: 'FAQ',
                        subtitle: 'Common questions and answers',
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => const FAQPage(audience: 'guardian'),
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _heroInfoChip(IconData icon, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.16),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withOpacity(0.24)),
      ),
      child: Row(
        children: [
          Icon(icon, color: Colors.white, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _initials(String value) {
    final trimmed = value.trim();
    if (trimmed.isEmpty) {
      return 'GU';
    }

    final normalized = trimmed.replaceAll(RegExp(r'\s+'), ' ');
    final words = normalized.split(' ').where((word) => word.isNotEmpty).toList();

    if (words.length >= 2) {
      return '${words.first[0]}${words[1][0]}'.toUpperCase();
    }

    final firstWord = words.first;
    if (firstWord.length >= 2) {
      return firstWord.substring(0, 2).toUpperCase();
    }

    return firstWord[0].toUpperCase();
  }

  String _doctorDisplayName(String value) {
    final name = value.trim();
    if (name.isEmpty) return 'Dr. Assigned doctor';
    return name.toLowerCase().startsWith('dr.') ? name : 'Dr. $name';
  }

  String _midwifeDisplayName(String value) {
    final name = value.trim();
    if (name.isEmpty) return 'Midwife Assigned midwife';
    return name.toLowerCase().startsWith('midwife ') ? name : 'Midwife $name';
  }

  Widget _buildSection({required List<Widget> children}) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFD7EAE3)),
        boxShadow: [
          BoxShadow(
            color: _mint.withOpacity(0.08),
            blurRadius: 18,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(children: children),
    );
  }

  Widget _buildListTile(
    BuildContext context, {
    required IconData icon,
    required String text,
    required String subtitle,
    required VoidCallback onTap,
    bool isDestructive = false,
  }) {
    final color = isDestructive ? const Color(0xFFB6403D) : _mint;

    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
      leading: Container(
        width: 42,
        height: 42,
        decoration: BoxDecoration(
          color: isDestructive ? const Color(0xFFFCEDEC) : _surface,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Icon(icon, color: color),
      ),
      title: Text(
        text,
        style: const TextStyle(
          fontSize: 16,
          color: _text,
          fontWeight: FontWeight.w700,
        ),
      ),
      subtitle: Text(
        subtitle,
        style: const TextStyle(fontSize: 13, color: _muted),
      ),
      trailing: const Icon(
        Icons.arrow_forward_ios_rounded,
        size: 16,
        color: Color(0xFF7B9088),
      ),
      onTap: onTap,
    );
  }

  Widget _buildDivider() {
    return const Padding(
      padding: EdgeInsets.symmetric(horizontal: 16),
      child: Divider(height: 1, color: Color(0xFFE6F0EC)),
    );
  }

  void _showCareTeamContactDialog(
    BuildContext context, {
    required String title,
    required String roleLabel,
    required String phoneNumber,
    required IconData icon,
  }) {
    showDialog<void>(
      context: context,
      builder: (dialogContext) => Dialog(
        insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
        backgroundColor: Colors.transparent,
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(28),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.08),
                blurRadius: 30,
                offset: const Offset(0, 18),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: _surface,
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: Icon(icon, color: _mint, size: 28),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            color: _text,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          roleLabel,
                          style: const TextStyle(
                            fontSize: 13,
                            color: _muted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: _surface,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: const Color(0xFFD8ECE4)),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.phone_in_talk_outlined,
                      color: _mint,
                      size: 18,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        phoneNumber.trim().isEmpty ? '-' : phoneNumber,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: _text,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: _mint,
                        side: const BorderSide(color: _mint),
                        padding: const EdgeInsets.symmetric(vertical: 15),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      onPressed: () => Navigator.pop(dialogContext),
                      child: const Text(
                        'Close',
                        style: TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _mint,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(vertical: 15),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      onPressed: phoneNumber.trim().isEmpty || phoneNumber.trim() == '-'
                          ? null
                          : () async {
                              Navigator.pop(dialogContext);
                              await _launchDialer(phoneNumber);
                            },
                      icon: const Icon(Icons.call_outlined),
                      label: const Text(
                        'Call',
                        style: TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _launchDialer(String number) async {
    final Uri url = Uri(scheme: 'tel', path: number.replaceAll(' ', ''));
    if (await canLaunchUrl(url)) {
      await launchUrl(url);
    }
  }

  void _showLinkedMotherDetails(
    BuildContext context,
    GuardianDashboardData data,
  ) {
    showDialog<void>(
      context: context,
      builder: (dialogContext) => Dialog(
        insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
        backgroundColor: Colors.transparent,
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(28),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.08),
                blurRadius: 30,
                offset: const Offset(0, 18),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: _surface,
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: const Icon(
                      Icons.woman_rounded,
                      color: _mint,
                      size: 30,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          data.motherName,
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            color: _text,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Linked mother personal details',
                          style: TextStyle(
                            fontSize: 13,
                            color: _muted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              _detailRow('Phone number', data.motherPhoneNumber),
              _detailRow('Birthdate', data.motherBirthdate),
              _detailRow('Delivery date', data.motherDeliveryDate),
              _detailRow('Number of children', '${data.motherNoOfChildren}'),
              _detailRow('Home address', data.motherAddress),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _mint,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 15),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  onPressed: () => Navigator.pop(dialogContext),
                  child: const Text(
                    'Close',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: _surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFD8ECE4)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: _muted,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              value.trim().isEmpty ? '-' : value,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: _text,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showLogoutConfirmation(BuildContext context) {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        titlePadding: const EdgeInsets.fromLTRB(22, 22, 22, 10),
        contentPadding: const EdgeInsets.fromLTRB(22, 0, 22, 18),
        title: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: const Color(0xFFFCEDEC),
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Icon(
                Icons.logout_rounded,
                color: Color(0xFFB6403D),
              ),
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: Text(
                'Logout',
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 20,
                  color: _text,
                ),
              ),
            ),
          ],
        ),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Are you sure you want to logout from MamaBalance?',
              style: TextStyle(
                color: _text,
                fontWeight: FontWeight.w700,
                fontSize: 15,
              ),
            ),
            SizedBox(height: 8),
            Text(
              'You can sign back in anytime to continue with care schedules, messages, and support resources.',
              style: TextStyle(color: _muted, height: 1.5),
            ),
          ],
        ),
        actions: [
          OutlinedButton(
            style: OutlinedButton.styleFrom(
              foregroundColor: _mint,
              side: const BorderSide(color: _mint),
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
            child: const Text('Cancel'),
            onPressed: () => Navigator.of(dialogContext).pop(),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFB6403D),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
            child: const Text('Logout'),
            onPressed: () async {
              Navigator.of(dialogContext).pop();
              await AuthService.instance.signOut();
              if (!context.mounted) return;
              Navigator.pushNamedAndRemoveUntil(
                context,
                '/signin',
                (route) => false,
              );
            },
          ),
        ],
      ),
    );
  }

  Future<void> _manageBiometricLogin(BuildContext context) async {
    final biometricService = BiometricAuthService.instance;
    final isEnabled = await biometricService.isEnabledForCurrentUser();
    final availability = await biometricService.getAvailability();
    final biometricLabel = await biometricService.biometricLabel();

    if (!context.mounted) return;

    if (availability != BiometricSetupAvailability.available) {
      await showDialog<void>(
        context: context,
        builder: (dialogContext) => Dialog(
          insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
          backgroundColor: Colors.transparent,
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(28),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.08),
                  blurRadius: 30,
                  offset: const Offset(0, 18),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        color: const Color(0xFFFCEDEC),
                        borderRadius: BorderRadius.circular(18),
                      ),
                      child: const Icon(
                        Icons.fingerprint_rounded,
                        color: Color(0xFFB6403D),
                        size: 30,
                      ),
                    ),
                    const SizedBox(width: 14),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Biometric Login Unavailable',
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF203C35),
                            ),
                          ),
                          SizedBox(height: 4),
                          Text(
                            'Set it up in your phone settings first',
                            style: TextStyle(
                              fontSize: 13,
                              color: Color(0xFF6B8078),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                Text(
                  '$biometricLabel is not available on this device right now. Add fingerprint or face authentication in your phone settings, then come back and enable quick unlock here.',
                  style: const TextStyle(
                    fontSize: 15,
                    height: 1.55,
                    color: Color(0xFF4E645C),
                  ),
                ),
                const SizedBox(height: 16),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF7F6),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: const Color(0xFFF3D1CE)),
                  ),
                  child: const Text(
                    'Quick unlock only works with the fingerprint or face ID already enrolled on this device.',
                    style: TextStyle(
                      height: 1.5,
                      color: Color(0xFF60756D),
                    ),
                  ),
                ),
                const SizedBox(height: 22),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF4FA38A),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(vertical: 15),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    onPressed: () => Navigator.pop(dialogContext),
                    child: const Text(
                      'Close',
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
      return;
    }

    final shouldEnable = !isEnabled;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => Dialog(
        insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
        backgroundColor: Colors.transparent,
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(28),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.08),
                blurRadius: 30,
                offset: const Offset(0, 18),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: shouldEnable
                          ? const Color(0xFFE9F6F1)
                          : const Color(0xFFFCEDEC),
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: Icon(
                      shouldEnable
                          ? Icons.fingerprint_rounded
                          : Icons.lock_reset_rounded,
                      color: shouldEnable
                          ? const Color(0xFF4FA38A)
                          : const Color(0xFFB6403D),
                      size: 30,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          shouldEnable
                              ? 'Enable Quick Unlock?'
                              : 'Turn Off Quick Unlock?',
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF203C35),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          shouldEnable
                              ? 'Optional for faster guardian access'
                              : 'You can enable it again later',
                          style: const TextStyle(
                            fontSize: 13,
                            color: Color(0xFF6B8078),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Text(
                shouldEnable
                    ? 'Use $biometricLabel to unlock your saved guardian session faster on this device after your normal OTP sign-in.'
                    : 'Turn off $biometricLabel quick unlock for this guardian session on this device?',
                style: const TextStyle(
                  fontSize: 15,
                  height: 1.55,
                  color: Color(0xFF4E645C),
                ),
              ),
              const SizedBox(height: 16),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: shouldEnable
                      ? const Color(0xFFF5FAF8)
                      : const Color(0xFFFFF7F6),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(
                    color: shouldEnable
                        ? const Color(0xFFD8ECE4)
                        : const Color(0xFFF3D1CE),
                  ),
                ),
                child: Text(
                  shouldEnable
                      ? 'MamaBalance uses the fingerprint or face ID already enrolled on your phone. It does not create or store a new biometric.'
                      : '$biometricLabel is currently protecting your saved guardian session on this device. If you turn it off, the app will stop asking for quick biometric unlock on reopen.',
                  style: const TextStyle(
                    height: 1.5,
                    color: Color(0xFF60756D),
                  ),
                ),
              ),
              const SizedBox(height: 22),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF4FA38A),
                        side: const BorderSide(color: Color(0xFF4FA38A)),
                        padding: const EdgeInsets.symmetric(vertical: 15),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      onPressed: () => Navigator.pop(dialogContext, false),
                      child: const Text(
                        'Cancel',
                        style: TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: shouldEnable
                            ? const Color(0xFF4FA38A)
                            : const Color(0xFFB6403D),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(vertical: 15),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      onPressed: () => Navigator.pop(dialogContext, true),
                      child: Text(
                        shouldEnable ? 'Enable' : 'Turn Off',
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );

    if (confirmed != true) return;

    if (shouldEnable) {
      final authenticated = await biometricService.authenticateToUnlock(
        reason: 'Confirm $biometricLabel for quick MamaBalance unlock',
      );
      if (!authenticated) {
        if (!context.mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('$biometricLabel was not confirmed.'),
          ),
        );
        return;
      }
      await biometricService.enableForCurrentUser();
    } else {
      await biometricService.disableForCurrentUser();
    }

    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          shouldEnable
              ? '$biometricLabel quick unlock is now enabled.'
              : '$biometricLabel quick unlock is now disabled.',
        ),
      ),
    );
  }
}
