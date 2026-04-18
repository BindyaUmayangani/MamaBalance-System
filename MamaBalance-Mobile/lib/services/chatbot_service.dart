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

enum _ChatbotMode {
  generalSupport,
  educationalGuidance,
  highRiskSupport,
}

class _ChatbotConversationState {
  final String lastUserMessage;
  final String lastAssistantMessage;
  final bool incompleteAssistantResponse;

  const _ChatbotConversationState({
    required this.lastUserMessage,
    required this.lastAssistantMessage,
    required this.incompleteAssistantResponse,
  });

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'lastUserMessage': lastUserMessage,
      'lastAssistantMessage': lastAssistantMessage,
      'incompleteAssistantResponse': incompleteAssistantResponse,
    };
  }

  static _ChatbotConversationState fromJson(Map<String, dynamic> json) {
    return _ChatbotConversationState(
      lastUserMessage: '${json['lastUserMessage'] ?? ''}',
      lastAssistantMessage: '${json['lastAssistantMessage'] ?? ''}',
      incompleteAssistantResponse: json['incompleteAssistantResponse'] == true,
    );
  }
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
  static const int _maxModelHistoryMessages = 10;
  static const int _maxContinuationAttempts = 3;

  final FirebaseFirestore _db = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  Future<String> getChatResponse(
    List<ChatbotMessage> history,
    String message,
    MotherProfile profile,
  ) async {
    if (AppConfig.geminiApiKey == 'PASTE_YOUR_GEMINI_API_KEY_HERE') {
      return "Hi ${profile.firstName}, I'm the MamaBalance AI. To start chatting, please make sure your Gemini API key is configured in the AppConfig.";
    }

    final trimmedMessage = message.trim();
    final tone = _detectTone(trimmedMessage);
    final mode = _resolveMode(trimmedMessage, profile);
    final highRiskDetectedInMessage = _isHighRiskMessage(trimmedMessage);
    final safetyTriggers = _matchedHighRiskPhrases(trimmedMessage);
    final recentHistory = _recentHistory(history);
    final savedState = await _loadConversationState();

    try {
      var text = await _sendWithFallbackModels(
        history: recentHistory,
        message: trimmedMessage,
        profile: profile,
        tone: tone,
        mode: mode,
        conversationState: savedState,
        continuationRequest: false,
      );

      text = _postProcessResponse(text, profile);

      var incomplete = _looksIncomplete(text);
      var continuationAttempts = 0;
      while (incomplete && continuationAttempts < _maxContinuationAttempts) {
        final continuedText = await _tryContinueIncompleteResponse(
          history: recentHistory,
          message: trimmedMessage,
          profile: profile,
          tone: tone,
          mode: mode,
          partialAssistantMessage: text,
        );

        if (continuedText == null || continuedText.trim().isEmpty) {
          break;
        }

        text = _mergeContinuation(text, continuedText);
        text = _postProcessResponse(text, profile);
        incomplete = _looksIncomplete(text);
        continuationAttempts++;
      }

      text = _softenUnnecessaryEscalation(
        text,
        mode: mode,
        highRiskDetectedInMessage: highRiskDetectedInMessage,
      );

      if (text.trim().isEmpty) {
        text = _fallbackRetryMessage(
          highRisk:
              highRiskDetectedInMessage || mode == _ChatbotMode.highRiskSupport,
        );
      }

      if (highRiskDetectedInMessage || text.contains('[CRISIS_DETECTED]')) {
        text = text.replaceAll('[CRISIS_DETECTED]', '').trim();
        await _notifyCareTeam(profile, safetyTriggers: safetyTriggers);
      }

      await _saveConversationState(
        _ChatbotConversationState(
          lastUserMessage: trimmedMessage,
          lastAssistantMessage: text,
          incompleteAssistantResponse: incomplete,
        ),
      );

      return text;
    } catch (_) {
      if (highRiskDetectedInMessage) {
        await _notifyCareTeam(profile, safetyTriggers: safetyTriggers);
        final fallback = _highRiskFallbackMessage(profile);
        await _saveConversationState(
          _ChatbotConversationState(
            lastUserMessage: trimmedMessage,
            lastAssistantMessage: fallback,
            incompleteAssistantResponse: false,
          ),
        );
        return fallback;
      }

      final fallback = _fallbackRetryMessage(highRisk: false);
      await _saveConversationState(
        _ChatbotConversationState(
          lastUserMessage: trimmedMessage,
          lastAssistantMessage: fallback,
          incompleteAssistantResponse: false,
        ),
      );
      return fallback;
    }
  }

  Future<String> _sendWithFallbackModels({
    required List<ChatbotMessage> history,
    required String message,
    required MotherProfile profile,
    required _ResponseTone tone,
    required _ChatbotMode mode,
    required _ChatbotConversationState? conversationState,
    required bool continuationRequest,
    String? partialAssistantMessage,
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
          mode: mode,
          conversationState: conversationState,
          continuationRequest: continuationRequest,
          partialAssistantMessage: partialAssistantMessage,
        );
      } catch (error) {
        lastError = error;
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
    required _ChatbotMode mode,
    required _ChatbotConversationState? conversationState,
    required bool continuationRequest,
    String? partialAssistantMessage,
  }) async {
    final model = GenerativeModel(
      model: modelName,
      apiKey: AppConfig.geminiApiKey,
      systemInstruction: Content.system(
        _buildSystemInstruction(
          profile,
          tone: tone,
          mode: mode,
        ),
      ),
      generationConfig: GenerationConfig(
        temperature: continuationRequest ? 0.45 : 0.7,
        topP: 0.9,
        maxOutputTokens: continuationRequest ? 320 : 700,
      ),
    );

    final contents = <Content>[
      Content.text(
        _buildStructuredContext(
          profile: profile,
          history: history,
          userMessage: message,
          mode: mode,
          conversationState: conversationState,
          continuationRequest: continuationRequest,
          partialAssistantMessage: partialAssistantMessage,
        ),
      ),
    ];

    final response = await model.generateContent(contents);
    final text = response.text?.trim() ?? '';

    if (text.isEmpty) {
      throw Exception('Gemini returned an empty text response.');
    }

    return text;
  }

  Future<String?> _tryContinueIncompleteResponse({
    required List<ChatbotMessage> history,
    required String message,
    required MotherProfile profile,
    required _ResponseTone tone,
    required _ChatbotMode mode,
    required String partialAssistantMessage,
  }) async {
    try {
      final continued = await _sendWithFallbackModels(
        history: history,
        message: message,
        profile: profile,
        tone: tone,
        mode: mode,
        conversationState: _ChatbotConversationState(
          lastUserMessage: message,
          lastAssistantMessage: partialAssistantMessage,
          incompleteAssistantResponse: true,
        ),
        continuationRequest: true,
        partialAssistantMessage: partialAssistantMessage,
      );

      return continued.trim();
    } catch (_) {
      return null;
    }
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
        .map(
          (item) => ChatbotMessage(
            id: '${item['id'] ?? ''}',
            role: '${item['role'] ?? 'bot'}',
            text: '${item['text'] ?? ''}',
            createdAt: _readDate(item['createdAt']),
          ),
        )
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
          .map(
            (message) => <String, dynamic>{
              'id': message.id,
              'role': message.role,
              'text': message.text,
              'createdAt': message.createdAt?.toIso8601String(),
            },
          )
          .toList(),
    );

    await prefs.setString(_historyKey(), encoded);
  }

  Future<void> clearChatHistory() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_historyKey());
    await prefs.remove(_conversationStateKey());
  }

  List<ChatbotMessage> buildModelHistory(List<ChatbotMessage> messages) {
    final trimmed = messages
        .where((message) => message.text.trim().isNotEmpty)
        .toList();

    if (trimmed.length <= _maxModelHistoryMessages) {
      return List<ChatbotMessage>.from(trimmed);
    }

    return trimmed.sublist(trimmed.length - _maxModelHistoryMessages);
  }

  String _currentUserUid() {
    final user = _auth.currentUser;
    if (user == null) {
      throw Exception('Please sign in to continue.');
    }
    return user.uid;
  }

  String _historyKey() => 'chatbot_history_${_currentUserUid()}';

  String _conversationStateKey() => 'chatbot_state_${_currentUserUid()}';

  List<ChatbotMessage> _recentHistory(List<ChatbotMessage> history) {
    if (history.length <= _maxModelHistoryMessages) {
      return List<ChatbotMessage>.from(history);
    }

    return history.sublist(history.length - _maxModelHistoryMessages);
  }

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
      'feeling better',
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
      'cannot cope',
      "can't cope",
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

  _ChatbotMode _resolveMode(String message, MotherProfile profile) {
    if (_isHighRiskMessage(message)) {
      return _ChatbotMode.highRiskSupport;
    }

    final normalized = message.toLowerCase();
    const elevatedDistressTerms = <String>[
      'overwhelmed',
      'cannot cope',
      "can't cope",
      'hopeless',
      'panic',
      'very anxious',
      'extreme distress',
      'cannot care for my baby',
      "can't care for my baby",
      'crying all the time',
    ];
    const educationTerms = <String>[
      'what is',
      'why',
      'how',
      'normal',
      'postpartum',
      'after birth',
      'sleep',
      'routine',
      'stress management',
      'breastfeeding',
      'baby blues',
      'facts',
      'symptoms',
      'tips',
    ];

    if (profile.latestEpdsScore >= 13 &&
        elevatedDistressTerms.any(normalized.contains)) {
      return _ChatbotMode.highRiskSupport;
    }

    if (educationTerms.any(normalized.contains)) {
      return _ChatbotMode.educationalGuidance;
    }

    return _ChatbotMode.generalSupport;
  }

  bool _isHighRiskMessage(String message) {
    return _matchedHighRiskPhrases(message).isNotEmpty;
  }

  List<String> _matchedHighRiskPhrases(String message) {
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
      'want to disappear',
      'cannot cope',
      "can't cope",
      'i am hopeless',
      'feel hopeless',
      'severe panic',
      'panic attack',
      'cannot care for my baby',
      "can't care for my baby",
      'cannot take care of my baby',
      'extreme distress',
    ];

    return highRiskPhrases
        .where((phrase) => normalized.contains(phrase))
        .toList();
  }

  DateTime? _readDate(dynamic value) {
    if (value is Timestamp) return value.toDate();
    if (value is DateTime) return value;
    if (value is String) return DateTime.tryParse(value);
    return null;
  }

  Future<_ChatbotConversationState?> _loadConversationState() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_conversationStateKey());
    if (raw == null || raw.trim().isEmpty) {
      return null;
    }

    final decoded = jsonDecode(raw);
    if (decoded is! Map<String, dynamic>) {
      return null;
    }

    return _ChatbotConversationState.fromJson(decoded);
  }

  Future<void> _saveConversationState(_ChatbotConversationState state) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_conversationStateKey(), jsonEncode(state.toJson()));
  }

  String _buildStructuredContext({
    required MotherProfile profile,
    required List<ChatbotMessage> history,
    required String userMessage,
    required _ChatbotMode mode,
    required _ChatbotConversationState? conversationState,
    required bool continuationRequest,
    String? partialAssistantMessage,
  }) {
    final recentHistory = history
        .map(
          (item) => '${item.role == 'user' ? 'Mother' : 'Assistant'}: ${item.text}',
        )
        .join('\n');

    final epdsRisk = _resolveEpdsRiskLabel(profile.latestEpdsScore);
    final careTeamText = _buildCareTeamSummary(profile);

    return """
MOTHER PROFILE
- Name: ${profile.fullName}
- Preferred tone: calm, warm, brief
- Number of children: ${profile.noOfChildren}
- Latest EPDS score: ${profile.latestEpdsScore}
- Current EPDS risk band: $epdsRisk
- Latest EPDS submitted at: ${profile.latestEpdsDate?.toLocal().toIso8601String() ?? 'Unknown'}
- Delivery date or expected date: ${profile.deliveryDate}
- Assigned care team: $careTeamText

CHAT MODE
- Active mode: ${_modeLabel(mode)}
- This reply must stay focused on the mother's exact concern.

RECENT CONVERSATION MEMORY
${recentHistory.isEmpty ? '- No recent conversation yet.' : recentHistory}

LAST TURN STATE
- Last user message: ${conversationState?.lastUserMessage.isNotEmpty == true ? conversationState!.lastUserMessage : 'None'}
- Last assistant message: ${conversationState?.lastAssistantMessage.isNotEmpty == true ? conversationState!.lastAssistantMessage : 'None'}
- Previous assistant response may have been incomplete: ${conversationState?.incompleteAssistantResponse == true ? 'Yes' : 'No'}

CURRENT USER MESSAGE
$userMessage

TASK
${continuationRequest ? 'Continue the previous assistant response naturally from where it stopped. Do not restart the full answer. Do not repeat the apology unless absolutely necessary. Complete the unfinished thought in a warm, concise way. Partial assistant reply: ${partialAssistantMessage ?? ''}' : 'Reply to the current user message with warm, concise support.'}
""";
  }

  String _buildSystemInstruction(
    MotherProfile profile, {
    required _ResponseTone tone,
    required _ChatbotMode mode,
  }) {
    final toneInstruction = switch (tone) {
      _ResponseTone.gentleShort =>
        'The mother may feel overwhelmed. Keep the reply extra gentle, grounded, and short: 2 to 4 short paragraphs or 2 to 4 sentences.',
      _ResponseTone.steadySupportive =>
        'Use a calm, emotionally supportive reply with one clear next step. Keep it brief and human.',
      _ResponseTone.warmCelebration =>
        'The mother may be sharing something positive. Respond warmly, briefly, and help the positive moment feel noticed.',
      _ResponseTone.crisis =>
        'The mother may be in serious distress. Prioritize emotional safety, immediate support, and clear escalation language.',
    };

    final modeInstruction = switch (mode) {
      _ChatbotMode.generalSupport =>
        'Mode: General support. Focus on emotional check-in, gentle grounding, and simple coping support.',
      _ChatbotMode.educationalGuidance =>
        'Mode: Educational guidance. Give clear, simple, non-diagnostic postpartum wellbeing information. Keep it practical and easy to follow.',
      _ChatbotMode.highRiskSupport =>
        'Mode: High-risk support. Acknowledge distress, offer one or two immediate calming or grounding suggestions first, then encourage timely human support when the distress is clearly serious.',
    };

    return """
You are a supportive postpartum wellbeing companion inside the MamaBalance system.

Your role:
- Provide calm, emotionally supportive responses.
- Encourage healthy coping steps and help-seeking.
- Never diagnose.
- Never prescribe medication.
- Never replace a doctor, midwife, or emergency care.
- If the user shows signs of severe distress, encourage immediate contact with a trusted person and their healthcare team.

Response style:
- Warm, gentle, human.
- Short paragraphs.
- Do not overwhelm the user.
- Do not sound robotic.
- Avoid repeating the same apology.
- Keep replies focused on the user's exact concern.
- Do not use bullet points unless giving a few very simple coping steps or urgent support options.
- Most replies should be concise.
- Finish the answer cleanly. Never stop mid-sentence.
- Avoid repeated name mentions.
- If the mother shares something difficult, acknowledge the feeling first, then give one or two realistic next steps.
- If the mother sounds exhausted or low, do not interrogate her with too many questions.
- Do not restart an answer if you are continuing a cut-off reply.

$toneInstruction
$modeInstruction

If EPDS risk is high:
- Acknowledge feelings.
- Offer one or two realistic calming or coping suggestions first when the message is not an immediate safety emergency.
- Encourage professional support when the mother sounds significantly distressed, worsening, or stuck.
- Suggest contacting the assigned doctor or midwife when the distress is strong, persistent, or safety-related.
- Avoid false guarantees.
- Avoid saying recovery time exactly.

Safety rules:
- Never claim certainty about emergencies.
- Never promise that everything will definitely be okay.
- If the message suggests self-harm, hopelessness, severe panic, inability to cope, or inability to care for the baby:
  1. Respond with warmth and urgency.
  2. Encourage contacting a trusted person right now.
  3. Encourage contacting the assigned doctor or midwife right away.
  4. Provide these Sri Lankan support numbers:
     - Sri Lanka National Institute of Mental Health (NIMH): 1926
     - Sumithrayo: 011 269 6666
  5. End with the exact token [CRISIS_DETECTED]

Suggestion rules:
- Do not jump straight to "contact your doctor or midwife" in every reply.
- For non-emergency emotional messages, first give one or two gentle practical suggestions such as slow breathing, a glass of water, sitting with a trusted person, resting, stepping outside briefly, or sending one message to someone supportive.
- Only escalate strongly when the wording suggests urgent distress, safety risk, or inability to cope.
- In ordinary overwhelmed or anxious messages, do not add a closing paragraph about contacting the doctor or midwife unless the user asks for professional help or the situation clearly sounds serious.

Continuation rules:
- If the previous response was interrupted or cut off, continue naturally from where it stopped.
- Do not restart from the beginning.
- Do not repeat the apology unless necessary.

The current mother is ${profile.fullName}, and your job is to help her feel supported, calmer, and gently guided without sounding clinical.
""";
  }

  String _resolveEpdsRiskLabel(int score) {
    if (score >= 13) return 'High';
    if (score >= 10) return 'Moderate';
    return 'Low';
  }

  String _modeLabel(_ChatbotMode mode) {
    switch (mode) {
      case _ChatbotMode.generalSupport:
        return 'general_support';
      case _ChatbotMode.educationalGuidance:
        return 'educational_guidance';
      case _ChatbotMode.highRiskSupport:
        return 'high_risk_support';
    }
  }

  String _buildCareTeamSummary(MotherProfile profile) {
    final doctorAssigned = profile.assignedDoctorUid?.trim().isNotEmpty == true;
    final midwifeAssigned =
        profile.assignedMidwifeUid?.trim().isNotEmpty == true;

    if (doctorAssigned && midwifeAssigned) {
      return 'Assigned doctor and assigned midwife are available in MamaBalance.';
    }
    if (doctorAssigned) {
      return 'Assigned doctor is available in MamaBalance.';
    }
    if (midwifeAssigned) {
      return 'Assigned midwife is available in MamaBalance.';
    }
    return 'Assigned care team details are not available in the current profile context.';
  }

  String _postProcessResponse(String text, MotherProfile profile) {
    var cleaned = text.trim();

    cleaned = cleaned.replaceAll(
      RegExp(r'\[CRISIS_DETECTED\]\s*'),
      '[CRISIS_DETECTED]',
    );
    cleaned = cleaned.replaceAll(RegExp(r'\n{3,}'), '\n\n');
    cleaned = cleaned.replaceAll(
      RegExp(
        r"(I'm sorry|I am sorry|Sorry)[^.!?]*[.!?]\s*(I'm sorry|I am sorry|Sorry)",
        caseSensitive: false,
      ),
      "I'm sorry",
    );

    cleaned = _removeRepeatedApologies(cleaned);
    cleaned = _removeRepeatedNameMentions(cleaned, profile.firstName);
    cleaned = _removeRepeatedOpeningParagraph(cleaned);
    cleaned = _removeRepeatedSentences(cleaned);
    cleaned = _removeNearDuplicateParagraphs(cleaned);
    cleaned = _splitLongParagraphs(cleaned);

    return cleaned.trim();
  }

  String _removeRepeatedApologies(String text) {
    final apologyMatches = RegExp(
      r"(I'm sorry|I am sorry|Sorry)",
      caseSensitive: false,
    ).allMatches(text).toList();

    if (apologyMatches.length <= 1) {
      return text;
    }

    var keptFirst = false;
    return text.replaceAllMapped(
      RegExp(r"(I'm sorry|I am sorry|Sorry)", caseSensitive: false),
      (match) {
        if (!keptFirst) {
          keptFirst = true;
          return match.group(0) ?? '';
        }
        return '';
      },
    ).replaceAll(RegExp(r'\s{2,}'), ' ');
  }

  String _removeRepeatedNameMentions(String text, String firstName) {
    final escapedName = RegExp.escape(firstName);
    final matches = RegExp(r'\b' + escapedName + r'\b').allMatches(text).length;
    if (matches <= 2) {
      return text;
    }

    var kept = 0;
    return text.replaceAllMapped(
      RegExp(r'\b' + escapedName + r'\b'),
      (match) {
        kept++;
        return kept <= 2 ? match.group(0) ?? '' : '';
      },
    ).replaceAll(RegExp(r'\s{2,}'), ' ');
  }

  String _removeRepeatedOpeningParagraph(String text) {
    final paragraphs = text
        .split(RegExp(r'\n\s*\n'))
        .map((part) => part.trim())
        .where((part) => part.isNotEmpty)
        .toList();

    if (paragraphs.length < 2) {
      return text;
    }

    if (paragraphs[0] == paragraphs[1]) {
      paragraphs.removeAt(1);
    }

    return paragraphs.join('\n\n');
  }

  String _removeRepeatedSentences(String text) {
    final paragraphs = text.split(RegExp(r'\n\s*\n'));
    final cleanedParagraphs = paragraphs.map((paragraph) {
      final sentences = paragraph
          .split(RegExp(r'(?<=[.!?])\s+'))
          .map((sentence) => sentence.trim())
          .where((sentence) => sentence.isNotEmpty)
          .toList();

      final kept = <String>[];
      final normalizedSeen = <String>{};

      for (final sentence in sentences) {
        final normalized = _normalizeForDedup(sentence);
        if (normalized.length < 8 || normalizedSeen.add(normalized)) {
          kept.add(sentence);
        }
      }

      return kept.join(' ').trim();
    }).where((paragraph) => paragraph.isNotEmpty).toList();

    return cleanedParagraphs.join('\n\n');
  }

  String _removeNearDuplicateParagraphs(String text) {
    final paragraphs = text
        .split(RegExp(r'\n\s*\n'))
        .map((paragraph) => paragraph.trim())
        .where((paragraph) => paragraph.isNotEmpty)
        .toList();

    final kept = <String>[];
    final normalizedSeen = <String>[];

    for (final paragraph in paragraphs) {
      final normalized = _normalizeForDedup(paragraph);
      final isDuplicate = normalizedSeen.any(
        (existing) =>
            existing == normalized ||
            existing.contains(normalized) ||
            normalized.contains(existing),
      );

      if (!isDuplicate) {
        kept.add(paragraph);
        normalizedSeen.add(normalized);
      }
    }

    return kept.join('\n\n');
  }

  String _normalizeForDedup(String text) {
    return text
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9\s]'), '')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
  }

  String _splitLongParagraphs(String text) {
    final paragraphs = text.split(RegExp(r'\n\s*\n'));
    final cleaned = paragraphs.map((paragraph) {
      final trimmed = paragraph.trim();
      if (trimmed.length < 280) {
        return trimmed;
      }

      final sentences = trimmed.split(RegExp(r'(?<=[.!?])\s+'));
      final buffer = StringBuffer();
      var currentLength = 0;

      for (final sentence in sentences) {
        if (currentLength > 0 && currentLength + sentence.length > 220) {
          buffer.write('\n\n');
          currentLength = 0;
        } else if (currentLength > 0) {
          buffer.write(' ');
        }

        final cleanSentence = sentence.trim();
        buffer.write(cleanSentence);
        currentLength += cleanSentence.length;
      }

      return buffer.toString().trim();
    }).where((part) => part.isNotEmpty).toList();

    return cleaned.join('\n\n');
  }

  String _softenUnnecessaryEscalation(
    String text, {
    required _ChatbotMode mode,
    required bool highRiskDetectedInMessage,
  }) {
    if (highRiskDetectedInMessage || mode == _ChatbotMode.highRiskSupport) {
      return text.trim();
    }

    final paragraphs = text
        .split(RegExp(r'\n\s*\n'))
        .map((paragraph) => paragraph.trim())
        .where((paragraph) => paragraph.isNotEmpty)
        .toList();

    final escalationPattern = RegExp(
      r'(assigned doctor|assigned midwife|contact your doctor|contact your midwife|reach out to your doctor|reach out to your midwife|professional support|healthcare team)',
      caseSensitive: false,
    );

    final filtered = paragraphs.where((paragraph) {
      return !escalationPattern.hasMatch(paragraph);
    }).toList();

    if (filtered.isEmpty) {
      return text.trim();
    }

    return filtered.join('\n\n').trim();
  }

  bool _looksIncomplete(String text) {
    final trimmed = text.trim();
    if (trimmed.isEmpty) {
      return true;
    }

    if (!RegExp(r'[.!?\]]$').hasMatch(trimmed)) {
      return true;
    }

    final lower = trimmed.toLowerCase();
    const unfinishedEndings = <String>[
      'and',
      'but',
      'so',
      'because',
      'for example',
      'such as',
      'you can also',
      'one small step is',
      'if you can',
      'try to',
      'it may help to',
      'you might',
    ];

    return unfinishedEndings.any(lower.endsWith);
  }

  String _mergeContinuation(String firstPart, String continuation) {
    final start = continuation.trimLeft();
    if (start.isEmpty) {
      return firstPart.trim();
    }

    var normalizedContinuation = start;
    final leadingMatch =
        RegExp(r'^(And|But|So)\b\s*', caseSensitive: false).firstMatch(start);
    if (leadingMatch != null) {
      final originalPrefix = leadingMatch.group(0) ?? '';
      final loweredPrefix = (leadingMatch.group(1) ?? '').toLowerCase();
      normalizedContinuation =
          start.replaceFirst(originalPrefix, loweredPrefix);
    }

    return '${firstPart.trim()} ${normalizedContinuation.trim()}';
  }

  String _fallbackRetryMessage({required bool highRisk}) {
    if (highRisk) {
      return "I'm here with you, and I had trouble finishing my reply just now. Please contact your doctor, midwife, or a trusted person right away if you feel unsafe, and you can send your message again when you can.";
    }

    return "I'm here with you. I had trouble replying just now. Could you send that once more?";
  }

  String _highRiskFallbackMessage(MotherProfile profile) {
    final careTeamLine = _buildCareTeamNudge(profile);
    return "I'm really glad you told me this. You deserve support right now. Please contact a trusted person immediately. $careTeamLine If you feel you may act on these thoughts or you feel unsafe, call Sri Lanka National Institute of Mental Health on 1926 or Sumithrayo on 011 269 6666.";
  }

  String _buildCareTeamNudge(MotherProfile profile) {
    final hasDoctor = profile.assignedDoctorUid?.trim().isNotEmpty == true;
    final hasMidwife = profile.assignedMidwifeUid?.trim().isNotEmpty == true;

    if (hasDoctor && hasMidwife) {
      return 'Please also contact your assigned doctor or midwife right away.';
    }
    if (hasDoctor) {
      return 'Please also contact your assigned doctor right away.';
    }
    if (hasMidwife) {
      return 'Please also contact your assigned midwife right away.';
    }
    return 'Please also contact your healthcare team right away.';
  }

  Future<void> _notifyCareTeam(
    MotherProfile profile, {
    required List<String> safetyTriggers,
  }) async {
    final targets = <Map<String, String>>[];

    if (profile.assignedMidwifeUid != null &&
        profile.assignedMidwifeUid!.isNotEmpty) {
      targets.add(<String, String>{
        'uid': profile.assignedMidwifeUid!,
        'role': 'midwife',
      });
    }

    if (profile.assignedDoctorUid != null &&
        profile.assignedDoctorUid!.isNotEmpty) {
      targets.add(<String, String>{
        'uid': profile.assignedDoctorUid!,
        'role': 'doctor',
      });
    }

    if (targets.isEmpty) return;

    final triggerSummary = safetyTriggers.isEmpty
        ? 'urgent emotional distress'
        : safetyTriggers.take(3).join(', ');

    final batch = _db.batch();
    for (final target in targets) {
      final docRef = _db.collection('notifications').doc();
      batch.set(docRef, <String, dynamic>{
        'recipientUid': target['uid'],
        'recipientRole': target['role'],
        'type': 'high_risk',
        'subType': 'chatbot_crisis',
        'title': 'Urgent: Chatbot Crisis Detection',
        'message':
            '${profile.fullName} may need urgent follow-up after an AI chat session. Safety trigger: $triggerSummary.',
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
