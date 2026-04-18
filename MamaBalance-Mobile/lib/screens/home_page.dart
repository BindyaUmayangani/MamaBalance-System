import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:video_player/video_player.dart';

import '../models/mother_profile.dart';
import '../services/mother_profile_service.dart';
import '../widgets/bottom_nav_bar.dart';
import 'chat_page.dart';
import 'educational_resources_screen.dart';
import 'notification_tab.dart';
import 'prescription_page_live.dart';
import 'profile_screen.dart';
import 'weekly_checkin_page.dart';
import '../services/visit_service.dart';
import 'package:intl/intl.dart';

import '../services/notification_service.dart';
import '../utils/image_utils.dart';

const List<String> _gentleSupportMessages = [
  'Take a quiet pause today and notice one thing that helped you feel steady.',
  'A short walk, a glass of water, or a moment of rest can still be meaningful care.',
  'You do not have to do everything at once. Small steps are still progress.',
];

final Map<String, String> dailyTipsWithExplanation = {
  'Take 10 minutes for deep breathing':
      'Try slow breathing: inhale for 4 seconds, pause for 4, and exhale for 6 to 8 seconds. This can help settle your mind and body.',
  'Listen to calming music':
      'Soft music or natural sounds can reduce stress and help you feel more grounded in a short time.',
  'Spend a few minutes outdoors':
      'Fresh air, daylight, or a short walk can lift energy and support better rest later in the day.',
  'Write one positive thought':
      'A small grateful thought or one kind sentence to yourself can help shift your focus gently.',
  'Practice gentle stretching':
      'Simple stretching can ease tension and create a small moment of care for your body.',
  'Enjoy a healthy snack':
      'A nourishing snack like fruit, yogurt, or nuts can support steadier energy and focus.',
  'Disconnect from screens for 30 minutes':
      'A break from phones or TV can give your mind a quieter space to rest.',
};

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _DashboardData {
  final MotherProfile profile;
  final Map<String, dynamic>? homeVisit;
  final Map<String, dynamic>? clinicVisit;
  final Map<String, dynamic>? doctorVisit;

  _DashboardData({
    required this.profile,
    this.homeVisit,
    this.clinicVisit,
    this.doctorVisit,
  });
}

class _CareUpdateSummary {
  final DateTime scheduledAt;
  final String title;
  final String body;

  const _CareUpdateSummary({
    required this.scheduledAt,
    required this.title,
    required this.body,
  });
}

class _HomePageState extends State<HomePage> {
  int _selectedIndex = 0;
  late VideoPlayerController _videoController;

  static const Color _accent = Color(0xFF4FA58D);
  static const Color _background = Color(0xFFF3FBF8);
  static const Color _surface = Color(0xFFECF8F4);
  static const Color _text = Color(0xFF173C3A);
  static const Color _muted = Color(0xFF6A7B79);

  @override
  void initState() {
    super.initState();
    _videoController = VideoPlayerController.asset('assets/videos/family.mp4')
      ..initialize().then((_) {
        _videoController
          ..setLooping(true)
          ..setVolume(0)
          ..play();
        if (mounted) setState(() {});
      });
  }

  @override
  void dispose() {
    _videoController.dispose();
    super.dispose();
  }

  DateTime? _nextEPDSTestDate(MotherProfile profile) {
    final submittedAt = profile.latestEpdsDate;
    if (submittedAt == null) return null;
    return submittedAt.toLocal().add(const Duration(days: 7));
  }

  String _formatCheckInDate(DateTime? date) {
    if (date == null) return 'Not scheduled yet';
    return DateFormat('dd MMM yyyy').format(date.toLocal());
  }

  String _formatLastTestDate(DateTime? date) {
    if (date == null) return 'No test submitted';
    return DateFormat('dd MMM yyyy  h:mm a').format(date.toLocal());
  }

  String _checkInStatus(DateTime? date) {
    if (date == null) return 'Complete your first EPDS check-in to start weekly tracking.';
    final localDate = date.toLocal();
    final now = DateTime.now();
    if (!localDate.isAfter(now)) return 'Your weekly check-in is ready today.';
    final days = localDate.difference(DateTime(now.year, now.month, now.day)).inDays;
    if (days <= 1) return 'Your next check-in opens tomorrow.';
    return 'Your next check-in opens in $days days.';
  }

  String _formatVisitDate(dynamic value) {
    if (value == null) return 'No upcoming visits';
    try {
      final date = (value is DateTime
          ? value
          : value is Timestamp
              ? value.toDate()
              : DateTime.parse('$value'))
          .toLocal();
      return DateFormat('dd MMM yyyy').format(date);
    } catch (_) {
      return 'TBD';
    }
  }

