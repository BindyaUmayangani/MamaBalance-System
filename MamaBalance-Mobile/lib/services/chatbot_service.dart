import 'dart:convert';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_generative_ai/google_generative_ai.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/app_config.dart';
import '../models/mother_profile.dart';

class ChatbotMessage {
  final String id;
  final String role;
  final String text;
  final DateTime? createdAt;

  const ChatbotMessage({
    required this.id,
    required this.role,
    required this.text,
    required this.createdAt,
  });
}

enum _ResponseTone {
  gentleShort,
  steadySupportive,
  warmCelebration,
  crisis,
}

class ChatbotService {
  ChatbotService._();
  static final ChatbotService instance = ChatbotService._();
  static const List<String> _fallbackModels = <String>[
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
  ];
  static const int _maxStoredMessages = 50;

  final FirebaseFirestore _db = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  Future<String> getChatResponse(
    List<ChatbotMessage> history,
    String message, 
    MotherProfile profile
  ) async {
    if (AppConfig.geminiApiKey == 'PASTE_YOUR_GEMINI_API_KEY_HERE') {
      return "Hi ${profile.firstName}, I'm the MamaBalance AI. To start chatting, please make sure your Gemini API key is configured in the AppConfig.";
    }

    final tone = _detectTone(message);
    final crisisDetectedInMessage = _isHighRiskMessage(message);

    try {
      String text = await _sendWithFallbackModels(
        history: history,
        message: message,
        profile: profile,
        tone: tone,
      );
      if (text.trim().isEmpty) {
        text = "I'm sorry, I'm having a little trouble thinking right now. Could you try saying that again?";
      }

      if (crisisDetectedInMessage || text.contains('[CRISIS_DETECTED]')) {
        text = text.replaceAll('[CRISIS_DETECTED]', '').trim();
        await _notifyCareTeam(profile);
      }

      return text;
    } catch (e) {
      print('Gemini Error: $e');
      if (crisisDetectedInMessage) {
        await _notifyCareTeam(profile);
        return "I'm really glad you told me this. You deserve immediate support right now. Please contact your care team now, and if you feel you may act on these thoughts, call Sri Lanka National Institute of Mental Health at 1926 or Sumithrayo at 011 269 6666.";
      }
      return _friendlyChatbotError(e);
    }
  }

  String _friendlyChatbotError(Object error) {
    final raw = error.toString();
    final normalized = raw.toLowerCase();

    if (normalized.contains('api key') || normalized.contains('invalidapikey')) {
      return 'The chatbot API key is not working right now. Please update the MamaBalance AI key and try again.';
    }

    if (normalized.contains('location is not supported')) {
      return 'This chatbot service is not available from the current region on this API provider right now.';
    }

    if (normalized.contains('quota') ||
        normalized.contains('rate limit') ||
        normalized.contains('resource exhausted') ||
        normalized.contains('429')) {
      return 'The chatbot is temporarily busy. Please try again in a little while.';
    }

    if (normalized.contains('model') && normalized.contains('not found')) {
      return 'The configured chatbot model is unavailable right now. Please switch to another supported model.';
    }

    return "I'm having trouble replying right now. Please try again in a moment. If you need immediate support, please reach out to your care team.\n\nTech detail: $raw";
  }

  Future<String> _sendWithFallbackModels({
    required List<ChatbotMessage> history,
    required String message,
    required MotherProfile profile,
    required _ResponseTone tone,
  }) async {
    final candidates = <String>{
      AppConfig.geminiModel,
      ..._fallbackModels,
    };

    Object? lastError;
    for (final modelName in candidates) {
      try {
        return await _sendGenerateContentRequest(
          modelName: modelName,
          history: history,
          message: message,
          profile: profile,
          tone: tone,
        );
      } catch (e) {
        lastError = e;
        print('Gemini Error for model $modelName: $e');
      }
    }

    throw lastError ?? Exception('No Gemini model could generate a response.');
  }

  Future<String> _sendGenerateContentRequest({
    required String modelName,
    required List<ChatbotMessage> history,
    required String message,
    required MotherProfile profile,
    required _ResponseTone tone,
  }) async {
    final model = GenerativeModel(
      model: modelName,
      apiKey: AppConfig.geminiApiKey,
      systemInstruction: Content.system(
        _buildSystemInstruction(profile, tone: tone),
      ),
      generationConfig: GenerationConfig(
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 600,
      ),
    );

    final contents = <Content>[
      ...history
          .where((item) => item.text.trim().isNotEmpty)
          .map((item) => item.role == 'user'
              ? Content.text(item.text)
              : Content.model([TextPart(item.text)])),
      Content.text(message),
    ];

    final response = await model.generateContent(contents);
    final text = response.text?.trim() ?? '';

    if (text.isEmpty) {
      throw Exception('Gemini returned an empty text response.');
    }

    return text;
  }

