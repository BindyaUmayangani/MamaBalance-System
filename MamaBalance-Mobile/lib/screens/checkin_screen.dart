import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../services/weekly_checkin_service.dart';
import 'score_screen.dart';

class CheckInScreen extends StatefulWidget {
  final String language;
  const CheckInScreen({super.key, required this.language});

  @override
  State<CheckInScreen> createState() => _CheckInScreenState();
}

class _CheckInScreenState extends State<CheckInScreen> {
  static const String _draftKeyPrefix = 'weekly_checkin_draft';

  int _pageIndex = 0;
  Map<int, String> answers = {};

  final int questionsPerPage = 2;

  String get _draftKey => '${_draftKeyPrefix}_${widget.language.toLowerCase()}';

  @override
  void initState() {
    super.initState();
    _restoreDraft();
  }

  // ================= QUESTIONS =================

  final List<Map<String, dynamic>> englishQuestions = [
    {
      'text': 'I have been able to laugh and see the funny side of things',
      'options': [
        'As much as I always could',
        'Not quite so much now',
        'Definitely not so much now',
        'Not at all',
      ],
      'reverse': false,
    },
    {
      'text': 'I have looked forward with enjoyment to things',
      'options': [
        'As much as I ever did',
        'Rather less than I used to',
        'Definitely less than I used to',
        'Hardly at all',
      ],
      'reverse': false,
    },
    {
      'text': 'I have blamed myself unnecessarily when things went wrong',
      'options': [
        'Yes, most of the time',
        'Yes, some of the time',
        'Not very often',
        'No, never',
      ],
      'reverse': true,
    },
    {
      'text': 'I have been anxious or worried for no good reason',
      'options': [
        'No, not at all',
        'Hardly ever',
        'Yes, sometimes',
        'Yes, very often',
      ],
      'reverse': false,
    },
    {
      'text': 'I have felt scared or panicky for no very good reason',
      'options': [
        'Yes, quite a lot',
        'Yes, sometimes',
        'No, not much',
        'No, not at all',
      ],
      'reverse': true,
    },
    {
      'text': 'Things have been getting on top of me',
      'options': [
        'Yes, most of the time I haven’t been able to cope at all',
        'Yes, sometimes I haven’t been coping as well as usual',
        'No, most of the time I have coped quite well',
        'No, I have been coping as well as ever',
      ],
      'reverse': true,
    },
    {
      'text': 'I have been so unhappy that I have had difficulty sleeping',
      'options': [
        'Yes, most of the time',
        'Yes, sometimes',
        'Not very often',
        'No, not at all',
      ],
      'reverse': true,
    },
    {
      'text': 'I have felt sad or miserable',
      'options': [
        'Yes, most of the time',
        'Yes, quite often',
        'Not very often',
        'No, not at all',
      ],
      'reverse': true,
    },
    {
      'text': 'I have been so unhappy that I have been crying',
      'options': [
        'Yes, most of the time',
        'Yes, quite often',
        'Only occasionally',
        'No, never',
      ],
      'reverse': true,
    },
    {
      'text': 'The thought of harming myself has occurred to me',
      'options': ['Yes, quite often', 'Sometimes', 'Hardly ever', 'Never'],
      'reverse': true,
    },
  ];

