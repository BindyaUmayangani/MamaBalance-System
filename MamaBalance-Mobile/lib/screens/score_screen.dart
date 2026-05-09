import 'package:flutter/material.dart';
import 'emergency_contacts_page.dart';

class ScoreScreen extends StatefulWidget {
  final int score;
  final String? predictedMood;
  final DateTime? attemptedAt;

  const ScoreScreen({
    super.key,
    required this.score,
    this.predictedMood,
    this.attemptedAt,
  });

  @override
  State<ScoreScreen> createState() => _ScoreScreenState();
}

class _ScoreScreenState extends State<ScoreScreen> {
  static const Color _accent = Color(0xFF4A90C2);
  static const Color _background = Color(0xFFF3FAFD);
  static const Color _text = Color(0xFF1F3A5F);
  static const Color _muted = Color(0xFF5F7285);

  String get _scoreHeadline {
    if (widget.score <= 9) {
      return 'Your check-in has been saved';
    }
    if (widget.score <= 12) {
      return 'Thank you for checking in today';
    }
    return 'Your care team can support you early';
  }

  String get _scoreSummary {
    if (widget.score <= 9) {
      return 'Your check-in gives your care team a simple snapshot of how this week has felt.';
    }
    if (widget.score <= 12) {
      return 'Your check-in suggests that a little extra care, rest, and support may help this week feel lighter.';
    }
    return 'Your check-in suggests you may benefit from extra support. You do not have to carry this alone.';
  }

  String get _scoreBandLabel {
    if (widget.score <= 9) {
      return 'Steady check-in';
    }
    if (widget.score <= 12) {
      return 'Needs a little extra care';
    }
    return 'Support is important right now';
  }

  String? get _attemptedLabel {
    final attemptedAt = widget.attemptedAt;
    if (attemptedAt == null) {
      return null;
    }

    final local = attemptedAt.toLocal();
    final day = local.day.toString().padLeft(2, '0');
    final minute = local.minute.toString().padLeft(2, '0');
    final hour =
        local.hour == 0 ? 12 : (local.hour > 12 ? local.hour - 12 : local.hour);
    final meridiem = local.hour >= 12 ? 'PM' : 'AM';

    return '$day ${_monthName(local.month)} ${local.year} at $hour:$minute $meridiem';
  }

