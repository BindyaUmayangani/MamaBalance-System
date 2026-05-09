import 'package:flutter/material.dart';

import '../services/messaging_service.dart';
import '../widgets/app_loading_state.dart';

class ChatPage extends StatefulWidget {
  final String doctorName;
  final bool showBackButton;

  const ChatPage({
    super.key,
    required this.doctorName,
    this.showBackButton = false,
  });

  @override
  State<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends State<ChatPage> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _messageScrollController = ScrollController();
  late Future<CareChatOptions> _chatOptionsFuture;
  String _selectedRole = 'midwife';
  String? _lastMarkedConversationId;
  bool _isSending = false;

  static const Color _accent = Color(0xFF4A90C2);
  static const Color _accentDark = Color(0xFF1F6F99);
  static const Color _text = Color(0xFF1F3A5F);
  static const Color _background = Color(0xFFF3FAFD);
  static const Color _surface = Color(0xFFEAF6FC);
  static const Color _muted = Color(0xFF5F7285);

  @override
  void initState() {
    super.initState();
    _chatOptionsFuture = MessagingService.instance.resolveChatOptions();
  }

  @override
  void dispose() {
    _controller.dispose();
    _messageScrollController.dispose();
    super.dispose();
  }

  Future<void> _sendMessage(SecureConversation conversation) async {
    if (_controller.text.trim().isEmpty || _isSending) return;
    final message = _controller.text.trim();
    _controller.clear();
    setState(() => _isSending = true);

    try {
      await MessagingService.instance.sendMessage(
        conversation: conversation,
        text: message,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          const SnackBar(
            content: Text('Message sent. Your care team can reply here.'),
            behavior: SnackBarBehavior.floating,
            duration: Duration(seconds: 2),
          ),
        );
      _scrollMessagesToBottom();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Unable to send your message. Please try again.'),
        ),
      );
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  void _reloadConversation() {
    setState(() {
      _chatOptionsFuture = MessagingService.instance.resolveChatOptions();
      _controller.clear();
    });
  }