  final List<Map<String, dynamic>> sinhalaQuestions = [
    {
      'text':
          'පසුගිය සතිය තුළ, ඔබට සිනා සීමටත්, යමක සිනහව උපදවන සුළු පැත්ත දැකීමටත් කොපමණ දුරට හැකි වූයේ ද?',
      'options': [
        'මට මීට පෙරත් හැකිවූ පමණින්ම',
        'ඉස්සර තරම්ම හැකිවූයේ නැත',
        'කොහෙත්ම ඉස්සර තරම්ම හැකිවූයේ නැත',
        'නැත, කිසිසේත්ම හැකිවූයේ නැත',
      ],
      'reverse': false,
    },
    {
      'text':
          'යම් යම් දේවල් ගැන සතුටු සිතින් පුල පුලා බලා සිටීමට පසුගිය සතිය තුළදී ඔබට කොපමණ දුරට හැකිවුයේ ද?',
      'options': [
        'මා මීට පෙර සිටි තරමටම',
        'වෙනදාට වඩා අඩුවෙන්',
        'ස්ථිරවම වෙනදාට වඩා අඩුවෙන්',
        'නැත, කොහෙත්ම නැති තරම්',
      ],
      'reverse': false,
    },
    {
      'text':
          'පසුගිය සතිය තුළ, යම් කිසිවක් වැරදුනු විට ඔබ අනවශ්‍ය ලෙස ඔබටම දොස් පවරා ගත්තෙහි ද?',
      'options': [
        'ඔව්, සැමවිටම වාගේ',
        'ඔව්, සමහර විටෙකදී',
        'නැත, කොහෙත්ම නැතිතරම්',
        'නැත, කිසිවිටක නැත',
      ],
      'reverse': true,
    },
    {
      'text':
          'පසුගිය සතිය තුළ, ඔබ හේතුවක් නොමැතිව හිත කරදර කර ගනිමින් හෝ කුමක් හෝ වෙයිදෝ යන සැකයෙන් පසුවුනෙහි ද?',
      'options': [
        'නැත, කොහෙත්ම නැතිතරම්',
        'බොහෝම කලාතුරකින් පමණි',
        'ඔව්, සමහර විටක',
        'ඔව්, නිතරම වාගේ',
      ],
      'reverse': false,
    },
    {
      'text':
          'පසුගිය සතිය තුළ, ඔබ කිසිම සැලකිය යුතු හේතුවක් නොමැතිව බියටත් කලබලයටත් පත්වුයෙහි ද?',
      'options': [
        'ඔව්, විශාල වශයෙන්',
        'ඔව්, සමහර විට',
        'නැත, එතරම් නැත',
        'නැත, කිසිවිටකත් නැත',
      ],
      'reverse': true,
    },
    {
      'text':
          'පසුගිය සතිය තුළ, ඔබේ එදිනෙදා ඇති වන ප්‍රශ්නවලට මුහුණ දුන් ආකාරය ගැන ඔබට කුමක් කිව හැකි ද?',
      'options': [
        'බොහෝ විට මට ඒවාට මුහුණදීමට නොහැකි විය',
        'සමහර විට වෙනදා තරම් හොඳින් නොහැකි විය',
        'බොහෝ විට හොඳින් මුහුණ දුන්නෙමි',
        'වෙනදා මෙන්ම හොඳින් මුහුණ දුන්නෙමි',
      ],
      'reverse': false,
    },
    {
      'text':
          'පසුගිය සතිය තුළ, ඔබ නින්දට වැටීමට පවා අපහසු වන තරමට අසතුටෙන් පසු වුයෙහි ද?',
      'options': [
        'ඔව්, බොහෝ විට',
        'ඔව්, සමහර විට',
        'ඉඳහිට පමණි',
        'නැත, කිසිවිටක නැත',
      ],
      'reverse': true,
    },
    {
      'text': 'පසුගිය සතිය තුළ, ඔබ දුකෙන් හෝ සිත්තැවුලෙන් හෝ සිටියෙහි ද?',
      'options': [
        'ඔව්, නිතරම',
        'ඔව්, බොහෝ විට',
        'කලාතුරකින්',
        'නැත, කිසිවිටක නැත',
      ],
      'reverse': true,
    },
    {
      'text': 'පසුගිය සතිය තුළ, ඔබ අසතුටින් සිටීම නිසා හැඬු අවස්ථා තිබේ ද?',
      'options': [
        'ඔව්, නිතරම',
        'ඔව්, බොහෝ විට',
        'ඉඳහිට පමණි',
        'නැත, කිසිවිටක නැත',
      ],
      'reverse': true,
    },
    {
      'text': 'ඔබටම හානියක් කර ගැනීමේ සිතුවිලි පසුගිය සතිය තුළදී තිබුණා ද?',
      'options': ['ඔව්, නිතරම', 'සමහර විට', 'කලාතුරකින්', 'නැත, කිසිවිටක නැත'],
      'reverse': true,
    },
  ];

