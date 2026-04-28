import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import 'auth_service.dart';

class SecureChatMessage {
  final String id;
  final String senderUid;
  final String senderRole;
  final String text;
  final DateTime? createdAt;

  const SecureChatMessage({
    required this.id,
    required this.senderUid,
    required this.senderRole,
    required this.text,
    required this.createdAt,
  });

  bool isSentBy(String uid) => senderUid == uid;
}

class SecureConversation {
  final String id;
  final String motherUid;
  final String participantUid;
  final String participantRole;
  final String careTeamUid;
  final String careTeamRole;
  final String careTeamName;

  const SecureConversation({
    required this.id,
    required this.motherUid,
    required this.participantUid,
    required this.participantRole,
    required this.careTeamUid,
    required this.careTeamRole,
    required this.careTeamName,
  });
}

class CareChatOptions {
  final SecureConversation? doctor;
  final SecureConversation midwife;

  const CareChatOptions({
    required this.doctor,
    required this.midwife,
  });
}

class MessagingService {
  MessagingService._();

  static final MessagingService instance = MessagingService._();

  final FirebaseAuth _auth = FirebaseAuth.instance;
  static const Duration _backendTimeout = Duration(seconds: 20);
  static const Duration _messagePollInterval = Duration(seconds: 3);

  User? get currentUser => _auth.currentUser;

  Future<CareChatOptions> resolveChatOptions() async {
    final payload = await _sendMessagingRequest(method: 'GET');
    return _optionsFromJson(payload['options']);
  }

  Future<CareChatOptions> resolveMotherChatOptions() async {
    return resolveChatOptions();
  }

  Future<SecureConversation> resolveMotherConversation() async {
    final options = await resolveChatOptions();
    return options.doctor ?? options.midwife;
  }

  Stream<List<SecureChatMessage>> watchConversationMessages(
    SecureConversation conversation,
  ) async* {
    while (true) {
      final messages = await fetchMessages(conversation);
      yield messages;
      await Future<void>.delayed(_messagePollInterval);
    }
  }

  Future<List<SecureChatMessage>> fetchMessages(
    SecureConversation conversation,
  ) async {
    final payload = await _sendMessagingRequest(
      method: 'GET',
      queryParameters: {'conversationId': conversation.id},
    );
    final rawMessages = payload['messages'];
    final messages = rawMessages is List ? rawMessages : const [];

    return messages
        .whereType<Map<String, dynamic>>()
        .map(_messageFromJson)
        .toList();
  }

  Future<void> sendMessage({
    required SecureConversation conversation,
    required String text,
  }) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty) {
      return;
    }

    await _sendMessagingRequest(
      method: 'POST',
      body: {
        'conversationId': conversation.id,
        'text': trimmed,
      },
    );
  }

  Future<void> markConversationRead(SecureConversation conversation) async {
    await _sendMessagingRequest(
      method: 'PATCH',
      body: {
        'conversationId': conversation.id,
      },
    );
  }

  Future<Map<String, dynamic>> _sendMessagingRequest({
    required String method,
    Map<String, String>? queryParameters,
    Map<String, dynamic>? body,
  }) async {
    final user = _auth.currentUser;
    if (user == null) {
      throw const AppAuthException('Please sign in to continue.');
    }

    final token = await user.getIdToken();
    if (token == null || token.trim().isEmpty) {
      throw const AppAuthException('Please sign in again to continue.');
    }

    final uri = _messagingEndpoint(queryParameters);
    final headers = <String, String>{
      'Authorization': 'Bearer $token',
      'Accept': 'application/json',
      if (body != null) 'Content-Type': 'application/json',
    };

    try {
      final response = switch (method) {
        'POST' => await http
            .post(uri, headers: headers, body: jsonEncode(body))
            .timeout(_backendTimeout),
        'PATCH' => await http
            .patch(uri, headers: headers, body: jsonEncode(body))
            .timeout(_backendTimeout),
        _ => await http.get(uri, headers: headers).timeout(_backendTimeout),
      };

      final payload = _decodeJson(response.body);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw AppAuthException(
          payload['error'] as String? ?? 'Unable to load messages.',
        );
      }

      return payload;
    } on AppAuthException {
      rethrow;
    } on TimeoutException {
      throw const AppAuthException(
        'The messaging request timed out. Check the backend connection and try again.',
      );
    } on SocketException {
      throw const AppAuthException(
        'Unable to reach the messaging backend. Check your connection and try again.',
      );
    } on FormatException {
      throw const AppAuthException(
        'The messaging backend returned an invalid response.',
      );
    }
  }

  Uri _messagingEndpoint(Map<String, String>? queryParameters) {
    final baseUrl = AppConfig.backendBaseUrl.trim();
    if (baseUrl.isEmpty) {
      throw const AppAuthException('The mobile backend URL has not been configured.');
    }

    final uri = Uri.parse(
      '${baseUrl.replaceFirst(RegExp(r'/$'), '')}/api/mobile/messaging',
    );

    if (queryParameters == null || queryParameters.isEmpty) {
      return uri;
    }

    return uri.replace(queryParameters: queryParameters);
  }

  CareChatOptions _optionsFromJson(dynamic rawOptions) {
    final options = rawOptions is Map<String, dynamic>
        ? rawOptions
        : <String, dynamic>{};
    final midwife = _conversationFromJson(options['midwife']);
    if (midwife == null) {
      throw const AppAuthException('No midwife has been assigned yet.');
    }

    return CareChatOptions(
      doctor: _conversationFromJson(options['doctor']),
      midwife: midwife,
    );
  }

  SecureConversation? _conversationFromJson(dynamic rawConversation) {
    if (rawConversation is! Map<String, dynamic>) {
      return null;
    }

    return SecureConversation(
      id: _readString(rawConversation['id']),
      motherUid: _readString(rawConversation['motherUid']),
      participantUid: _readString(rawConversation['participantUid']),
      participantRole: _readString(rawConversation['participantRole']),
      careTeamUid: _readString(rawConversation['careTeamUid']),
      careTeamRole: _readString(rawConversation['careTeamRole']),
      careTeamName: _staffName(
        _readString(rawConversation['careTeamName']),
        _readString(rawConversation['careTeamRole']),
      ),
    );
  }

  SecureChatMessage _messageFromJson(Map<String, dynamic> data) {
    final createdAt = DateTime.tryParse(_readString(data['createdAt']));
    return SecureChatMessage(
      id: _readString(data['id']),
      senderUid: _readString(data['senderUid']),
      senderRole: _readString(data['senderRole']),
      text: _readString(data['text']),
      createdAt: createdAt?.toLocal(),
    );
  }

  Map<String, dynamic> _decodeJson(String raw) {
    if (raw.trim().isEmpty) {
      return <String, dynamic>{};
    }

    final decoded = jsonDecode(raw);
    return decoded is Map<String, dynamic> ? decoded : <String, dynamic>{};
  }

  String _readString(dynamic value) {
    if (value == null) return '';
    return '$value'.trim();
  }

  String _staffName(String value, String role) {
    final name = value.trim();
    if (role == 'doctor') {
      if (name.isEmpty || name.toLowerCase() == 'doctor') {
        return 'Assigned doctor';
      }
      return name.toLowerCase().startsWith('dr.') ? name : 'Dr. $name';
    }

    if (name.isEmpty || name.toLowerCase() == 'midwife') {
      return 'Assigned midwife';
    }
    return name.toLowerCase().startsWith('midwife ') ? name : 'Midwife $name';
  }
}