  Widget _buildMessage(
    SecureChatMessage message,
    SecureConversation conversation,
  ) {
    final currentUser = MessagingService.instance.currentUser;
    final isMe = currentUser != null && message.isSentBy(currentUser.uid);
    final time = _formatTime(message.createdAt);

    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Column(
          crossAxisAlignment:
              isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
              constraints: BoxConstraints(
                maxWidth: MediaQuery.of(context).size.width * 0.74,
              ),
              decoration: BoxDecoration(
                color: isMe ? _accent : Colors.white,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(18),
                  topRight: const Radius.circular(18),
                  bottomLeft: Radius.circular(isMe ? 18 : 6),
                  bottomRight: Radius.circular(isMe ? 6 : 18),
                ),
                border:
                    isMe ? null : Border.all(color: const Color(0xFFD6EAF5)),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x12000000),
                    blurRadius: 12,
                    offset: Offset(0, 4),
                  ),
                ],
              ),
              child: Text(
                message.text,
                style: TextStyle(
                  color: isMe ? Colors.white : _text,
                  fontSize: 15,
                  height: 1.4,
                ),
              ),
            ),
            if (time.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                time,
                style: const TextStyle(
                  color: _muted,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _displayName(String value, String role) {
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

  String _formatTime(DateTime? value) {
    if (value == null) return '';
    final hour =
        value.hour == 0
            ? 12
            : value.hour > 12
            ? value.hour - 12
            : value.hour;
    final minute = value.minute.toString().padLeft(2, '0');
    final period = value.hour >= 12 ? 'PM' : 'AM';
    return '$hour:$minute $period';
  }

  String _formatDateLabel(DateTime? value) {
    if (value == null) return '';
    final local = value.toLocal();
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final messageDay = DateTime(local.year, local.month, local.day);
    if (messageDay == today) return 'Today';
    if (messageDay == today.subtract(const Duration(days: 1))) {
      return 'Yesterday';
    }
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
    return '${local.day} ${months[local.month]} ${local.year}';
  }

  bool _sameDay(DateTime? first, DateTime? second) {
    if (first == null || second == null) return false;
    final a = first.toLocal();
    final b = second.toLocal();
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  void _scrollMessagesToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_messageScrollController.hasClients) return;
      _messageScrollController.animateTo(
        _messageScrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 260),
        curve: Curves.easeOut,
      );
    });
  }

  String _roleLabel(String role) {
    final normalized = role.trim().toLowerCase();
    if (normalized == 'doctor') return 'Doctor';
    if (normalized == 'midwife') return 'Midwife';
    return normalized.isEmpty ? 'Care team' : normalized;
  }

  String _presenceLabel(SecureConversation conversation) {
    return conversation.careTeamIsOnline ? 'Online' : 'Offline';
  }

  Color _presenceColor(SecureConversation conversation) {
    return conversation.careTeamIsOnline
        ? const Color(0xFF22A06B)
        : const Color(0xFF94A3B8);
  }

  IconData _roleIcon(String role) {
    return role.trim().toLowerCase() == 'doctor'
        ? Icons.medical_services_rounded
        : Icons.volunteer_activism_rounded;
  }

  void _showConversationInfoSheet(SecureConversation conversation) {
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
                          color: _surface,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Icon(
                          _roleIcon(conversation.careTeamRole),
                          color: _accent,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _displayName(
                                conversation.careTeamName,
                                conversation.careTeamRole,
                              ),
                              style: const TextStyle(
                                color: _text,
                                fontSize: 20,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${_roleLabel(conversation.careTeamRole)} | ${_presenceLabel(conversation)}',
                              style: const TextStyle(
                                color: _accent,
                                fontSize: 13,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _conversationInfoTile(
                    icon: Icons.circle,
                    title: 'Current status',
                    message:
                        '${_displayName(conversation.careTeamName, conversation.careTeamRole)} is ${_presenceLabel(conversation).toLowerCase()}.',
                  ),
                  _conversationInfoTile(
                    icon: Icons.lock_outline_rounded,
                    title: 'Private conversation',
                    message:
                        'Messages are shared only with the selected care team member in this secure chat.',
                  ),
                  _conversationInfoTile(
                    icon: Icons.swap_horiz_rounded,
                    title: 'Switch care team member',
                    message:
                        'Use the Midwife and Doctor tabs above the chat to choose who you want to message.',
                  ),
                  _conversationInfoTile(
                    icon: Icons.schedule_rounded,
                    title: 'Response time',
                    message:
                        'Your care team may not reply immediately. For urgent help, use emergency contacts or call your assigned provider.',
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

  Widget _conversationInfoTile({
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

  Widget _stateView({
    required IconData icon,
    required String title,
    required String message,
    required String actionLabel,
    required VoidCallback onAction,
  }) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: _accent, size: 42),
            const SizedBox(height: 14),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: _text,
                fontSize: 18,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: _muted, height: 1.45),
            ),
            const SizedBox(height: 18),
            ElevatedButton(
              onPressed: onAction,
              style: ElevatedButton.styleFrom(
                backgroundColor: _accent,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: 0,
              ),
              child: Text(actionLabel),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<CareChatOptions>(
      future: _chatOptionsFuture,
      builder: (context, snapshot) {
        return Scaffold(
          backgroundColor: _background,
          body: SafeArea(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
                  child: Row(
                    children: [
                      if (widget.showBackButton) ...[
                        IconButton(
                          icon: const Icon(
                            Icons.arrow_back_ios_new_rounded,
                            color: _text,
                          ),
                          onPressed: () => Navigator.pop(context),
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(
                            minWidth: 36,
                            minHeight: 36,
                          ),
                        ),
                        const SizedBox(width: 12),
                      ],
                      const Expanded(
                        child: Text(
                          'Chat',
                          style: TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.w800,
                            color: _text,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: EdgeInsets.fromLTRB(
                    widget.showBackButton ? 68 : 20,
                    6,
                    20,
                    12,
                  ),
                  child: const Text(
                    'Choose your assigned care team member and continue a private care conversation.',
                    style: TextStyle(fontSize: 14, color: _muted, height: 1.45),
                  ),
                ),
                Expanded(child: _buildBody(snapshot)),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildBody(AsyncSnapshot<CareChatOptions> snapshot) {
    if (snapshot.connectionState == ConnectionState.waiting) {
      return const AppLoadingState(
        title: 'Loading your messages',
        message: 'Finding your care team conversations.',
        compact: true,
      );
    }

    if (snapshot.hasError) {
      return _stateView(
        icon: Icons.chat_bubble_outline_rounded,
        title: 'Chat is not ready yet',
        message:
            'We could not connect to your care team chat. Please try again in a moment.',
        actionLabel: 'Try again',
        onAction: _reloadConversation,
      );
    }

    final options = snapshot.data;
    final conversation = _activeConversation(options);
    if (conversation == null) {
      return _stateView(
        icon: Icons.chat_bubble_outline_rounded,
        title: 'No chat available',
        message: 'Your care team chat will appear once your profile is ready.',
        actionLabel: 'Refresh',
        onAction: _reloadConversation,
      );
    }

    if (_lastMarkedConversationId != conversation.id) {
      _lastMarkedConversationId = conversation.id;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        MessagingService.instance
            .markConversationRead(conversation)
            .catchError((_) {});
      });
    }

    return Column(
      children: [
        if (options != null) _chatSelector(options),
        Padding(
          padding: const EdgeInsets.fromLTRB(18, 8, 18, 0),
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(12, 10, 8, 10),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFFD6EAF5)),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x0F000000),
                  blurRadius: 12,
                  offset: Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: _surface,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(
                    _roleIcon(conversation.careTeamRole),
                    color: _accent,
                    size: 21,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _displayName(
                          conversation.careTeamName,
                          conversation.careTeamRole,
                        ),
                        style: const TextStyle(
                          color: _text,
                          fontWeight: FontWeight.w800,
                          fontSize: 15.5,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${_roleLabel(conversation.careTeamRole)} | ${_presenceLabel(conversation)}',
                        style: TextStyle(
                          color: _presenceColor(conversation),
                          fontSize: 12,
                          height: 1.25,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  width: 9,
                  height: 9,
                  margin: const EdgeInsets.only(right: 8),
                  decoration: BoxDecoration(
                    color: _presenceColor(conversation),
                    shape: BoxShape.circle,
                  ),
                ),
                IconButton(
                  onPressed: () => _showConversationInfoSheet(conversation),
                  tooltip: 'Chat details',
                  icon: const Icon(
                    Icons.info_outline_rounded,
                    color: _accent,
                    size: 22,
                  ),
                ),
              ],
            ),
          ),
        ),
        Expanded(
          child: Container(
            margin: const EdgeInsets.fromLTRB(18, 8, 18, 0),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: _surface,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: const Color(0xFFD6EAF5)),
            ),
            child: StreamBuilder<List<SecureChatMessage>>(
              stream: MessagingService.instance.watchConversationMessages(
                conversation,
              ),
              builder: (context, messageSnapshot) {
                if (messageSnapshot.connectionState ==
                    ConnectionState.waiting) {
                  return const AppLoadingState(compact: true);
                }

                if (messageSnapshot.hasError) {
                  return Center(
                    child: _inlineState(
                      icon: Icons.wifi_off_rounded,
                      title: 'Messages unavailable',
                      message: 'Please check your connection and try again.',
                    ),
                  );
                }

                final messages = messageSnapshot.data ?? [];
                if (messages.isEmpty) {
                  return const Center(child: _InlineEmptyState());
                }
                _scrollMessagesToBottom();

                return ListView.builder(
                  controller: _messageScrollController,
                  itemCount: messages.length,
                  itemBuilder: (context, index) {
                    final message = messages[index];
                    final previous = index > 0 ? messages[index - 1] : null;
                    final showDate =
                        index == 0 ||
                        !_sameDay(previous?.createdAt, message.createdAt);
                    return Column(
                      children: [
                        if (showDate) _dateSeparator(message.createdAt),
                        _buildMessage(message, conversation),
                      ],
                    );
                  },
                );
              },
            ),
          ),
        ),
        SafeArea(
          top: false,
          child: Container(
            margin: const EdgeInsets.fromLTRB(18, 14, 18, 18),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(22),
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
                    minLines: 1,
                    maxLines: 4,
                    textCapitalization: TextCapitalization.sentences,
                    decoration: const InputDecoration(
                      hintText: 'Write a message',
                      hintStyle: TextStyle(color: Color(0xFF7B8FA3)),
                      border: InputBorder.none,
                      contentPadding: EdgeInsets.symmetric(horizontal: 4),
                    ),
                    onSubmitted: (_) => _sendMessage(conversation),
                  ),
                ),
                const SizedBox(width: 8),
                Tooltip(
                  message: _isSending ? 'Sending message' : 'Send message',
                  child: Semantics(
                    button: true,
                    label: _isSending ? 'Sending message' : 'Send message',
                    child: InkWell(
                      onTap:
                          _isSending ? null : () => _sendMessage(conversation),
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color:
                              _isSending
                                  ? const Color(0xFFB7DDF0)
                                  : _accentDark,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child:
                            _isSending
                                ? const SizedBox(
                                  width: 24,
                                  height: 24,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2.4,
                                    color: Colors.white,
                                  ),
                                )
                                : const Icon(
                                  Icons.send_rounded,
                                  color: Colors.white,
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
    );
  }

  Widget _dateSeparator(DateTime? date) {
    final label = _formatDateLabel(date);
    if (label.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: const Color(0xFFD6EAF5)),
        ),
        child: Text(
          label,
          style: const TextStyle(
            color: _muted,
            fontSize: 11.5,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }

  SecureConversation? _activeConversation(CareChatOptions? options) {
    if (options == null) return null;
    if (_selectedRole == 'doctor' && options.doctor != null) {
      return options.doctor;
    }
    return options.midwife;
  }

  Widget _chatSelector(CareChatOptions options) {
    final doctorEnabled = options.doctor != null;
    return Container(
      margin: const EdgeInsets.fromLTRB(18, 8, 18, 0),
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFD6EAF5)),
      ),
      child: Row(
        children: [
          Expanded(
            child: _selectorButton(
              label: 'Midwife',
              icon: Icons.volunteer_activism_rounded,
              selected: _selectedRole == 'midwife',
              enabled: true,
              onTap: () => setState(() => _selectedRole = 'midwife'),
            ),
          ),
          const SizedBox(width: 6),
          Expanded(
            child: _selectorButton(
              label: 'Doctor',
              icon: Icons.medical_services_rounded,
              selected: _selectedRole == 'doctor',
              enabled: doctorEnabled,
              onTap:
                  doctorEnabled
                      ? () => setState(() => _selectedRole = 'doctor')
                      : null,
            ),
          ),
        ],
      ),
    );
  }

  Widget _selectorButton({
    required String label,
    required IconData icon,
    required bool selected,
    required bool enabled,
    required VoidCallback? onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 11, horizontal: 10),
        decoration: BoxDecoration(
          color: selected ? _accent : Colors.transparent,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 18,
              color:
                  !enabled
                      ? const Color(0xFFB7DDF0)
                      : selected
                      ? Colors.white
                      : _text,
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                color:
                    !enabled
                        ? const Color(0xFFB7DDF0)
                        : selected
                        ? Colors.white
                        : _text,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      ),
    );
  }

  static Widget _inlineState({
    required IconData icon,
    required String title,
    required String message,
  }) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: _accent, size: 34),
        const SizedBox(height: 10),
        Text(
          title,
          style: const TextStyle(color: _text, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 6),
        Text(
          message,
          textAlign: TextAlign.center,
          style: const TextStyle(color: _muted, height: 1.4),
        ),
      ],
    );
  }
}

class _InlineEmptyState extends StatelessWidget {
  const _InlineEmptyState();

  @override
  Widget build(BuildContext context) {
    return const Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.forum_rounded, color: _ChatPageState._accent, size: 38),
        SizedBox(height: 12),
        Text(
          'Start a care conversation',
          style: TextStyle(
            color: _ChatPageState._text,
            fontWeight: FontWeight.w800,
            fontSize: 16,
          ),
        ),
        SizedBox(height: 6),
        Text(
          'Ask a question, share how you feel, or follow up after a visit. Your care team can reply when available.',
          textAlign: TextAlign.center,
          style: TextStyle(color: _ChatPageState._muted, height: 1.4),
        ),
      ],
    );
  }
}
