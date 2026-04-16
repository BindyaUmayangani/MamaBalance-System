import 'package:flutter/material.dart';

import '../services/weekly_checkin_service.dart';
import 'language_selection_screen.dart';

class WeeklyCheckInPage extends StatefulWidget {
  const WeeklyCheckInPage({super.key, this.showBackButton = false});

  final bool showBackButton;

  @override
  State<WeeklyCheckInPage> createState() => _WeeklyCheckInPageState();
}

class _WeeklyCheckInPageState extends State<WeeklyCheckInPage> {
  late Future<WeeklyCheckInAvailability> _availabilityFuture;

  static const Color _accent = Color(0xFF4FA58D);
  static const Color _background = Color(0xFFF3FBF8);
  static const Color _text = Color(0xFF173C3A);
  static const Color _muted = Color(0xFF6A7B79);

  @override
  void initState() {
    super.initState();
    _availabilityFuture = WeeklyCheckInService.instance.fetchAvailability();
  }

  String _formatDate(DateTime date) {
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

    final local = date.toLocal();
    return '${local.day.toString().padLeft(2, '0')} ${months[local.month]} ${local.year}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _background,
      body: SafeArea(
        child: FutureBuilder<WeeklyCheckInAvailability>(
          future: _availabilityFuture,
          builder: (context, snapshot) {
            final availability = snapshot.data;
            final canStart = availability?.canStart ?? true;

            return SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      if (widget.showBackButton) ...[
                        IconButton(
                          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: _text),
                          onPressed: () => Navigator.pop(context),
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                        ),
                        const SizedBox(width: 12),
                      ],
                      const Expanded(
                        child: Text(
                          'Weekly Check-In',
                          style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: _text),
                        ),
                      ),
                    ],
                  ),
                  Padding(
                    padding: EdgeInsets.only(left: widget.showBackButton ? 48 : 0),
                    child: const Text(
                      'A short EPDS check-in to help you and your care team notice how you have been feeling this week.',
                      style: TextStyle(fontSize: 14, color: _muted, height: 1.45),
                    ),
                  ),
                  const SizedBox(height: 20),
                  if (snapshot.connectionState == ConnectionState.waiting)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.symmetric(vertical: 32),
                        child: CircularProgressIndicator(color: _accent),
                      ),
                    )
                  else ...[
                    if (!canStart && availability?.nextAvailableAt != null)
                      Container(
                        width: double.infinity,
                        margin: const EdgeInsets.only(bottom: 16),
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEAF7F2),
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(color: const Color(0xFFD6ECE6)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Row(
                              children: [
                                Icon(Icons.lock_clock_rounded, color: _accent),
                                SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    'Your next check-in is not open yet',
                                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: _text),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Text(
                              'You have already completed this week\'s assessment. Your next check-in will be available on ${_formatDate(availability!.nextAvailableAt!)}.',
                              style: const TextStyle(fontSize: 14, color: _muted, height: 1.45),
                            ),
                          ],
                        ),
                      ),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(28),
                        border: Border.all(color: const Color(0xFFD6ECE6)),
                        boxShadow: const [BoxShadow(color: Color(0x12000000), blurRadius: 16, offset: Offset(0, 6))],
                      ),
                      child: const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              CircleAvatar(
                                radius: 22,
                                backgroundColor: Color(0xFFE4F4EF),
                                child: Icon(Icons.favorite_outline_rounded, color: _accent),
                              ),
                              SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  'Before you start',
                                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: _text),
                                ),
                              ),
                            ],
                          ),
                          SizedBox(height: 14),
                          Text(
                            'Please choose the answer that comes closest to how you have felt during the past 7 days, not just today.',
                            style: TextStyle(fontSize: 14, color: _muted, height: 1.5),
                          ),
                          SizedBox(height: 16),
                          Text(
                            'Example question',
                            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: _text),
                          ),
                          SizedBox(height: 12),
                        ],
                      ),
                    ),
                    Container(
                      margin: const EdgeInsets.only(top: 14),
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: const Color(0xFFD6ECE6)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'I have felt happy:',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: _text),
                          ),
                          const SizedBox(height: 10),
                          _buildDisabledRadio('Yes, all the time'),
                          _buildDisabledRadio('Yes, most of the time'),
                          _buildDisabledRadio('No, not very often'),
                          _buildDisabledRadio('No, not at all'),
                          const SizedBox(height: 14),
                          const Text(
                            'This means: I have felt happy most of the time during the past week. Please answer the other questions in the same way.',
                            style: TextStyle(fontSize: 14, color: _muted, height: 1.5),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 26),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: canStart
                            ? () {
                                Navigator.push(context, MaterialPageRoute(builder: (_) => const LanguageSelectionScreen()));
                              }
                            : null,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _accent,
                          foregroundColor: Colors.white,
                          disabledBackgroundColor: const Color(0xFFD9E7E2),
                          disabledForegroundColor: _muted,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                        ),
                        child: Text(
                          canStart ? 'Start' : 'Available after 7 days',
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  static Widget _buildDisabledRadio(String title) {
    final selected = title == 'Yes, most of the time';
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: selected ? const Color(0xFFECF8F4) : const Color(0xFFF9FCFB),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: selected ? _accent : const Color(0xFFD6ECE6)),
      ),
      child: RadioListTile<String>(
        title: Text(
          title,
          style: const TextStyle(color: _text, fontSize: 14),
        ),
        value: title,
        groupValue: 'Yes, most of the time',
        onChanged: null,
        dense: true,
        activeColor: _accent,
        visualDensity: const VisualDensity(vertical: -3),
      ),
    );
  }
}
