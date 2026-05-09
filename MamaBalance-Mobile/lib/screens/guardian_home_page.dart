import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../screens/emergency_contacts_page.dart';
import '../screens/guardian_profile_screen.dart';
import '../services/guardian_dashboard_service.dart';
import '../utils/image_utils.dart';
import '../widgets/app_loading_state.dart';

class GuardianHomePage extends StatelessWidget {
  GuardianHomePage({super.key});

  static const Color _mint = Color(0xFF4A90C2);
  static const Color _deepMint = Color(0xFF1F6F99);
  static const Color _bg = Color(0xFFF3FAFD);
  static const Color _surface = Color(0xFFEAF6FC);
  static const Color _text = Color(0xFF1F3A5F);
  static const Color _muted = Color(0xFF5F7285);

  final GuardianDashboardService _dashboardService =
      GuardianDashboardService.instance;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      body: SafeArea(
        child: FutureBuilder<GuardianDashboardData>(
          future: _dashboardService.fetchDashboard(),
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const AppLoadingState(
                title: 'Preparing guardian home',
                message: 'Loading reminders, visits, and care updates.',
              );
            }

            if (snapshot.hasError || !snapshot.hasData) {
              return _GuardianLoadError(
                message: '${snapshot.error ?? 'Please try again.'}',
              );
            }

            final data = snapshot.data!;

            return RefreshIndicator(
              color: _mint,
              onRefresh: () async {
                await Future<void>.delayed(const Duration(milliseconds: 350));
              },
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 28),
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 7,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(color: const Color(0xFFD6EAF5)),
                        ),
                        child: const Text(
                          'Guardian care view',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: _mint,
                          ),
                        ),
                      ),
                      const Spacer(),
                      _GuardianProfileAvatarButton(
                        guardianName: data.guardianName,
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder:
                                  (_) => const GuardianProfileScreen(
                                    showBackButton: true,
                                  ),
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Welcome Back',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                      color: _text,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Keep track of ${data.motherName}\'s next visits, care contacts, and family guidance from one place.',
                    style: const TextStyle(
                      fontSize: 14.5,
                      height: 1.5,
                      color: _muted,
                    ),
                  ),
                  const SizedBox(height: 20),
                  _HeroCard(data: data),
                  const SizedBox(height: 22),
                  const _SectionHeader(
                    title: 'Upcoming EPDS assessment',
                    subtitle:
                        'Monitor the next wellbeing check-in for the linked mother.',
                    icon: Icons.monitor_heart_outlined,
                  ),
                  const SizedBox(height: 12),
                  _EpdsAssessmentCard(scheduledAt: data.nextEpdsAssessmentDate),
                  const SizedBox(height: 22),
                  const _SectionHeader(
                    title: 'Upcoming schedule',
                    subtitle: 'Keep track of home, clinic, and doctor visits.',
                    icon: Icons.event_note_outlined,
                  ),
                  const SizedBox(height: 12),
                  if (data.visits.isEmpty)
                    const _EmptyScheduleCard()
                  else
                    ...data.visits.map((visit) => _VisitCard(visit: visit)),
                  const SizedBox(height: 22),
                  const _SectionHeader(
                    title: 'Quick actions',
                    subtitle: 'Open the guardian support actions used most.',
                    icon: Icons.grid_view_rounded,
                  ),
                  const SizedBox(height: 12),
                  Column(
                    children: [
                      _QuickActionCard(
                        icon: Icons.groups_2_outlined,
                        title: 'Assigned care team',
                        subtitle:
                            'View the assigned doctor and midwife details.',
                        onTap: () {
                          showModalBottomSheet<void>(
                            context: context,
                            backgroundColor: Colors.transparent,
                            isScrollControlled: true,
                            builder:
                                (sheetContext) =>
                                    _AssignedCareTeamSheet(data: data),
                          );
                        },
                      ),
                      const SizedBox(height: 10),
                      _QuickActionCard(
                        icon: Icons.emergency_outlined,
                        title: 'Emergency support',
                        subtitle: 'Open urgent numbers and support contacts.',
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder:
                                  (_) => EmergencyContactsPage(
                                    audience: 'guardian',
                                  ),
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 22),
                  const _SectionHeader(
                    title: 'Today\'s support guidance',
                    subtitle:
                        'Gentle ways to support the linked mother based on her latest wellbeing score.',
                    icon: Icons.volunteer_activism_outlined,
                  ),
                  const SizedBox(height: 12),
                  _GuardianGuidanceCard(data: data),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _GuardianGuidanceCard extends StatelessWidget {
  const _GuardianGuidanceCard({required this.data});

  final GuardianDashboardData data;

  static const List<String> _awaitingMessages = [
    'Invite her to complete the next check-in when she feels ready, and keep the conversation calm and pressure-free.',
    'Ask one gentle question today, such as how she slept or whether she needs help with one small task.',
    'Offer practical support first: a meal, a quiet rest period, or help with the baby can make check-ins easier later.',
  ];

  static const List<String> _steadyMessages = [
    'Keep support warm and consistent. Notice what is helping her feel steady, and encourage those small routines.',
    'Celebrate small wins without making them feel like pressure. A calm walk, rest, or shared meal can help maintain balance.',
    'Stay available even when she seems okay. Gentle listening helps her feel supported before stress builds up.',
  ];

  static const List<String> _extraCareMessages = [
    'Offer specific help instead of broad questions: suggest handling one chore, arranging rest, or sitting with her quietly.',
    'Listen without correcting her feelings. Reassure her that having a difficult week does not mean she is failing.',
    'Encourage her to stay connected with the doctor, midwife, or a trusted family member if the heaviness continues.',
  ];

  static const List<String> _closerSupportMessages = [
    'Stay close and reduce demands where possible. Encourage her to contact the assigned doctor or midwife for extra support.',
    'Use calm, simple reassurance: she is not alone, help is available, and you can take the next step together.',
    'If she talks about harming herself, the baby, or feeling unsafe, seek urgent support immediately through emergency contacts.',
  ];

  bool get _hasScore => data.motherLatestEpdsDate != null;

  String get _riskTitle {
    if (!_hasScore) return 'Awaiting first check-in';
    if (data.motherLatestEpdsScore <= 9) return 'Steady support';
    if (data.motherLatestEpdsScore <= 12) return 'Extra care support';
    return 'Closer support needed';
  }

  Color get _accentColor {
    if (!_hasScore) return GuardianHomePage._mint;
    if (data.motherLatestEpdsScore <= 9) return const Color(0xFF4A90C2);
    if (data.motherLatestEpdsScore <= 12) return const Color(0xFFF0A45B);
    return const Color(0xFFD95454);
  }

  List<String> get _messages {
    if (!_hasScore) return _awaitingMessages;
    if (data.motherLatestEpdsScore <= 9) return _steadyMessages;
    if (data.motherLatestEpdsScore <= 12) return _extraCareMessages;
    return _closerSupportMessages;
  }

  String get _messageForToday {
    final now = DateTime.now();
    final dayNumber =
        DateTime(
          now.year,
          now.month,
          now.day,
        ).difference(DateTime(2024)).inDays;
    final messages = _messages;
    final index = (dayNumber + data.motherLatestEpdsScore) % messages.length;
    return messages[index];
  }

  String get _scoreLabel {
    if (!_hasScore) return 'No EPDS score yet';
    return 'Latest score: ${data.motherLatestEpdsScore}/30';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFD6EAF5)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: GuardianHomePage._surface,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(Icons.favorite_border_rounded, color: _accentColor),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _riskTitle,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: GuardianHomePage._text,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _scoreLabel,
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                    color: _accentColor,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  _messageForToday,
                  style: const TextStyle(
                    color: GuardianHomePage._muted,
                    height: 1.45,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({
    required this.title,
    required this.subtitle,
    required this.icon,
  });

  final String title;
  final String subtitle;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: GuardianHomePage._surface,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(icon, color: GuardianHomePage._mint),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: GuardianHomePage._text,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          subtitle,
          style: const TextStyle(fontSize: 13, color: GuardianHomePage._muted),
        ),
      ],
    );
  }
}