  // ================= LOGIC =================

  int getScore(int qIndex, String option) {
    final questions =
        widget.language == 'Sinhala' ? sinhalaQuestions : englishQuestions;
    final opts = questions[qIndex]['options'] as List<String>;
    final reverse = questions[qIndex]['reverse'] as bool;
    final selectedIndex = opts.indexOf(option);
    return reverse ? (3 - selectedIndex) : selectedIndex;
  }

  List<int> buildAnswersList() {
    final questions =
        widget.language == 'Sinhala' ? sinhalaQuestions : englishQuestions;

    return List.generate(questions.length, (index) {
      return getScore(index, answers[index]!);
    });
  }

  bool hasSelfHarmThoughts(List<int> scoredAnswers) {
    if (scoredAnswers.isEmpty) return false;
    return scoredAnswers.last > 0;
  }

  Future<void> _restoreDraft() async {
    final prefs = await SharedPreferences.getInstance();
    final rawDraft = prefs.getString(_draftKey);
    if (rawDraft == null || rawDraft.trim().isEmpty) return;

    try {
      final decoded = jsonDecode(rawDraft);
      if (decoded is! Map<String, dynamic>) return;

      final questions =
          widget.language == 'Sinhala' ? sinhalaQuestions : englishQuestions;
      final totalPages = (questions.length / questionsPerPage).ceil();
      final restoredAnswers = <int, String>{};
      final rawAnswers = decoded['answers'];

      if (rawAnswers is Map<String, dynamic>) {
        rawAnswers.forEach((key, value) {
          final index = int.tryParse(key);
          if (index == null || index < 0 || index >= questions.length) return;

          final option = '$value';
          final options = (questions[index]['options'] as List).cast<String>();
          if (options.contains(option)) {
            restoredAnswers[index] = option;
          }
        });
      }

      final rawPage = int.tryParse('${decoded['pageIndex'] ?? 0}') ?? 0;
      final restoredPage = rawPage.clamp(0, totalPages - 1);

      if (!mounted) return;
      setState(() {
        answers = restoredAnswers;
        _pageIndex = restoredPage;
      });
    } on FormatException {
      await prefs.remove(_draftKey);
    }
  }

