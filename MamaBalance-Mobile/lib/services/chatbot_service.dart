import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../config/app_config.dart';
import 'auth_service.dart';

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

class ChatbotService {
  ChatbotService._();

  static final ChatbotService instance = ChatbotService._();

  static const int _maxStoredMessages = 50;
  static const int _maxModelHistoryMessages = 10;
  static const Duration _backendTimeout = Duration(seconds: 30);

  final FirebaseAuth _auth = FirebaseAuth.instance;

  Future<String> getChatResponse(
    List<ChatbotMessage> history,
    String message,
  ) async {
    final trimmed = message.trim();
    if (trimmed.isEmpty) {
      return "I'm here with you. Please send a message when you are ready.";
    }

    final payload = await _sendChatbotRequest(
      message: trimmed,
      history: buildModelHistory(history),
    );

    return _readString(
      payload['response'],
      fallback:
          "I'm here with you. I had trouble replying just now. Could you send that once more?",
    );
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

  Future<Map<String, dynamic>> _sendChatbotRequest({
    required String message,
    required List<ChatbotMessage> history,
  }) async {
    final user = _auth.currentUser;
    if (user == null) {
      throw const AppAuthException('Please sign in to continue.');
    }

    final token = await user.getIdToken();
    if (token == null || token.trim().isEmpty) {
      throw const AppAuthException('Please sign in again to continue.');
    }

    final body = <String, dynamic>{
      'message': message,
      'history': history
          .map(
            (item) => <String, String>{
              'role': item.role == 'user' ? 'user' : 'assistant',
              'text': item.text,
            },
          )
          .toList(),
    };

    try {
      final response = await http
          .post(
            _chatbotEndpoint(),
            headers: {
              'Authorization': 'Bearer $token',
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            body: jsonEncode(body),
          )
          .timeout(_backendTimeout);

      final payload = _decodeJson(response.body);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AppAuthException(
          payload['error'] as String? ??
              'The support companion could not reply just now.',
        );
      }

      return payload;
    } on AppAuthException {
      rethrow;
    } on TimeoutException {
      throw const AppAuthException('The chatbot request timed out.');
    } on SocketException {
      throw const AppAuthException(
        'Unable to reach the chatbot backend. Check your connection and try again.',
      );
    } on FormatException {
      throw const AppAuthException(
        'The chatbot backend returned an invalid response.',
      );
    }
  }

  Uri _chatbotEndpoint() {
    final baseUrl = AppConfig.backendBaseUrl.trim();
    if (baseUrl.isEmpty) {
      throw const AppAuthException('The mobile backend URL has not been configured.');
    }
    return Uri.parse(
      '${baseUrl.replaceFirst(RegExp(r'/$'), '')}/api/mobile/chatbot',
    );
  }

  String _currentUserUid() {
    final user = _auth.currentUser;
    if (user == null) {
      throw const AppAuthException('Please sign in to continue.');
    }
    return user.uid;
  }

  String _historyKey() => 'chatbot_history_${_currentUserUid()}';

  DateTime? _readDate(dynamic value) {
    if (value is DateTime) return value;
    if (value is String) return DateTime.tryParse(value);
    return null;
  }

  Map<String, dynamic> _decodeJson(String raw) {
    if (raw.trim().isEmpty) return <String, dynamic>{};
    final decoded = jsonDecode(raw);
    return decoded is Map<String, dynamic> ? decoded : <String, dynamic>{};
  }

  String _readString(dynamic value, {String fallback = ''}) {
    if (value == null) return fallback;
    final raw = '$value'.trim();
    return raw.isEmpty ? fallback : raw;
  }
}