  Future<List<ChatbotMessage>> loadChatHistory() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_historyKey());
    if (raw == null || raw.trim().isEmpty) {
      return const <ChatbotMessage>[];
    }

    final decoded = jsonDecode(raw);
    if (decoded is! List) {
      return const <ChatbotMessage>[];
    }

    return decoded
        .whereType<Map>()
        .map((item) => ChatbotMessage(
              id: '${item['id'] ?? ''}',
              role: '${item['role'] ?? 'bot'}',
              text: '${item['text'] ?? ''}',
              createdAt: _readDate(item['createdAt']),
            ))
        .where((message) => message.text.trim().isNotEmpty)
        .toList();
  }

  Future<void> saveMessage({
    required String role,
    required String text,
  }) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty) return;

    final prefs = await SharedPreferences.getInstance();
    final current = await loadChatHistory();
    final updated = <ChatbotMessage>[
      ...current,
      ChatbotMessage(
        id: DateTime.now().microsecondsSinceEpoch.toString(),
        role: role,
        text: trimmed,
        createdAt: DateTime.now(),
      ),
    ];

    final trimmedHistory = updated.length > _maxStoredMessages
        ? updated.sublist(updated.length - _maxStoredMessages)
        : updated;

    final encoded = jsonEncode(
      trimmedHistory
          .map((message) => {
                'id': message.id,
                'role': message.role,
                'text': message.text,
                'createdAt': message.createdAt?.toIso8601String(),
              })
          .toList(),
    );

    await prefs.setString(_historyKey(), encoded);
  }

  Future<void> clearChatHistory() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_historyKey());
  }

  List<ChatbotMessage> buildModelHistory(List<ChatbotMessage> messages) {
    return List<ChatbotMessage>.from(messages);
  }

  String _currentUserUid() {
    final user = _auth.currentUser;
    if (user == null) {
      throw Exception('Please sign in to continue.');
    }
    return user.uid;
  }

  String _historyKey() => 'chatbot_history_${_currentUserUid()}';

  _ResponseTone _detectTone(String message) {
    final normalized = message.toLowerCase();

    if (_isHighRiskMessage(message)) {
      return _ResponseTone.crisis;
    }

    const positiveWords = <String>[
      'happy',
      'better',
      'good',
      'grateful',
      'calm',
      'relieved',
      'thank you',
      'thanks',
      'smile',
      'hopeful',
    ];

    const overwhelmedWords = <String>[
      'anxious',
      'anxiety',
      'panic',
      'overwhelmed',
      'stressed',
      'stress',
      'scared',
      'afraid',
      'worried',
      'tired',
      'exhausted',
      'alone',
      'lonely',
      'sad',
      'crying',
      'upset',
      'angry',
    ];

    final isPositive = positiveWords.any(normalized.contains);
    if (isPositive) {
      return _ResponseTone.warmCelebration;
    }

    final isOverwhelmed = overwhelmedWords.any(normalized.contains);
    final wordCount = normalized
        .split(RegExp(r'\s+'))
        .where((word) => word.trim().isNotEmpty)
        .length;

    if (isOverwhelmed || wordCount <= 6) {
      return _ResponseTone.gentleShort;
    }

    return _ResponseTone.steadySupportive;
  }

  bool _isHighRiskMessage(String message) {
    final normalized = message.toLowerCase();
    const highRiskPhrases = <String>[
      'kill myself',
      'want to die',
      'end my life',
      'end it all',
      'self harm',
      'self-harm',
      'suicide',
      'suicidal',
      'hurt myself',
      'harm myself',
      'better off dead',
      'i cannot go on',
      "i can't go on",
      'no reason to live',
      'wish i was dead',
    ];

    return highRiskPhrases.any(normalized.contains);
  }

  DateTime? _readDate(dynamic value) {
    if (value is Timestamp) return value.toDate();
    if (value is DateTime) return value;
    if (value is String) return DateTime.tryParse(value);
    return null;
  }

  String _buildSystemInstruction(
    MotherProfile profile, {
    required _ResponseTone tone,
  }) {
    final toneInstruction = switch (tone) {
      _ResponseTone.gentleShort =>
        'The user may feel overwhelmed or has sent a brief emotional message. Keep the reply extra gentle, grounded, and short: 2-4 sentences.',
      _ResponseTone.steadySupportive =>
        'Use a calm, supportive reply with one clear next step and one soft follow-up question.',
      _ResponseTone.warmCelebration =>
        'The user may be sharing something positive or hopeful. Respond warmly, celebrate briefly, and keep the tone light and encouraging.',
      _ResponseTone.crisis =>
        'The user may be at high risk. Prioritize safety, immediate support, and clear crisis guidance.',
    };

    return """
You are MamaBalance AI, a warm, emotionally aware, and supportive companion for new and expecting mothers.
Your goal is to help ${profile.fullName} feel heard, calmer, and less alone through kind, natural conversation.

CONTEXT ABOUT THE MOTHER:
- Name: ${profile.fullName}
- Number of children: ${profile.noOfChildren}
- Latest wellbeing score: ${profile.latestEpdsScore} (A score of 10+ indicates moderate distress, 13+ indicates high distress).
- Delivery date/expected: ${profile.deliveryDate}

RESPONSE STYLE:
- Be warm, calm, validating, and non-judgmental.
- Sound human and gentle, not robotic, formal, or clinical.
- Use simple everyday English and short paragraphs.
- Keep most replies to 2-5 sentences unless more detail is clearly needed.
- Finish your thought clearly and do not stop mid-sentence.
- Use ${profile.firstName} naturally sometimes, but not in every reply.
- First acknowledge the feeling, then offer one helpful next step.
- Ask a follow-up question only when it clearly helps. Do not ask a question in every reply.
- If she seems overwhelmed, give only one or two suggestions at a time.
- Prefer natural supportive phrases such as "That sounds really hard" or "I'm glad you told me."
- Avoid repeating the same reassurance in every answer.
- Do not use bullet points unless listing calming steps or urgent support options would clearly help.
- Tone guidance for this reply: $toneInstruction
- When the user shares sadness, low mood, stress, or mixed emotions, do not keep asking what made her sad or repeatedly ask her to explain painful feelings.
- Instead, gently comfort her, help her feel lighter, and suggest a small soothing or hopeful action she can do now.
- Prefer supportive, mood-lifting replies over problem-interview questions.
- If the user shares something positive, stay with the positive moment and help it grow.
- If the user mentions feeling sad after previously feeling happy, acknowledge both feelings briefly and then guide the conversation toward comfort, hope, grounding, or a gentle next step.

BOUNDARIES:
- DO NOT give medical advice, diagnosis, medication instructions, or emergency guarantees.
- If she asks medical questions, gently encourage her to contact her assigned care team.
- Do not invent facts, policies, appointments, or care-team actions.
- If you are unsure, say so simply and gently.

HELPFUL BEHAVIORS:
- If she shares stress, sadness, anger, guilt, loneliness, fear, or exhaustion, respond with empathy first.
- Offer practical, low-pressure support such as breathing, hydration, rest, reaching out to a trusted person, or taking one small next step.
- If she asks for ideas, give realistic suggestions for mothers with limited time and energy.
- If the user sends a short message like "sad", "tired", or "I can't do this", ask a caring clarifying question instead of giving a long answer.
- Do not repeatedly ask the user to describe why she feels bad.
- After one acknowledgment, move toward relief, reassurance, encouragement, or a comforting suggestion.
- If she shares something positive, celebrate it warmly and briefly.

CRITICAL SAFETY & CRISIS PROTOCOL:
- If ${profile.firstName} expresses thoughts of self-harm, hopelessness, or intense despair, you MUST:
  1. Validate her feelings with extreme kindness.
  2. Strongly encourage her to speak with a professional immediately.
  3. Provide these Sri Lankan support numbers:
     - Sri Lanka National Institute of Mental Health (NIMH): dial 1926
     - Sumithrayo: 011 269 6666 (available 9 AM to 8 PM)
- If you believe there is a genuine safety risk or crisis, conclude your message with the exact token [CRISIS_DETECTED]. This is used for internal safety triggers.
""";
  }

  Future<void> _notifyCareTeam(MotherProfile profile) async {
    final targets = <Map<String, String>>[];
    
    if (profile.assignedMidwifeUid != null && profile.assignedMidwifeUid!.isNotEmpty) {
      targets.add({
        'uid': profile.assignedMidwifeUid!,
        'role': 'midwife',
      });
    }
    
    if (profile.assignedDoctorUid != null && profile.assignedDoctorUid!.isNotEmpty) {
      targets.add({
        'uid': profile.assignedDoctorUid!,
        'role': 'doctor',
      });
    }

    if (targets.isEmpty) return;

    final batch = _db.batch();
    for (final target in targets) {
      final docRef = _db.collection('notifications').doc();
      batch.set(docRef, {
        'recipientUid': target['uid'],
        'recipientRole': target['role'],
        'type': 'high_risk',
        'subType': 'chatbot_crisis',
        'title': 'Urgent: Chatbot Crisis Detection',
        'message': '${profile.fullName} has expressed significant distress in an AI chat session. Please initiate a wellness check as soon as possible.',
        'motherUid': profile.uid,
        'motherName': profile.fullName,
        'read': false,
        'priority': 'high',
        'createdAt': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
  }
}
