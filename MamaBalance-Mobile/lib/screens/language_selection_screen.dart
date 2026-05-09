import 'package:flutter/material.dart';

import 'checkin_screen.dart';

class LanguageSelectionScreen extends StatelessWidget {
  const LanguageSelectionScreen({super.key});

  Widget _buildLanguageCard(
    BuildContext context, {
    required String title,
    required String subtitle,
    required String language,
  }) {
    return InkWell(
      borderRadius: BorderRadius.circular(22),
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => CheckInScreen(language: language)),
        );
      },
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: const Color(0xFFD6EAF5)),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF4A90C2).withOpacity(0.08),
              blurRadius: 18,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: const Color(0xFFDDF1FA),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(Icons.language, color: Color(0xFF1F6F99)),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF1F3A5F),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 13,
                      color: Color(0xFF5F7285),
                    ),
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.arrow_forward_ios_rounded,
              size: 18,
              color: Color(0xFF5F7285),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF3FAFD),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF3FAFD),
        elevation: 0,
        title: const Text(
          'Select Language',
          style: TextStyle(
            color: Color(0xFF1F3A5F),
            fontWeight: FontWeight.w700,
          ),
        ),
        iconTheme: const IconThemeData(color: Color(0xFF1F3A5F)),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(28),
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFFFFFFFF), Color(0xFFEAF6FC)],
                  ),
                  border: Border.all(color: const Color(0xFFD6EAF5)),
                ),
                child: const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Choose your preferred language',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF1F3A5F),
                      ),
                    ),
                    SizedBox(height: 10),
                    Text(
                      'We will use this language for your check-ins and questionnaire flow.',
                      style: TextStyle(
                        fontSize: 15,
                        height: 1.5,
                        color: Color(0xFF5F7285),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 28),
              _buildLanguageCard(
                context,
                title: 'English',
                subtitle: 'Continue in English',
                language: 'English',
              ),
              const SizedBox(height: 16),
              _buildLanguageCard(
                context,
                title: '?????',
                subtitle: 'Continue in Sinhala',
                language: 'Sinhala',
              ),
            ],
          ),
        ),
      ),
    );
  }
}