  Future<void> _saveDraft() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _draftKey,
      jsonEncode({
        'pageIndex': _pageIndex,
        'answers': answers.map((key, value) => MapEntry('$key', value)),
      }),
    );
  }

  Future<void> _clearDraft() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_draftKey);
  }

  void _selectAnswer(int qIndex, String value) {
    setState(() => answers[qIndex] = value);
    _saveDraft();
  }

  void _goToPreviousPage() {
    if (_pageIndex == 0) return;
    setState(() => _pageIndex--);
    _saveDraft();
  }

  void _goToNextPage() {
    setState(() => _pageIndex++);
    _saveDraft();
  }

  Future<void> handleSubmit() async {
    int totalScore = 0;
    final questions =
        widget.language == 'Sinhala' ? sinhalaQuestions : englishQuestions;

    for (int i = 0; i < questions.length; i++) {
      totalScore += getScore(i, answers[i]!);
    }

    try {
      final scoredAnswers = buildAnswersList();
      final result = await WeeklyCheckInService.instance.submitCheckIn(
        language: widget.language,
        answers: scoredAnswers,
        score: totalScore,
        hasSelfHarmThoughts: hasSelfHarmThoughts(scoredAnswers),
      );

      if (!mounted) return;
      await _clearDraft();
      if (!mounted) return;

      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder:
              (_) => ScoreScreen(
                score: result.score,
                attemptedAt: result.attemptedAt,
              ),
        ),
      );
    } on Exception catch (error) {
      showError(error.toString());
    }
  }

  void showValidationMessage() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Please answer all questions before continuing.'),
        backgroundColor: Colors.redAccent,
      ),
    );
  }

  void showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.redAccent),
    );
  }

  // ================= UI =================

  @override
  Widget build(BuildContext context) {
    final questions =
        widget.language == 'Sinhala' ? sinhalaQuestions : englishQuestions;

    final int start = _pageIndex * questionsPerPage;
    final int end =
        (start + questionsPerPage) > questions.length
            ? questions.length
            : start + questionsPerPage;

    final totalPages = (questions.length / questionsPerPage).ceil();

    return Scaffold(
      backgroundColor: const Color(0xFFF3FAFD),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF3FAFD),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios_new_rounded,
            color: Color(0xFF1F3A5F),
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Check-In in ${widget.language}',
          style: const TextStyle(
            color: Color(0xFF1F3A5F),
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.fromLTRB(16, 18, 16, 16),
        child: Column(
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: const Color(0xFFD6EAF5)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Page ${_pageIndex + 1} of $totalPages',
                    style: const TextStyle(
                      color: Color(0xFF5F7285),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(999),
                    child: LinearProgressIndicator(
                      value: (_pageIndex + 1) / totalPages,
                      minHeight: 8,
                      backgroundColor: const Color(0xFFEAF6FC),
                      valueColor: const AlwaysStoppedAnimation<Color>(
                        Color(0xFF4A90C2),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            Expanded(
              child: ListView.builder(
                itemCount: end - start,
                itemBuilder: (_, i) {
                  final qIndex = start + i;
                  final q = questions[qIndex];
                  final options = (q['options'] as List).cast<String>();
                  return Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: const Color(0xFFD6EAF5)),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x12000000),
                          blurRadius: 12,
                          offset: Offset(0, 5),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${qIndex + 1}. ${q['text']}',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF1F3A5F),
                            height: 1.4,
                          ),
                        ),
                        const SizedBox(height: 14),
                        ...options.map((o) {
                          final isSelected = answers[qIndex] == o;
                          return Container(
                            margin: const EdgeInsets.only(bottom: 10),
                            decoration: BoxDecoration(
                              color:
                                  isSelected
                                      ? const Color(0xFFEAF6FC)
                                      : const Color(0xFFF7FCFE),
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(
                                color:
                                    isSelected
                                        ? const Color(0xFF4A90C2)
                                        : const Color(0xFFD6EAF5),
                              ),
                            ),
                            child: RadioListTile<String>(
                              value: o,
                              groupValue: answers[qIndex],
                              activeColor: const Color(0xFF4A90C2),
                              onChanged: (v) {
                                if (v == null) return;
                                _selectAnswer(qIndex, v);
                              },
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 12,
                              ),
                              title: Text(
                                o,
                                style: const TextStyle(
                                  color: Color(0xFF1F3A5F),
                                  fontSize: 14,
                                  height: 1.4,
                                ),
                              ),
                            ),
                          );
                        }),
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _pageIndex == 0 ? null : _goToPreviousPage,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF1F3A5F),
                    side: const BorderSide(color: Color(0xFFD6EAF5)),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(18),
                    ),
                  ),
                  child: const Text('Back'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: () {
                    bool valid = true;
                    for (int i = start; i < end; i++) {
                      if (answers[i] == null) valid = false;
                    }
                    if (!valid) {
                      showValidationMessage();
                      return;
                    }
                    end == questions.length ? handleSubmit() : _goToNextPage();
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF4A90C2),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(18),
                    ),
                  ),
                  child: Text(end == questions.length ? 'Submit' : 'Next'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