  String _monthName(int month) {
    const months = [
      '',
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return months[month];
  }

  List<Map<String, String>> getRecommendations() {
    List<Map<String, String>> recommendations = [];

    if (widget.score <= 9) {
      recommendations = [
        {
          'title': 'Keep shining',
          'message':
              'You are doing well. Notice and celebrate the small wins in your day.',
        },
        {
          'title': 'Moments of joy',
          'message':
              'Spend a few minutes doing something that feels light and comforting.',
        },
      ];
    } else if (widget.score <= 12) {
      recommendations = [
        {
          'title': 'Gentle reminder',
          'message':
              'It is okay to slow down. A short rest or deep breathing can help.',
        },
        {
          'title': 'You are not alone',
          'message':
              'Talking to someone you trust can make heavy feelings easier to carry.',
        },
      ];
    } else {
      recommendations = [
        {
          'title': 'Take a pause',
          'message':
              'You deserve care and calm. Try soft music, quiet rest, or guided breathing.',
        },
        {
          'title': 'Reach out',
          'message':
              'If your emotions feel too heavy, contacting a counselor or doctor can help.',
        },
      ];
    }

    switch ((widget.predictedMood ?? '').toLowerCase()) {
      case 'happy':
        recommendations.add({
          'title': 'Share the warmth',
          'message':
              'Lean into the things and people that help you feel connected.',
        });
        break;
      case 'sad':
        recommendations.add({
          'title': 'Comfort yourself',
          'message':
              'A warm drink, calming music, or journaling may help you feel steadier.',
        });
        break;
      case 'angry':
        recommendations.add({
          'title': 'Release tension',
          'message':
              'Try breathing slowly or taking a short walk to ease that tension.',
        });
        break;
      case 'neutral':
        recommendations.add({
          'title': 'Stay grounded',
          'message':
              'Gentle routines and regular rest can help you stay balanced.',
        });
        break;
      case 'fear':
        recommendations.add({
          'title': 'Create safety',
          'message':
              'Stay near people or places that help you feel supported and calm.',
        });
        break;
      default:
        break;
    }

    return recommendations;
  }

  void _openEmergencyContacts() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => EmergencyContactsPage()),
    );
  }

  Widget _buildNeedHelpNowCard() {
    final isHighSupport = widget.score > 12;

    return Semantics(
      button: true,
      label: 'Need Help Now?',
      hint: 'Open emergency contacts',
      child: InkWell(
        onTap: _openEmergencyContacts,
        borderRadius: BorderRadius.circular(22),
        child: Container(
          width: double.infinity,
          margin: const EdgeInsets.only(bottom: 18),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isHighSupport ? const Color(0xFFFFF7F4) : Colors.white,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(
              color:
                  isHighSupport
                      ? const Color(0xFFF3C4B8)
                      : const Color(0xFFD6EAF5),
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color:
                      isHighSupport
                          ? const Color(0xFFFFE8E0)
                          : const Color(0xFFEAF6FC),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color:
                        isHighSupport
                            ? const Color(0xFFF3C4B8)
                            : const Color(0xFFD6EAF5),
                  ),
                ),
                child: Icon(
                  Icons.emergency_share_rounded,
                  color: isHighSupport ? const Color(0xFFC95742) : _accent,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Need Help Now?',
                      style: TextStyle(
                        fontSize: 15.5,
                        fontWeight: FontWeight.w800,
                        color: _text,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      isHighSupport
                          ? 'Emergency contacts and trusted support are one tap away.'
                          : 'Open emergency contacts any time you need urgent support.',
                      style: const TextStyle(
                        fontSize: 13,
                        color: _muted,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              const Icon(
                Icons.arrow_forward_ios_rounded,
                size: 16,
                color: _muted,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInsightCard({
    required String title,
    required String message,
    required IconData icon,
    Color background = const Color(0xFFFFFFFF),
  }) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFD6EAF5)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: const Color(0xFFEAF6FC),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFD6EAF5)),
            ),
            child: Icon(icon, color: _accent),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15.5,
                    fontWeight: FontWeight.w700,
                    color: _text,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  message,
                  style: const TextStyle(
                    fontSize: 13.5,
                    color: _muted,
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

  @override
  Widget build(BuildContext context) {
    final recommendations = getRecommendations();

    return Scaffold(
      backgroundColor: _background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
          child: Column(
            children: [
              const Text(
                'Weekly check-in complete',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: _text,
                  height: 1.3,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Here are a few simple ways to care for yourself today. You can view the number later from Profile if you need it.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, color: _muted, height: 1.45),
              ),
              const SizedBox(height: 22),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(color: const Color(0xFFD6EAF5)),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x12000000),
                      blurRadius: 16,
                      offset: Offset(0, 6),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 7,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEAF6FC),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        _scoreBandLabel,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: _accent,
                        ),
                      ),
                    ),
                    const SizedBox(height: 18),
                    Container(
                      width: 132,
                      height: 132,
                      decoration: const BoxDecoration(
                        color: Color(0xFFEAF6FC),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.volunteer_activism_rounded,
                        color: _accent,
                        size: 58,
                      ),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      _scoreHeadline,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: _text,
                        height: 1.3,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _scoreSummary,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 14,
                        color: _muted,
                        height: 1.5,
                      ),
                    ),
                    if (_attemptedLabel != null) ...[
                      const SizedBox(height: 16),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 12,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF7FCFE),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Text(
                          'Saved on $_attemptedLabel',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 13,
                            color: _muted,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 24),
                    const Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'Helpful next steps',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          color: _text,
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),
                    ...recommendations.take(3).toList().asMap().entries.map((
                      entry,
                    ) {
                      final index = entry.key;
                      final rec = entry.value;
                      final icons = [
                        Icons.self_improvement_rounded,
                        Icons.favorite_border_rounded,
                        Icons.wb_sunny_outlined,
                      ];
                      return _buildInsightCard(
                        title: rec['title']!,
                        message: rec['message']!,
                        icon: icons[index % icons.length],
                        background:
                            index == 0 ? const Color(0xFFEAF6FC) : Colors.white,
                      );
                    }),
                    _buildInsightCard(
                      title: 'Looking ahead',
                      message:
                          'Your next check-in helps you notice changes over time and makes it easier for your care team to support you.',
                      icon: Icons.calendar_month_rounded,
                    ),
                    const SizedBox(height: 8),
                    _buildNeedHelpNowCard(),
                    const SizedBox(height: 6),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed:
                            () => Navigator.pushReplacementNamed(
                              context,
                              '/home',
                            ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _accent,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(18),
                          ),
                        ),
                        child: const Text(
                          'Continue',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}