class _EpdsAssessmentCard extends StatelessWidget {
  const _EpdsAssessmentCard({required this.scheduledAt});

  final DateTime? scheduledAt;

  @override
  Widget build(BuildContext context) {
    final isDueNow =
        scheduledAt != null && !scheduledAt!.toLocal().isAfter(DateTime.now());

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFD6EAF5)),
      ),
      child: Row(
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: GuardianHomePage._surface,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(
              Icons.monitor_heart_outlined,
              color:
                  isDueNow
                      ? GuardianHomePage._deepMint
                      : GuardianHomePage._mint,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isDueNow
                      ? 'EPDS assessment is due now'
                      : 'Next EPDS assessment',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: GuardianHomePage._text,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  scheduledAt == null
                      ? 'The first EPDS assessment has not been scheduled yet.'
                      : isDueNow
                      ? 'The linked mother\'s weekly EPDS assessment is now ready.'
                      : 'Keep an eye on the next weekly wellbeing check-in.',
                  style: const TextStyle(
                    color: GuardianHomePage._muted,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  _formatEpdsDate(scheduledAt),
                  style: TextStyle(
                    color:
                        isDueNow
                            ? GuardianHomePage._deepMint
                            : GuardianHomePage._mint,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  static String _formatEpdsDate(DateTime? value) {
    if (value == null) {
      return 'Not scheduled yet';
    }
    return DateFormat('EEE, dd MMM yyyy').format(value.toLocal());
  }
}

class _HeroCard extends StatelessWidget {
  const _HeroCard({required this.data});

  final GuardianDashboardData data;

  @override
  Widget build(BuildContext context) {
    return Container(
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
            color: GuardianHomePage._mint.withValues(alpha: 0.20),
            blurRadius: 20,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Linked mother',
                      style: TextStyle(
                        color: Colors.white70,
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      data.motherName,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '${data.relationship} | ${data.motherPhoneNumber}',
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 14),
              Container(
                width: 78,
                height: 78,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.75),
                    width: 3,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.12),
                      blurRadius: 16,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: CircleAvatar(
                  backgroundColor: Colors.white,
                  backgroundImage: ImageUtils.resolveProfileImage(
                    data.motherProfileImageUrl,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: _HeroChip(
                  icon: Icons.person_outline_rounded,
                  label: data.guardianName,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _HeroChip(
                  icon: Icons.phone_outlined,
                  label: data.guardianPhoneNumber,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _HeroChip extends StatelessWidget {
  const _HeroChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withValues(alpha: 0.24)),
      ),
      child: Row(
        children: [
          Icon(icon, color: Colors.white, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              label,
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
}

class _VisitCard extends StatelessWidget {
  const _VisitCard({required this.visit});

  final GuardianVisitSummary visit;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFD6EAF5)),
      ),
      child: Row(
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: GuardianHomePage._surface,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(
              visit.staffRole == 'Doctor'
                  ? Icons.medical_services_outlined
                  : Icons.home_work_outlined,
              color: GuardianHomePage._mint,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  visit.label,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: GuardianHomePage._text,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  visit.subtitle,
                  style: const TextStyle(
                    color: GuardianHomePage._muted,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  _formatVisit(visit.scheduledAt),
                  style: const TextStyle(
                    color: GuardianHomePage._deepMint,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  static String _formatVisit(DateTime? value) {
    if (value == null) {
      return 'Date to be confirmed';
    }
    final local = value.toLocal();
    return DateFormat('EEE, dd MMM yyyy | h:mm a').format(local);
  }
}

class _QuickActionCard extends StatelessWidget {
  const _QuickActionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(22),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: const Color(0xFFD6EAF5)),
        ),
        child: Row(
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: GuardianHomePage._surface,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(icon, color: GuardianHomePage._mint),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: GuardianHomePage._text,
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 12.5,
                      height: 1.4,
                      color: GuardianHomePage._muted,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            const Icon(
              Icons.arrow_forward_ios_rounded,
              size: 16,
              color: GuardianHomePage._muted,
            ),
          ],
        ),
      ),
    );
  }
}

class _GuardianProfileAvatarButton extends StatelessWidget {
  const _GuardianProfileAvatarButton({
    required this.guardianName,
    required this.onTap,
  });

  final String guardianName;
  final VoidCallback onTap;

  String _initials(String value) {
    final trimmed = value.trim();
    if (trimmed.isEmpty) return 'GU';
    final parts =
        trimmed.split(RegExp(r'\s+')).where((part) => part.isNotEmpty).toList();
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return parts.first.length >= 2
        ? parts.first.substring(0, 2).toUpperCase()
        : parts.first[0].toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(24),
        child: Container(
          width: 48,
          height: 48,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: Colors.white,
            shape: BoxShape.circle,
            border: Border.all(color: const Color(0xFFD6EAF5)),
          ),
          child: Text(
            _initials(guardianName),
            style: const TextStyle(
              color: GuardianHomePage._deepMint,
              fontSize: 13,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.title, required this.message});

  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFD6EAF5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontWeight: FontWeight.w700,
              color: GuardianHomePage._text,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            message,
            style: const TextStyle(height: 1.4, color: GuardianHomePage._muted),
          ),
        ],
      ),
    );
  }
}

class _AssignedCareTeamSheet extends StatelessWidget {
  const _AssignedCareTeamSheet({required this.data});

  final GuardianDashboardData data;

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

  static Future<void> _callContact(
    BuildContext context,
    String phoneNumber,
  ) async {
    final trimmed = phoneNumber.trim();
    if (trimmed.isEmpty || trimmed == '-') {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('This contact number is not available yet.'),
        ),
      );
      return;
    }

    final uri = Uri(scheme: 'tel', path: trimmed);
    final opened = await launchUrl(uri);
    if (!opened && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Unable to open the phone dialer right now.'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
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
            const Text(
              'Assigned Care Team',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: GuardianHomePage._text,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'These are the care team members currently assigned to support ${data.motherName}.',
              style: const TextStyle(
                fontSize: 14,
                height: 1.5,
                color: GuardianHomePage._muted,
              ),
            ),
            const SizedBox(height: 18),
            if (data.doctor != null) ...[
              _EmergencyCareTeamTile(
                icon: Icons.medical_services_outlined,
                title: _doctorDisplayName(data.doctor!.name),
                subtitle: 'Assigned doctor | ${data.doctor!.phoneNumber}',
                onCall: () => _callContact(context, data.doctor!.phoneNumber),
              ),
              const SizedBox(height: 10),
            ],
            _EmergencyCareTeamTile(
              icon: Icons.health_and_safety_outlined,
              title: _midwifeDisplayName(data.midwife.name),
              subtitle: 'Assigned midwife | ${data.midwife.phoneNumber}',
              onCall: () => _callContact(context, data.midwife.phoneNumber),
            ),
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: GuardianHomePage._surface,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: const Color(0xFFD6EAF5)),
              ),
              child: const Text(
                'If urgent support is needed, use the call button for the assigned doctor or midwife.',
                style: TextStyle(color: GuardianHomePage._muted, height: 1.45),
              ),
            ),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.of(context).pop(),
                style: ElevatedButton.styleFrom(
                  backgroundColor: GuardianHomePage._mint,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(vertical: 16),
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
    );
  }
}

