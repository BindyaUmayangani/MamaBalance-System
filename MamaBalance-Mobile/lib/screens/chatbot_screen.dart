import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/mother_profile.dart';
import '../services/chatbot_service.dart';
import '../services/mother_profile_service.dart';
import '../widgets/app_loading_state.dart';
import 'emergency_contacts_page.dart';

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

  static const Color _accent = Color(0xFF4A90C2);
  static const Color _background = Color(0xFFF3FAFD);
  static const Color _text = Color(0xFF1F3A5F);
  static const Color _muted = Color(0xFF5F7285);
  static const Color _warning = Color(0xFFE08A1E);
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
      final displayMessages =
          savedMessages
              .map(
                (message) => _DisplayMessage(
                  role: message.role,
                  text: message.text,
                  createdAt: message.createdAt,
                ),
              )
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
          const SnackBar(
            content: Text('Unable to load your profile right now.'),
          ),
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
        _DisplayMessage(role: 'user', text: text, createdAt: userTimestamp),
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
      );

      await ChatbotService.instance.saveMessage(role: 'bot', text: response);

      if (!mounted) return;

      final botTimestamp = DateTime.now();
      setState(() {
        _displayMessages.add(
          _DisplayMessage(role: 'bot', text: response, createdAt: botTimestamp),
        );
        _chatHistory = ChatbotService.instance
            .buildModelHistory(<ChatbotMessage>[
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
            ]);
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

  bool get _hasAssignedDoctor =>
      _profile?.assignedDoctorUid?.trim().isNotEmpty == true;

  String get _medicalDecisionContact {
    final profile = _profile;
    if (profile == null) return 'your assigned doctor or midwife';

    if (_hasAssignedDoctor) {
      final doctorName = profile.assignedDoctorName.trim();
      if (doctorName.isEmpty) return 'your assigned doctor';
      return doctorName.toLowerCase().startsWith('dr.')
          ? doctorName
          : 'Dr. $doctorName';
    }

    final midwifeName = profile.assignedMidwifeName.trim();
    if (midwifeName.isEmpty) return 'your assigned midwife';
    return midwifeName.toLowerCase().startsWith('midwife ')
        ? midwifeName
        : 'Midwife $midwifeName';
  }

  String get _medicalDecisionNotice =>
      'This is an AI supportive tool only, not for medical decisions. For medical decisions, contact $_medicalDecisionContact.';

  void _openEmergencyContacts() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => EmergencyContactsPage()),
    );
  }

  Future<void> _clearChat() async {
    final shouldClear =
        await showDialog<bool>(
          context: context,
          barrierColor: Colors.black.withOpacity(0.35),
          builder:
              (context) => Dialog(
                backgroundColor: Colors.transparent,
                insetPadding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 24,
                ),
                child: Container(
                  padding: const EdgeInsets.fromLTRB(22, 22, 22, 18),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(28),
                    border: Border.all(color: const Color(0xFFD6EAF5)),
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
                                side: BorderSide(
                                  color: _accent.withOpacity(0.35),
                                ),
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

    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Chat history cleared.')));
    _scrollToBottom();
  }

  void _showSupportInfoSheet() {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder:
          (sheetContext) => Container(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
            ),
            child: SafeArea(
              top: false,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 44,
                      height: 5,
                      decoration: BoxDecoration(
                        color: const Color(0xFFD6EAF5),
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),
                  Row(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: const Color(0xFFEAF6FC),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: const Icon(
                          Icons.psychology_rounded,
                          color: _accent,
                        ),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Text(
                          'About Supportive Companion',
                          style: TextStyle(
                            color: _text,
                            fontSize: 21,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _supportInfoTile(
                    icon: Icons.favorite_outline_rounded,
                    title: 'Supportive conversation',
                    message:
                        'You can share how you feel, ask for calming ideas, or talk about motherhood at your own pace.',
                  ),
                  _supportInfoTile(
                    icon: Icons.medical_information_outlined,
                    title: 'Medical decisions',
                    message: _medicalDecisionNotice,
                  ),
                  _supportInfoTile(
                    icon: Icons.volunteer_activism_outlined,
                    title: 'Extra support',
                    message:
                        'Your care team may be alerted if strong distress is detected, so they can support you early.',
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () {
                        Navigator.of(sheetContext).pop();
                        _openEmergencyContacts();
                      },
                      icon: const Icon(Icons.emergency_share_rounded),
                      label: const Text('Need Help Now?'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: _accent,
                        side: const BorderSide(color: Color(0xFFD6EAF5)),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => Navigator.of(sheetContext).pop(),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _accent,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(vertical: 15),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: const Text(
                        'Close',
                        style: TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
    );
  }

  Widget _supportInfoTile({
    required IconData icon,
    required String title,
    required String message,
  }) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF7FCFE),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFEAF6FC)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: _accent, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: _text,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  message,
                  style: const TextStyle(
                    color: _muted,
                    fontSize: 13,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMedicalDecisionNotice() {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.fromLTRB(18, 0, 18, 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF8EC),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFF3D6A6)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: const BoxDecoration(
              color: Color(0xFFFFE8C2),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.medical_information_outlined,
              color: _warning,
              size: 19,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              _medicalDecisionNotice,
              style: const TextStyle(
                color: Color(0xFF7A4D12),
                fontSize: 13,
                height: 1.4,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
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
          border: isUser ? null : Border.all(color: const Color(0xFFD6EAF5)),
          boxShadow:
              isUser
                  ? null
                  : const [
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
            Text.rich(
              _formatMessageText(
                message.text,
                TextStyle(
                  color: isUser ? Colors.white : _text,
                  fontSize: 15,
                  height: 1.45,
                ),
              ),
            ),
            if (message.createdAt != null) ...[
              const SizedBox(height: 6),
              Text(
                _formatTimestamp(message.createdAt!),
                style: TextStyle(
                  color:
                      isUser
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

  TextSpan _formatMessageText(String text, TextStyle baseStyle) {
    final spans = <TextSpan>[];
    final pattern = RegExp(r'\*\*(.+?)\*\*');
    var currentIndex = 0;

    for (final match in pattern.allMatches(text)) {
      if (match.start > currentIndex) {
        spans.add(TextSpan(text: text.substring(currentIndex, match.start)));
      }

      spans.add(
        TextSpan(
          text: match.group(1) ?? '',
          style: baseStyle.copyWith(fontWeight: FontWeight.w800),
        ),
      );
      currentIndex = match.end;
    }

    if (currentIndex < text.length) {
      spans.add(TextSpan(text: text.substring(currentIndex)));
    }

    return TextSpan(style: baseStyle, children: spans);
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: _background,
        body: AppLoadingState(
          title: 'Opening support chat',
          message: 'Preparing your personal support space.',
        ),
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
            onPressed: _openEmergencyContacts,
            tooltip: 'Need Help Now?',
            icon: const Icon(Icons.emergency_share_rounded),
          ),
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
            margin: const EdgeInsets.fromLTRB(18, 4, 18, 8),
            padding: const EdgeInsets.fromLTRB(14, 12, 10, 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: const Color(0xFFD6EAF5)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                const CircleAvatar(
                  radius: 20,
                  backgroundColor: Color(0xFFEAF6FC),
                  child: Icon(Icons.psychology_rounded, color: _accent),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Supportive Companion',
                        style: TextStyle(
                          color: _text,
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      SizedBox(height: 3),
                      Text(
                        'AI support only | Not for medical decisions',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: _muted,
                          fontSize: 12,
                          height: 1.25,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: _showSupportInfoSheet,
                  tooltip: 'About this support tool',
                  icon: const Icon(Icons.info_outline_rounded, color: _accent),
                ),
              ],
            ),
          ),
          _buildMedicalDecisionNotice(),
          Expanded(
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 18),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFEAF6FC),
                borderRadius: BorderRadius.circular(28),
                border: Border.all(color: const Color(0xFFD6EAF5)),
              ),
              child:
                  _displayMessages.isEmpty
                      ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.chat_bubble_outline_rounded,
                              size: 48,
                              color: Color(0xFFB7DDF0),
                            ),
                            const SizedBox(height: 12),
                            const Text(
                              'Tell me how you are feeling.\nWe can take it one step at a time.',
                              textAlign: TextAlign.center,
                              style: TextStyle(color: _muted, fontSize: 15),
                            ),
                            const SizedBox(height: 18),
                            Wrap(
                              alignment: WrapAlignment.center,
                              spacing: 8,
                              runSpacing: 8,
                              children:
                                  _quickPrompts
                                      .map(
                                        (prompt) => ActionChip(
                                          onPressed:
                                              () => _sendQuickPrompt(prompt),
                                          backgroundColor: Colors.white,
                                          side: const BorderSide(
                                            color: Color(0xFFD6EAF5),
                                          ),
                                          shape: RoundedRectangleBorder(
                                            borderRadius: BorderRadius.circular(
                                              8,
                                            ),
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
                        itemCount:
                            _displayMessages.length + (_isTyping ? 1 : 0),
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
                border: Border.all(color: const Color(0xFFD6EAF5)),
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
                        hintStyle: TextStyle(color: Color(0xFF7B8FA3)),
                        border: InputBorder.none,
                      ),
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Tooltip(
                    message: _isTyping ? 'Sending message' : 'Send message',
                    child: Semantics(
                      button: true,
                      label: _isTyping ? 'Sending message' : 'Send message',
                      child: InkWell(
                        onTap: _isTyping ? null : _sendMessage,
                        borderRadius: BorderRadius.circular(18),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color:
                                _isTyping ? _accent.withOpacity(0.5) : _accent,
                            borderRadius: BorderRadius.circular(18),
                          ),
                          child: const Icon(
                            Icons.send_rounded,
                            color: Colors.white,
                            size: 20,
                          ),
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
          border: Border.all(color: const Color(0xFFD6EAF5)),
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
