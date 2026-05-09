import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/mother_profile.dart';
import '../services/auth_service.dart';
import '../services/biometric_auth_service.dart';
import '../services/mother_profile_service.dart';
import 'educational_resources_screen.dart';
import 'forgot_password_screen.dart';
import 'update_profile_page.dart';
import '../utils/image_utils.dart';
import '../widgets/app_loading_state.dart';

class ProfileScreen extends StatelessWidget {
  final bool showBackButton;

  const ProfileScreen({super.key, this.showBackButton = true});

  static const Color _mint = Color(0xFF4A90C2);
  static const Color _bg = Color(0xFFF3FAFD);
  static const Color _surface = Color(0xFFEAF6FC);
  static const Color _text = Color(0xFF1F3A5F);
  static const Color _muted = Color(0xFF5F7285);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      body: SafeArea(
        child: FutureBuilder<MotherProfile>(
          future: MotherProfileService.instance.fetchCurrentProfile(),
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const AppLoadingState(
                title: 'Loading your profile',
                message: 'Gathering your account and support options.',
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
                        'Unable to load your profile right now.',
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

            final profile = snapshot.data!;

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
                          'Profile',
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
                      'Manage your account, support options, and app information in one place.',
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
                        colors: [Color(0xFF7EC8E3), Color(0xFF4A90C2)],
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
                            CircleAvatar(
                              radius: 34,
                              backgroundColor: Colors.white,
                              backgroundImage:
                                  ImageUtils.hasProfileImage(
                                        profile.profileImageUrl,
                                      )
                                      ? ImageUtils.resolveProfileImage(
                                        profile.profileImageUrl,
                                      )
                                      : null,
                              child:
                                  ImageUtils.hasProfileImage(
                                        profile.profileImageUrl,
                                      )
                                      ? null
                                      : Text(
                                        ImageUtils.profileInitials(
                                          profile.fullName,
                                        ),
                                        style: const TextStyle(
                                          color: _mint,
                                          fontSize: 21,
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    profile.fullName,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 20,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    profile.phoneNumber,
                                    style: const TextStyle(
                                      color: Colors.white70,
                                      fontSize: 14,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    profile.personalEmail,
                                    style: const TextStyle(
                                      color: Colors.white70,
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            InkWell(
                              onTap: () async {
                                await Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder:
                                        (context) => const UpdateProfilePage(),
                                  ),
                                );
                                if (context.mounted) {
                                  Navigator.pushReplacement(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) => const ProfileScreen(),
                                    ),
                                  );
                                }
                              },
                              borderRadius: BorderRadius.circular(16),
                              child: Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: Colors.white.withOpacity(0.18),
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: Colors.white.withOpacity(0.24),
                                  ),
                                ),
                                child: const Icon(
                                  Icons.edit_outlined,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: _heroInfoChip(
                                Icons.child_care_outlined,
                                '${profile.noOfChildren} children',
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: _heroInfoChip(
                                Icons.event_available_outlined,
                                profile.deliveryDate,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 22),
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
                        icon: Icons.person_outline_rounded,
                        text: 'My Account',
                        subtitle: 'View profile details',
                        onTap:
                            () => Navigator.pushNamed(
                              context,
                              '/profile-details',
                            ),
                      ),
                      _buildDivider(),
                      _buildListTile(
                        context,
                        icon: Icons.lock_outline_rounded,
                        text: 'Reset Password',
                        subtitle: 'Update your sign-in password',
                        onTap:
                            () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder:
                                    (_) => const ForgotPasswordScreen(
                                      method: ForgotPasswordMethod.phone,
                                    ),
                              ),
                            ),
                      ),
                      _buildDivider(),
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
                        onTap:
                            () => Navigator.pushNamed(
                              context,
                              '/emergency-contacts',
                            ),
                      ),
                      _buildDivider(),
                      _buildListTile(
                        context,
                        icon: Icons.menu_book_outlined,
                        text: 'Resources',
                        subtitle: 'Browse educational content',
                        onTap:
                            () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder:
                                    (_) => const EducationalResourcesScreen(
                                      showBackButton: true,
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
                        icon: Icons.insights_outlined,
                        text: 'Wellbeing Score',
                        subtitle: 'View your latest check-in score',
                        onTap: () => _showWellbeingScoreSheet(context, profile),
                      ),
                      _buildDivider(),
                      _buildListTile(
                        context,
                        icon: Icons.privacy_tip_outlined,
                        text: 'Privacy Policy',
                        subtitle: 'Read how your information is handled',
                        onTap:
                            () =>
                                Navigator.pushNamed(context, '/privacy-policy'),
                      ),
                      _buildDivider(),
                      _buildListTile(
                        context,
                        icon: Icons.question_answer_outlined,
                        text: 'FAQ',
                        subtitle: 'Common questions and answers',
                        onTap: () => Navigator.pushNamed(context, '/faq'),
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

  Widget _buildSection({required List<Widget> children}) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFD6EAF5)),
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
        color: Color(0xFF5F7285),
      ),
      onTap: onTap,
    );
  }

  Widget _buildDivider() {
    return const Padding(
      padding: EdgeInsets.symmetric(horizontal: 16),
      child: Divider(height: 1, color: Color(0xFFEAF6FC)),
    );
  }

  String _riskLabel(int score) {
    if (score <= 9) return 'Steady check-in';
    if (score <= 12) return 'Extra care may help';
    return 'Additional support recommended';
  }

  String _riskMessage(int score) {
    if (score <= 9) {
      return 'This result suggests things may be feeling more manageable. Keep using small moments of rest, connection, and care.';
    }
    if (score <= 12) {
      return 'This result suggests this week may feel heavier than usual. Rest, gentle routines, and talking with someone you trust can help.';
    }
    return 'This result suggests you may benefit from extra support. Please consider contacting your doctor, midwife, or a trusted person.';
  }

  String _formatEpdsDate(DateTime? date) {
    if (date == null) return 'No check-in submitted yet';
    return DateFormat('dd MMM yyyy').format(date.toLocal());
  }

  void _showWellbeingScoreSheet(BuildContext context, MotherProfile profile) {
    final hasScore = profile.latestEpdsDate != null;

    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder:
          (sheetContext) => Container(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
            ),
            child: SafeArea(
              top: false,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 44,
                      height: 5,
                      decoration: BoxDecoration(
                        color: const Color(0xFFD6EAF5),
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),
                  Row(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: _surface,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: const Icon(
                          Icons.insights_outlined,
                          color: _mint,
                        ),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Text(
                          'Latest Wellbeing Score',
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            color: _text,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: _surface,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFFD6EAF5)),
                    ),
                    child:
                        hasScore
                            ? Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '${profile.latestEpdsScore} / 30',
                                  style: const TextStyle(
                                    fontSize: 34,
                                    fontWeight: FontWeight.w800,
                                    color: _text,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  _riskLabel(profile.latestEpdsScore),
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w800,
                                    color: _mint,
                                  ),
                                ),
                                const SizedBox(height: 10),
                                Text(
                                  _riskMessage(profile.latestEpdsScore),
                                  style: const TextStyle(
                                    color: _muted,
                                    height: 1.45,
                                  ),
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  'Saved on ${_formatEpdsDate(profile.latestEpdsDate)}',
                                  style: const TextStyle(
                                    color: _muted,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            )
                            : const Text(
                              'No check-in score is available yet. Complete a weekly check-in when you feel ready.',
                              style: TextStyle(color: _muted, height: 1.45),
                            ),
                  ),
                  const SizedBox(height: 18),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => Navigator.of(sheetContext).pop(),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _mint,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(vertical: 15),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
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

  void _showLogoutConfirmation(BuildContext context) {
    showDialog(
      context: context,
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
                  'You can sign back in anytime to continue with your check-ins, messages, and care updates.',
                  style: TextStyle(color: _muted, height: 1.5),
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
                onPressed: () => Navigator.of(dialogContext).pop(),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFB6403D),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 18,
                    vertical: 12,
                  ),
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
        builder:
            (dialogContext) => AlertDialog(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(24),
              ),
              title: const Text('Biometric Login'),
              content: const Text(
                'This device does not currently have fingerprint or face authentication ready for MamaBalance. Please add a fingerprint or face in your phone settings first, then come back and enable it here.',
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(dialogContext).pop(),
                  child: const Text('Close'),
                ),
              ],
            ),
      );
      return;
    }

    if (isEnabled) {
      final disable = await showDialog<bool>(
        context: context,
        builder:
            (dialogContext) => Dialog(
              insetPadding: const EdgeInsets.symmetric(
                horizontal: 24,
                vertical: 24,
              ),
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
                            Icons.lock_reset_rounded,
                            color: Color(0xFFB6403D),
                            size: 28,
                          ),
                        ),
                        const SizedBox(width: 14),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Turn Off Quick Unlock?',
                                style: TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.w800,
                                  color: Color(0xFF1F3A5F),
                                ),
                              ),
                              SizedBox(height: 4),
                              Text(
                                'You can enable it again later',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Color(0xFF5F7285),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    Text(
                      '$biometricLabel is currently protecting your saved MamaBalance session on this device. If you turn it off, the app will stop asking for biometric unlock on normal reopen.',
                      style: const TextStyle(
                        fontSize: 15,
                        height: 1.55,
                        color: Color(0xFF5F7285),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFF6F5),
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: const Color(0xFFF3D0CD)),
                      ),
                      child: const Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(
                            Icons.info_outline_rounded,
                            size: 18,
                            color: Color(0xFFB6403D),
                          ),
                          SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'Your OTP or password login still works normally. Turning this off only removes the fingerprint or face unlock step for this device.',
                              style: TextStyle(
                                height: 1.5,
                                color: Color(0xFF7A5A57),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 22),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              foregroundColor: const Color(0xFF4A90C2),
                              side: const BorderSide(color: Color(0xFF4A90C2)),
                              padding: const EdgeInsets.symmetric(vertical: 15),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                            ),
                            onPressed:
                                () => Navigator.of(dialogContext).pop(false),
                            child: const Text(
                              'Keep On',
                              style: TextStyle(fontWeight: FontWeight.w700),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFB6403D),
                              foregroundColor: Colors.white,
                              elevation: 0,
                              padding: const EdgeInsets.symmetric(vertical: 15),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                            ),
                            onPressed:
                                () => Navigator.of(dialogContext).pop(true),
                            child: const Text(
                              'Turn Off',
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

      if (disable == true) {
        await biometricService.disableForCurrentUser();
        if (!context.mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Biometric quick unlock has been turned off.'),
          ),
        );
      }
      return;
    }

    final shouldEnable = await showDialog<bool>(
      context: context,
      builder:
          (dialogContext) => AlertDialog(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(24),
            ),
            title: const Text('Enable Quick Unlock'),
            content: Text(
              'After your normal OTP or password login, you can use $biometricLabel to unlock the already-signed-in MamaBalance session on this device.\n\nMamaBalance will use the fingerprint or face authentication already enrolled on this phone.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(dialogContext).pop(false),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF4A90C2),
                  foregroundColor: Colors.white,
                ),
                onPressed: () => Navigator.of(dialogContext).pop(true),
                child: const Text('Enable'),
              ),
            ],
          ),
    );

    if (shouldEnable != true) {
      return;
    }

    final authenticated = await biometricService.authenticateToUnlock(
      reason: 'Confirm $biometricLabel for MamaBalance quick unlock',
    );

    if (!context.mounted) return;

    if (authenticated) {
      await biometricService.enableForCurrentUser();
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$biometricLabel quick unlock is now enabled.')),
      );
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          '$biometricLabel was not confirmed, so quick unlock stayed off.',
        ),
      ),
    );
  }
}
