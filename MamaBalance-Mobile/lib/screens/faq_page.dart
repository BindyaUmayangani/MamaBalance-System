import 'package:flutter/material.dart';

class FAQPage extends StatelessWidget {
  const FAQPage({
    super.key,
    this.audience = 'mother',
  });

  final String audience;

  static const Color _mint = Color(0xFF4FA38A);
  static const Color _bg = Color(0xFFEFF8F4);
  static const Color _surface = Color(0xFFECF8F4);
  static const Color _text = Color(0xFF203C35);
  static const Color _muted = Color(0xFF60756D);

  static const List<Map<String, String>> _motherFaqs = [
    {
      'question': 'How do I complete my weekly check-in?',
      'answer':
          'Open the Weekly Check-In page, choose your preferred language, and answer each EPDS question based on how you felt during the past 7 days.',
    },
    {
      'question': 'What should I do if I forget my password?',
      'answer':
          'Use the Forgot Password option on the sign-in screen. Follow the steps shown in the app to create a new password.',
    },
    {
      'question': 'Can I contact my doctor through the app?',
      'answer':
          'Yes. You can use the chat area from the home screen or bottom navigation to view and send messages.',
    },
    {
      'question': 'Where can I find my prescriptions?',
      'answer':
          'Your prescription details and instructions are available on the Prescription page from the home screen.',
    },
    {
      'question': 'Who can see my information?',
      'answer':
          'Your information is intended for your care team and is handled according to the MamaBalance privacy and access controls.',
    },
  ];

  static const List<Map<String, String>> _guardianFaqs = [
    {
      'question': 'What can guardians do in the app?',
      'answer':
          'Guardians can view the linked mother overview, check upcoming visits, see assigned care team details, open emergency support, and read guardian resources.',
    },
    {
      'question': 'How do I sign in as a guardian?',
      'answer':
          'Use the guardian phone number linked to the mother account. Sign in with OTP, and if enabled on your device, use biometrics to unlock later sessions.',
    },
    {
      'question': 'Can guardians send messages to the care team?',
      'answer':
          'No. Guardians can view the assigned care team and call them when urgent support is needed, but secure chat is not part of the guardian app view.',
    },
    {
      'question': 'Why do I only see guardian resources?',
      'answer':
          'Admins upload a separate set of educational resources for guardians. The guardian app view shows only those guardian-relevant resources.',
    },
    {
      'question': 'What notifications can guardians receive?',
      'answer':
          'Guardians can receive alerts for upcoming visits, overdue visits, overdue EPDS assessments, and newly published guardian resources.',
    },
  ];

  bool get _isGuardian => audience.trim().toLowerCase() == 'guardian';

  List<Map<String, String>> get _faqs =>
      _isGuardian ? _guardianFaqs : _motherFaqs;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
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
                      'FAQ',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                        color: _text,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Padding(
                padding: const EdgeInsets.only(left: 48),
                child: Text(
                  _isGuardian
                      ? 'Quick answers to the questions guardians ask most often.'
                      : 'Quick answers to the questions mothers ask most often.',
                  style: const TextStyle(fontSize: 14, color: _muted, height: 1.45),
                ),
              ),
              const SizedBox(height: 20),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(color: const Color(0xFFD7EAE3)),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: _surface,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const Icon(
                        Icons.question_answer_outlined,
                        color: _mint,
                      ),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text(
                        'Need help finding something in the app? Start here.',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: _text,
                          height: 1.4,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              ..._faqs.map(
                (item) => Container(
                  margin: const EdgeInsets.only(bottom: 14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(color: const Color(0xFFD7EAE3)),
                  ),
                  child: ExpansionTile(
                    tilePadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 4,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(22),
                    ),
                    collapsedShape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(22),
                    ),
                    iconColor: _mint,
                    collapsedIconColor: _mint,
                    title: Text(
                      item['question']!,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: _text,
                      ),
                    ),
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: Text(
                            item['answer']!,
                            style: const TextStyle(
                              fontSize: 14,
                              color: _muted,
                              height: 1.5,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