  String _formatVisitDay(dynamic value) {
    if (value == null) return 'Date to be confirmed';
    try {
      final date = (value is DateTime
          ? value
          : value is Timestamp
              ? value.toDate()
              : DateTime.parse('$value'))
          .toLocal();
      return DateFormat('EEEE').format(date);
    } catch (_) {
      return 'Date to be confirmed';
    }
  }

  String _formatVisitTime(dynamic value) {
    if (value == null) return 'Time to be confirmed';
    try {
      final date = (value is DateTime
          ? value
          : value is Timestamp
              ? value.toDate()
              : DateTime.parse('$value'))
          .toLocal();
      return DateFormat('h:mm a').format(date);
    } catch (_) {
      return 'Time to be confirmed';
    }
  }

  DateTime? _readScheduledAt(dynamic value) {
    try {
      if (value == null) return null;
      if (value is Timestamp) return value.toDate().toLocal();
      if (value is DateTime) return value.toLocal();
      return DateTime.parse('$value').toLocal();
    } catch (_) {
      return null;
    }
  }

  void _showInfoDialog(String title, String content) {
    showDialog<void>(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(title, style: const TextStyle(color: _text, fontWeight: FontWeight.w700)),
        content: Text(content, style: const TextStyle(height: 1.45)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close', style: TextStyle(color: _accent, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickAction({required String title, required String subtitle, required IconData icon, required VoidCallback onTap}) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(22),
        child: Container(
          margin: const EdgeInsets.all(6),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: const Color(0xFFD6ECE6)),
            boxShadow: const [BoxShadow(color: Color(0x12000000), blurRadius: 14, offset: Offset(0, 6))],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFE9F7F2), Color(0xFFDDF2EB)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(icon, color: _accent, size: 26),
              ),
              const SizedBox(height: 14),
              Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: _text)),
              const SizedBox(height: 6),
              Text(subtitle, style: const TextStyle(fontSize: 12.5, color: _muted, height: 1.4)),
              const SizedBox(height: 12),
              const Text(
                'Open',
                style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: _accent),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHighlightCard({required String title, required String body, required IconData icon}) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 4),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFD6ECE6)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(color: _surface, borderRadius: BorderRadius.circular(14)),
                child: Icon(icon, color: _accent),
              ),
              const SizedBox(width: 12),
              Expanded(child: Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: _text))),
            ],
          ),
          const SizedBox(height: 12),
          Text(body, style: const TextStyle(fontSize: 14, color: _muted, height: 1.5)),
        ],
      ),
    );
  }

  Widget _buildSupportInsightCard({
    required String eyebrow,
    required String title,
    required String body,
    required IconData icon,
  }) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFD6ECE6)),
        boxShadow: const [BoxShadow(color: Color(0x12000000), blurRadius: 14, offset: Offset(0, 6))],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: _surface,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: _accent, size: 23),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  eyebrow,
                  style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: _accent),
                ),
                const SizedBox(height: 4),
                Text(
                  title,
                  style: const TextStyle(fontSize: 15.5, fontWeight: FontWeight.w700, color: _text),
                ),
                const SizedBox(height: 6),
                Text(
                  body,
                  style: const TextStyle(fontSize: 13, color: _muted, height: 1.45),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _buildCareUpdateTitle(_DashboardData data, DateTime? nextCheckInDate) {
    final nearestVisit = _nearestCareUpdate(data);
    if (nearestVisit != null) return nearestVisit.title;
    if (nextCheckInDate != null) return 'Next check-in is planned';
    return 'Your care plan is getting started';
  }

  String _buildCareUpdateBody(_DashboardData data, DateTime? nextCheckInDate) {
    final nearestVisit = _nearestCareUpdate(data);
    if (nearestVisit != null) return nearestVisit.body;
    if (nextCheckInDate != null) {
      return 'Your next weekly check-in opens on ${_formatCheckInDate(nextCheckInDate)}. Keeping up with these check-ins helps your care team support you early.';
    }
    return 'Complete your first weekly check-in to unlock more personal care guidance here.';
  }

  _CareUpdateSummary? _nearestCareUpdate(_DashboardData data) {
    final items = <_CareUpdateSummary>[];

    if (data.homeVisit != null) {
      final scheduledAt = _readScheduledAt(data.homeVisit!['scheduledAt']);
      if (scheduledAt != null) {
        items.add(
          _CareUpdateSummary(
            scheduledAt: scheduledAt,
            title: 'Nearest visit: Home visit',
            body:
                'Your nearest visit is a home visit on ${_formatVisitDay(data.homeVisit!['scheduledAt'])}, ${_formatVisitDate(data.homeVisit!['scheduledAt'])} at ${_formatVisitTime(data.homeVisit!['scheduledAt'])}.',
          ),
        );
      }
    }

    if (data.clinicVisit != null) {
      final scheduledAt = _readScheduledAt(data.clinicVisit!['scheduledAt']);
      if (scheduledAt != null) {
        items.add(
          _CareUpdateSummary(
            scheduledAt: scheduledAt,
            title: 'Nearest visit: Clinic visit',
            body:
                'Your nearest visit is a clinic visit on ${_formatVisitDay(data.clinicVisit!['scheduledAt'])}, ${_formatVisitDate(data.clinicVisit!['scheduledAt'])} at ${_formatVisitTime(data.clinicVisit!['scheduledAt'])}.',
          ),
        );
      }
    }

    if (data.doctorVisit != null) {
      final scheduledAt = _readScheduledAt(data.doctorVisit!['scheduledAt']);
      if (scheduledAt != null) {
        items.add(
          _CareUpdateSummary(
            scheduledAt: scheduledAt,
            title: 'Nearest visit: Doctor checkup',
            body:
                'Your nearest care appointment is a doctor checkup on ${_formatVisitDay(data.doctorVisit!['scheduledAt'])}, ${_formatVisitDate(data.doctorVisit!['scheduledAt'])} at ${_formatVisitTime(data.doctorVisit!['scheduledAt'])}.',
          ),
        );
      }
    }

    if (items.isEmpty) return null;
    items.sort((a, b) => a.scheduledAt.compareTo(b.scheduledAt));
    return items.first;
  }

  Widget _buildSupportSection(_DashboardData data, DateTime? nextCheckInDate, String supportText, String tipTitle) {
    return Column(
      children: [
        _buildSupportInsightCard(
          eyebrow: 'Gentle reminder',
          title: 'Take one small pause today',
          body: supportText,
          icon: Icons.favorite_rounded,
        ),
        _buildSupportInsightCard(
          eyebrow: 'Small action',
          title: tipTitle,
          body: dailyTipsWithExplanation[tipTitle]!,
          icon: Icons.lightbulb_rounded,
        ),
        _buildSupportInsightCard(
          eyebrow: 'Care update',
          title: _buildCareUpdateTitle(data, nextCheckInDate),
          body: _buildCareUpdateBody(data, nextCheckInDate),
          icon: Icons.notifications_active_outlined,
        ),
      ],
    );
  }

  bool _hasUpcomingVisits(_DashboardData data) {
    return data.homeVisit != null || data.clinicVisit != null || data.doctorVisit != null;
  }

  Widget _buildVisitCard({
    required String title,
    required String date,
    required String day,
    required String time,
    required String subtitle,
    required String tag,
    required IconData icon,
  }) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFD6ECE6)),
        boxShadow: const [BoxShadow(color: Color(0x12000000), blurRadius: 14, offset: Offset(0, 6))],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: _surface,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(icon, color: _accent, size: 24),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        title,
                        style: const TextStyle(fontSize: 15.5, fontWeight: FontWeight.w700, color: _text),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: _surface,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        tag,
                        style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: _accent),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF5FBF8),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: _visitMetaItem(
                          label: 'Date',
                          value: date,
                        ),
                      ),
                      Container(
                        width: 1,
                        height: 34,
                        color: const Color(0xFFD6ECE6),
                      ),
                      Expanded(
                        child: _visitMetaItem(
                          label: 'Time',
                          value: time,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  day,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: _accent),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: const TextStyle(fontSize: 12.5, color: _muted, height: 1.4),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _visitMetaItem({
    required String label,
    required String value,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 11.5, color: _muted, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 13.5, color: _text, fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }

  Widget _buildUpcomingVisitsSection(_DashboardData data) {
    final visitCards = <Widget>[];

    if (data.homeVisit != null) {
      visitCards.add(
        _buildVisitCard(
          title: 'Upcoming home visit',
          date: _formatVisitDate(data.homeVisit!['scheduledAt']),
          day: _formatVisitDay(data.homeVisit!['scheduledAt']),
          time: _formatVisitTime(data.homeVisit!['scheduledAt']),
          subtitle: 'Your assigned midwife is scheduled to visit you at home.',
          tag: 'Home',
          icon: Icons.home_outlined,
        ),
      );
    }

    if (data.clinicVisit != null) {
      visitCards.add(
        _buildVisitCard(
          title: 'Upcoming clinic visit',
          date: _formatVisitDate(data.clinicVisit!['scheduledAt']),
          day: _formatVisitDay(data.clinicVisit!['scheduledAt']),
          time: _formatVisitTime(data.clinicVisit!['scheduledAt']),
          subtitle: 'Your next clinic appointment is already on the calendar.',
          tag: 'Clinic',
          icon: Icons.local_hospital_outlined,
        ),
      );
    }

    if (data.doctorVisit != null) {
      visitCards.add(
        _buildVisitCard(
          title: 'Upcoming doctor checkup',
          date: _formatVisitDate(data.doctorVisit!['scheduledAt']),
          day: _formatVisitDay(data.doctorVisit!['scheduledAt']),
          time: _formatVisitTime(data.doctorVisit!['scheduledAt']),
          subtitle: 'Your assigned doctor has a scheduled follow-up checkup.',
          tag: 'Doctor',
          icon: Icons.medical_services_outlined,
        ),
      );
    }

    if (visitCards.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: _surface,
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Icon(Icons.event_available_rounded, color: _accent),
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: Text(
                'Upcoming visits',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: _text),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        const Text(
          'Keep track of your next home, clinic, and doctor appointments.',
          style: TextStyle(fontSize: 13, color: _muted),
        ),
        const SizedBox(height: 14),
        ...visitCards,
      ],
    );
  }

  Widget _buildSectionHeader({
    required String title,
    required String subtitle,
    required IconData icon,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: _surface,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(icon, color: _accent),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: _text),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          subtitle,
          style: const TextStyle(fontSize: 13, color: _muted),
        ),
      ],
    );
  }

  Widget _buildHomeContent(_DashboardData data) {
    final profile = data.profile;
    final today = DateTime.now().weekday;
    final supportText = _gentleSupportMessages[(today - 1) % _gentleSupportMessages.length];
    final tipKeys = dailyTipsWithExplanation.keys.toList();
    final tipTitle = tipKeys[(today - 1) % tipKeys.length];
    final nextCheckInDate = _nextEPDSTestDate(profile);
    final hasRealEpds = profile.latestEpdsDate != null;

    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(18, 24, 18, 110),
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
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.82),
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(color: const Color(0xFFD6ECE6)),
                        ),
                        child: const Text(
                          'Care overview',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: _accent),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text('Welcome back, ${profile.firstName}', style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: _text)),
                      const SizedBox(height: 6),
                      const Text('Take a quick look at your wellbeing, upcoming check-in, and support for today.', style: TextStyle(fontSize: 14, color: _muted, height: 1.4)),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                InkWell(
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileScreen(showBackButton: true))),
                  borderRadius: BorderRadius.circular(24),
                  child: CircleAvatar(
                    radius: 24,
                    backgroundColor: Colors.white,
                    backgroundImage: ImageUtils.resolveProfileImage(profile.profileImageUrl),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFF67BBA1), Color(0xFF4FA58D)],
                ),
                borderRadius: BorderRadius.circular(30),
                boxShadow: [BoxShadow(color: _accent.withOpacity(0.18), blurRadius: 20, offset: const Offset(0, 10))],
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
                            const Text('Today\'s wellbeing snapshot', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white)),
                            const SizedBox(height: 10),
                            GestureDetector(
                              onTap: () => _showInfoDialog('What is EPDS?', 'EPDS stands for Edinburgh Postnatal Depression Scale. Your score helps track emotional well-being after childbirth.'),
                              child: Text(
                                hasRealEpds ? '${profile.latestEpdsScore} / 30' : 'No test yet',
                                style: const TextStyle(fontSize: 34, fontWeight: FontWeight.w800, color: Colors.white),
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(_checkInStatus(nextCheckInDate), style: const TextStyle(fontSize: 13.5, color: Colors.white70, height: 1.35)),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(22),
                        child: SizedBox(
                          width: 122,
                          height: 122,
                          child: _videoController.value.isInitialized
                              ? AspectRatio(aspectRatio: _videoController.value.aspectRatio, child: VideoPlayer(_videoController))
                              : Container(
                                  color: Colors.white.withOpacity(0.18),
                                  child: const Center(child: CircularProgressIndicator(color: Colors.white)),
                                ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: _heroMiniCard(
                          'Last Test',
                          _formatLastTestDate(profile.latestEpdsDate),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _heroMiniCard(
                          'Next Check-In',
                          _formatCheckInDate(nextCheckInDate),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            _buildSectionHeader(
              title: 'Quick actions',
              subtitle: 'Go straight to the parts of care you use most.',
              icon: Icons.grid_view_rounded,
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                _buildQuickAction(
                  title: 'Weekly Test',
                  subtitle: 'Complete this week\'s EPDS check-in',
                  icon: Icons.fact_check_rounded,
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const WeeklyCheckInPage(showBackButton: true))),
                ),
                _buildQuickAction(
                  title: 'Prescription',
                  subtitle: 'Review medicines and care notes',
                  icon: Icons.medication_rounded,
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PrescriptionPage(showBackButton: true))),
                ),
              ],
            ),
            Row(
              children: [
                _buildQuickAction(
                  title: 'Messages',
                  subtitle: 'Check in with your doctor and midwife',
                  icon: Icons.chat_bubble_rounded,
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ChatPage(doctorName: 'Dr. Smith', showBackButton: true))),
                ),
                _buildQuickAction(
                  title: 'Resources',
                  subtitle: 'Read supportive articles and tips',
                  icon: Icons.menu_book_rounded,
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const EducationalResourcesScreen(showBackButton: true))),
                ),
              ],
            ),
            if (_hasUpcomingVisits(data)) ...[
              const SizedBox(height: 18),
              _buildUpcomingVisitsSection(data),
            ],
            const SizedBox(height: 6),
            _buildSectionHeader(
              title: 'Today for you',
              subtitle: 'A gentle reminder, one small action, and your next care update.',
              icon: Icons.favorite_outline_rounded,
            ),
            const SizedBox(height: 12),
            _buildSupportSection(data, nextCheckInDate, supportText, tipTitle),
          ],
        ),
      ),
    );
  }

  Widget _heroMiniCard(String label, String value) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.16),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.22)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: Colors.white70, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          Text(value, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 15, color: Colors.white, fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }

  Future<_DashboardData> _fetchDashboardData() async {
    final profile = await MotherProfileService.instance.fetchCurrentProfile();
    final visits = await Future.wait([
      VisitService.instance.fetchSoonestMidwifeVisit(profile.uid, 'home'),
      VisitService.instance.fetchSoonestMidwifeVisit(profile.uid, 'clinic'),
      VisitService.instance.fetchSoonestDoctorCheckup(profile.uid),
    ]);

    return _DashboardData(
      profile: profile,
      homeVisit: visits[0],
      clinicVisit: visits[1],
      doctorVisit: visits[2],
    );
  }

  void _onItemTapped(int index) => setState(() => _selectedIndex = index);

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<_DashboardData>(
      future: _fetchDashboardData(),
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Scaffold(
            backgroundColor: _background,
            body: Center(child: CircularProgressIndicator(color: _accent)),
          );
        }

        if (snapshot.hasError || !snapshot.hasData) {
          return Scaffold(
            backgroundColor: _background,
            body: Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text('Unable to load your home screen right now.', textAlign: TextAlign.center, style: const TextStyle(color: _text, fontSize: 18, fontWeight: FontWeight.w700)),
              ),
            ),
          );
        }

        final pages = [
          _buildHomeContent(_DashboardData(
            profile: snapshot.data!.profile,
            homeVisit: snapshot.data!.homeVisit,
            clinicVisit: snapshot.data!.clinicVisit,
            doctorVisit: snapshot.data!.doctorVisit,
          )),
          const WeeklyCheckInPage(),
          const ChatPage(doctorName: 'Dr. Smith'),
          NotificationTab(),
          const ProfileScreen(showBackButton: false),
        ];

        return Scaffold(
          backgroundColor: _background,
          body: Stack(
            children: [
              IndexedStack(index: _selectedIndex, children: pages),
              if (_selectedIndex == 0)
                Positioned(
                  right: 24,
                  bottom: 34,
                  child: FloatingActionButton.extended(
                    onPressed: () => Navigator.pushNamed(context, '/chatbot'),
                    backgroundColor: _accent,
                    icon: const Icon(Icons.volunteer_activism_rounded, color: Colors.white),
                    label: const Text('Support', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                  ),
                ),
            ],
          ),
          bottomNavigationBar: StreamBuilder<MotherNotificationSummary>(
            stream: NotificationService.instance.watchSummary(),
            builder: (context, snapshot) {
              final summary = snapshot.data;
              return BottomNavBar(
                currentIndex: _selectedIndex,
                onTap: _onItemTapped,
                unreadMessages: summary?.unreadMessagesCount ?? 0,
                unreadNotifications: summary?.unreadNotificationsCount ?? 0,
              );
            },
          ),
        );
      },
    );
  }
}