class _EmergencyCareTeamTile extends StatelessWidget {
  const _EmergencyCareTeamTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onCall,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onCall;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFD6EAF5)),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: GuardianHomePage._surface,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: GuardianHomePage._mint),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    color: GuardianHomePage._text,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: const TextStyle(
                    color: GuardianHomePage._muted,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          FilledButton.tonalIcon(
            onPressed: onCall,
            style: FilledButton.styleFrom(
              backgroundColor: GuardianHomePage._surface,
              foregroundColor: GuardianHomePage._deepMint,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
            icon: const Icon(Icons.call_outlined, size: 18),
            label: const Text(
              'Call',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyScheduleCard extends StatelessWidget {
  const _EmptyScheduleCard();

  @override
  Widget build(BuildContext context) {
    return const _InfoCard(
      title: 'No upcoming visits yet',
      message:
          'Home visits, clinic visits, and doctor checkups will appear here once the care team schedules them.',
    );
  }
}

class _GuardianLoadError extends StatelessWidget {
  const _GuardianLoadError({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.family_restroom_outlined,
              color: GuardianHomePage._mint,
              size: 48,
            ),
            const SizedBox(height: 12),
            const Text(
              'Guardian access is not ready yet',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: GuardianHomePage._text,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: GuardianHomePage._muted,
                height: 1.45,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
