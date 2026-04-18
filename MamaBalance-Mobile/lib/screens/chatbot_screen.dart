import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/mother_profile.dart';
import '../services/chatbot_service.dart';
import '../services/mother_profile_service.dart';

class _DisplayMessage {
  final String role;
  final String text;
  final DateTime? createdAt;

  const _DisplayMessage({
    required this.role,
    required this.text,
    required this.createdAt,
  });
}

class ChatbotScreen extends StatefulWidget {
  const ChatbotScreen({super.key});

  @override
  State<ChatbotScreen> createState() => _ChatbotScreenState();
}

class _ChatbotScreenState extends State<ChatbotScreen> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  
  List<ChatbotMessage> _chatHistory = [];
  final List<_DisplayMessage> _displayMessages = [];
  
  MotherProfile? _profile;
  bool _isLoading = true;
  bool _isTyping = false;

  static const Color _accent = Color(0xFF4FA58D);
  static const Color _background = Color(0xFFF3FBF8);
  static const Color _text = Color(0xFF173C3A);
  static const Color _muted = Color(0xFF6A7B79);
  static const List<String> _quickPrompts = <String>[
    "I'm feeling anxious",
    'I need calming ideas',
    'I feel overwhelmed today',
    'I need someone to listen',
  ];

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final profile = await MotherProfileService.instance.fetchCurrentProfile();
      List<ChatbotMessage> savedMessages = const <ChatbotMessage>[];
      try {
        savedMessages = await ChatbotService.instance.loadChatHistory();
      } catch (_) {
        savedMessages = const <ChatbotMessage>[];
      }
      final displayMessages = savedMessages
          .map((message) => _DisplayMessage(
                role: message.role,
                text: message.text,
                createdAt: message.createdAt,
              ))
          .toList();

      setState(() {
        _profile = profile;
        _chatHistory = ChatbotService.instance.buildModelHistory(savedMessages);
        _displayMessages
          ..clear()
          ..addAll(displayMessages);
        _isLoading = false;
      });
      _scrollToBottom();
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Unable to load your profile right now.')),
        );
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _profile == null || _isTyping) return;
    final userTimestamp = DateTime.now();

    setState(() {
      _displayMessages.add(
        _DisplayMessage(
          role: 'user',
          text: text,
          createdAt: userTimestamp,
        ),
      );
      _isTyping = true;
      _controller.clear();
    });
    _scrollToBottom();

    try {
      await ChatbotService.instance.saveMessage(role: 'user', text: text);

      final response = await ChatbotService.instance.getChatResponse(
        _chatHistory,
        text,
        _profile!,
      );

      await ChatbotService.instance.saveMessage(role: 'bot', text: response);

      if (!mounted) return;

      final botTimestamp = DateTime.now();
      setState(() {
        _displayMessages.add(
          _DisplayMessage(
            role: 'bot',
            text: response,
            createdAt: botTimestamp,
          ),
        );
        _chatHistory = ChatbotService.instance.buildModelHistory(
          <ChatbotMessage>[
            ..._chatHistory,
            ChatbotMessage(
              id: userTimestamp.microsecondsSinceEpoch.toString(),
              role: 'user',
              text: text,
              createdAt: userTimestamp,
            ),
            ChatbotMessage(
              id: botTimestamp.microsecondsSinceEpoch.toString(),
              role: 'bot',
              text: response,
              createdAt: botTimestamp,
            ),
          ],
        );
        _isTyping = false;
      });
      _scrollToBottom();
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _isTyping = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'The support companion could not reply just now. Please try again.',
          ),
        ),
      );
    }
  }

  Future<void> _sendQuickPrompt(String prompt) async {
    _controller.text = prompt;
    await _sendMessage();
  }

  Future<void> _clearChat() async {
    final shouldClear = await showDialog<bool>(
          context: context,
          barrierColor: Colors.black.withOpacity(0.35),
          builder: (context) => Dialog(
            backgroundColor: Colors.transparent,
            insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
            child: Container(
              padding: const EdgeInsets.fromLTRB(22, 22, 22, 18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(28),
                border: Border.all(color: const Color(0xFFD6ECE6)),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x18000000),
                    blurRadius: 26,
                    offset: Offset(0, 14),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 52,
                        height: 52,
                        decoration: const BoxDecoration(
                          color: Color(0xFFFFF1F1),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.delete_outline_rounded,
                          color: Color(0xFFD04545),
                          size: 26,
                        ),
                      ),
                      const SizedBox(width: 14),
                      const Expanded(
                        child: Text(
                          'Clear chat history?',
                          style: TextStyle(
                            color: _text,
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  const Text(
                    'This will remove your saved supportive conversation from this account.',
                    style: TextStyle(
                      color: _muted,
                      fontSize: 14,
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 14),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF7F7),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: const Color(0xFFF4CDCD)),
                    ),
                    child: const Text(
                      'This only clears the chat on this device session. You can start a new conversation any time.',
                      style: TextStyle(
                        color: Color(0xFF8B5E5E),
                        fontSize: 13,
                        height: 1.45,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(height: 22),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => Navigator.pop(context, false),
                          style: OutlinedButton.styleFrom(
                            minimumSize: const Size.fromHeight(52),
                            side: BorderSide(color: _accent.withOpacity(0.35)),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                            foregroundColor: _accent,
                            textStyle: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          child: const Text('Keep Chat'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () => Navigator.pop(context, true),
                          style: ElevatedButton.styleFrom(
                            minimumSize: const Size.fromHeight(52),
                            backgroundColor: const Color(0xFFD95454),
                            foregroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                            textStyle: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          child: const Text('Clear Chat'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ) ??
        false;

    if (!shouldClear) return;

    await ChatbotService.instance.clearChatHistory();

    if (!mounted) return;

    setState(() {
      _displayMessages.clear();
      _chatHistory = [];
      _isTyping = false;
      _controller.clear();
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Chat history cleared.')),
    );
    _scrollToBottom();
  }

  Widget _buildMessage(_DisplayMessage message) {
    final isUser = message.role == 'user';

    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 6),
        padding: const EdgeInsets.all(14),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.74,
        ),
        decoration: BoxDecoration(
          color: isUser ? _accent : Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(18),
            topRight: const Radius.circular(18),
            bottomLeft: Radius.circular(isUser ? 18 : 6),
            bottomRight: Radius.circular(isUser ? 6 : 18),
          ),
          border: isUser ? null : Border.all(color: const Color(0xFFD6ECE6)),
          boxShadow: isUser ? null : const [
            BoxShadow(
              color: Color(0x08000000),
              blurRadius: 8,
              offset: Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment:
              isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              message.text,
              style: TextStyle(
                color: isUser ? Colors.white : _text,
                fontSize: 15,
                height: 1.45,
              ),
            ),
            if (message.createdAt != null) ...[
              const SizedBox(height: 6),
              Text(
                _formatTimestamp(message.createdAt!),
                style: TextStyle(
                  color: isUser
                      ? Colors.white.withOpacity(0.8)
                      : _muted.withOpacity(0.9),
                  fontSize: 11,
                  height: 1.2,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _formatTimestamp(DateTime dateTime) {
    return DateFormat('h:mm a').format(dateTime.toLocal());
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: _background,
        body: Center(child: CircularProgressIndicator(color: _accent)),
      );
    }

    return Scaffold(
      backgroundColor: _background,
      appBar: AppBar(
        backgroundColor: _background,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: _text),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'Supportive Companion',
          style: TextStyle(
            color: _text,
            fontSize: 18,
            fontWeight: FontWeight.w700,
          ),
        ),
        actions: [
          IconButton(
            onPressed: _displayMessages.isEmpty ? null : _clearChat,
            tooltip: 'Clear chat',
            icon: const Icon(Icons.delete_outline_rounded),
          ),
        ],
      ),
      body: Column(
        children: [
          Container(
            width: double.infinity,
            margin: const EdgeInsets.fromLTRB(18, 4, 18, 10),
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(26),
              border: Border.all(color: const Color(0xFFD6ECE6)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const CircleAvatar(
                      radius: 20,
                      backgroundColor: Color(0xFFE4F4EF),
                      child: Icon(Icons.psychology_rounded, color: _accent),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Supportive Companion',
                            style: TextStyle(
                              color: _text,
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          Text(
                            'Active session | Private & Secure',
                            style: TextStyle(
                              color: _accent.withOpacity(0.8),
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const Text(
                  'Share how you feel, ask for calming ideas, or talk about motherhood. Your care team will be alerted if high distress is detected.',
                  style: TextStyle(
                    color: _muted,
                    fontSize: 13,
                    height: 1.45,
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 18),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFECF8F4),
                borderRadius: BorderRadius.circular(28),
                border: Border.all(color: const Color(0xFFD6ECE6)),
              ),
              child: _displayMessages.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.chat_bubble_outline_rounded, size: 48, color: Color(0xFFB0CFCA)),
                          const SizedBox(height: 12),
                          const Text(
                            'Tell me how you are feeling.\nWe can take it one step at a time.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: _muted,
                              fontSize: 15,
                            ),
                          ),
                          const SizedBox(height: 18),
                          Wrap(
                            alignment: WrapAlignment.center,
                            spacing: 8,
                            runSpacing: 8,
                            children: _quickPrompts
                                .map(
                                  (prompt) => ActionChip(
                                    onPressed: () => _sendQuickPrompt(prompt),
                                    backgroundColor: Colors.white,
                                    side: const BorderSide(color: Color(0xFFD6ECE6)),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    label: Text(
                                      prompt,
                                      style: const TextStyle(
                                        color: _text,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ),
                                )
                                .toList(),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      controller: _scrollController,
                      itemCount: _displayMessages.length + (_isTyping ? 1 : 0),
                      itemBuilder: (context, index) {
                        if (index == _displayMessages.length) {
                          return _buildTypingIndicator();
                        }
                        return _buildMessage(_displayMessages[index]);
                      },
                    ),
            ),
          ),
          SafeArea(
            top: false,
            child: Container(
              margin: const EdgeInsets.fromLTRB(18, 14, 18, 18),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: const Color(0xFFD6ECE6)),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x12000000),
                    blurRadius: 16,
                    offset: Offset(0, 6),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      textCapitalization: TextCapitalization.sentences,
                      decoration: const InputDecoration(
                        hintText: 'Share what is on your mind...',
                        hintStyle: TextStyle(color: Color(0xFF8AA19D)),
                        border: InputBorder.none,
                      ),
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  InkWell(
                    onTap: _sendMessage,
                    borderRadius: BorderRadius.circular(18),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: _isTyping ? _accent.withOpacity(0.5) : _accent,
                        borderRadius: BorderRadius.circular(18),
                      ),
                      child: const Icon(Icons.send_rounded, color: Colors.white, size: 20),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTypingIndicator() {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 6),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFD6ECE6)),
        ),
        child: const Text(
          'MamaBalance is thinking...',
          style: TextStyle(
            color: _muted,
            fontSize: 13,
            fontStyle: FontStyle.italic,
          ),
        ),
      ),
    );
  }
}

