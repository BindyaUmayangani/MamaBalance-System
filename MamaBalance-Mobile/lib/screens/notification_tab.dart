import 'package:flutter/material.dart';

import '../services/notification_service.dart';

enum NotificationAudience { mother, guardian }

class NotificationTab extends StatefulWidget {
  const NotificationTab({
    super.key,
    this.audience = NotificationAudience.mother,
    this.showBackButton = false,
  });

  final NotificationAudience audience;
  final bool showBackButton;

  @override
  State<NotificationTab> createState() => _NotificationTabState();
}

class _NotificationTabState extends State<NotificationTab> {
  static const Color _accent = Color(0xFF4FA58D);
  static const Color _background = Color(0xFFF3FBF8);
  static const Color _surface = Color(0xFFECF8F4);
  static const Color _text = Color(0xFF173C3A);
  static const Color _muted = Color(0xFF6A7B79);

  late Future<MotherNotificationSummary> _summaryFuture;
  String? _selectedFilter;

  @override
  void initState() {
    super.initState();
    _summaryFuture = _fetchSummary();
  }

  Future<MotherNotificationSummary> _fetchSummary() {
    return widget.audience == NotificationAudience.guardian
        ? NotificationService.instance.fetchGuardianSummary()
        : NotificationService.instance.fetchSummary();
  }

  Future<void> _reload() async {
    setState(() {
      _summaryFuture = _fetchSummary();
    });
    await _summaryFuture;
  }

  Future<void> _markAllRead(MotherNotificationSummary summary) async {
    final ids = summary.items.where((item) => !item.read).map((item) => item.id).toList();
    if (widget.audience == NotificationAudience.guardian) {
      await NotificationService.instance.markAllGuardianRead(ids);
    } else {
      await NotificationService.instance.markAllRead(ids);
    }
    await _reload();
  }

  IconData _iconForType(String type) {
    switch (type.toLowerCase()) {
      case 'assessment':
        return Icons.fact_check_rounded;
      case 'message':
        return Icons.chat_bubble_rounded;
      case 'visit':
      case 'checkup':
        return Icons.event_available_rounded;
      case 'resource':
        return Icons.menu_book_rounded;
      case 'care team':
        return Icons.health_and_safety_rounded;
      default:
        return Icons.notifications_active_outlined;
    }
  }

  String _timeLabel(DateTime value) {
    final now = DateTime.now();
    final difference = now.difference(value);

    if (difference.inMinutes < 1) return 'Just now';
    if (difference.inHours < 1) return '${difference.inMinutes} min ago';
    if (difference.inHours < 24) return '${difference.inHours}h ago';
    if (difference.inDays == 1) return 'Yesterday';
    if (difference.inDays < 7) return '${difference.inDays} days ago';

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
    return '${months[value.month]} ${value.day}';
  }

  Future<void> _handleTap(MotherNotificationItem item) async {
    if (widget.audience == NotificationAudience.guardian) {
      await NotificationService.instance.markGuardianRead(item.id);
    } else {
      await NotificationService.instance.markRead(item.id);
    }
    if (!mounted) return;
    await _reload();
  }

  Future<void> _dismiss(MotherNotificationItem item) async {
    if (widget.audience == NotificationAudience.guardian) {
      await NotificationService.instance.dismissGuardian(item.id);
    } else {
      await NotificationService.instance.dismiss(item.id);
    }
    if (!mounted) return;
    await _reload();
  }

  void _toggleFilter(String filter) {
    setState(() {
      if (_selectedFilter == filter) {
        _selectedFilter = null;
      } else {
        _selectedFilter = filter;
      }
    });
  }

  List<MotherNotificationItem> _filterItems(List<MotherNotificationItem> items) {
    if (_selectedFilter == null) return items;

    switch (_selectedFilter) {
      case 'Unread':
        return items.where((item) => !item.read).toList();
      case 'Important':
        return items.where((item) => item.priority == 'high').toList();
      case 'Today':
        final now = DateTime.now();
        final start = DateTime(now.year, now.month, now.day);
        final end = start.add(const Duration(days: 1));
        return items
            .where(
              (item) =>
                  item.createdAt.isAfter(start.subtract(const Duration(milliseconds: 1))) &&
                  item.createdAt.isBefore(end),
            )
            .toList();
      default:
        return items;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _background,
      body: SafeArea(
        child: FutureBuilder<MotherNotificationSummary>(
          future: _summaryFuture,
          builder: (context, snapshot) {
            final summary = snapshot.data;
            final isGuardian = widget.audience == NotificationAudience.guardian;

            return RefreshIndicator(
              color: _accent,
              onRefresh: _reload,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
                children: [
                  Row(
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
                      Expanded(
                        child: Text(
                          isGuardian ? 'Guardian Notifications' : 'Notifications',
                          style: const TextStyle(
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
                    padding: EdgeInsets.only(left: widget.showBackButton ? 48 : 0),
                    child: Text(
                      isGuardian
                          ? 'Stay updated with upcoming visits, overdue visits, EPDS reminders, and newly added guardian resources.'
                          : 'Stay updated with check-in reminders, care team messages, visits, resources, and schedule changes.',
                      style: const TextStyle(fontSize: 14, color: _muted, height: 1.4),
                    ),
                  ),
                  const SizedBox(height: 18),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(26),
                      border: Border.all(color: const Color(0xFFD6ECE6)),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: _summaryChip(
                            'Unread',
                            '${summary?.unreadCount ?? 0}',
                            isSelected: _selectedFilter == 'Unread',
                            onTap: () => _toggleFilter('Unread'),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _summaryChip(
                            'Important',
                            '${summary?.importantCount ?? 0}',
                            isSelected: _selectedFilter == 'Important',
                            onTap: () => _toggleFilter('Important'),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _summaryChip(
                            'Today',
                            '${summary?.todayCount ?? 0}',
                            isSelected: _selectedFilter == 'Today',
                            onTap: () => _toggleFilter('Today'),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  if (summary != null && summary.unreadCount > 0)
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(
                        onPressed: () => _markAllRead(summary),
                        child: const Text(
                          'Mark all as read',
                          style: TextStyle(color: _accent, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                  if (snapshot.connectionState == ConnectionState.waiting)
                    const _NotificationMessageState(
                      icon: Icons.notifications_active_outlined,
                      title: 'Loading notifications...',
                      message: 'Please wait a moment while we check your latest care updates.',
                    )
                  else if (snapshot.hasError)
                    _NotificationMessageState(
                      icon: Icons.wifi_off_rounded,
                      title: 'Notifications unavailable',
                      message: '${snapshot.error}',
                    )
                  else if (summary == null || summary.items.isEmpty)
                    _NotificationMessageState(
                      icon: Icons.notifications_none_rounded,
                      title: 'No notifications yet',
                      message: isGuardian
                          ? 'Upcoming visits, overdue reminders, EPDS alerts, and new resources will appear here for guardians.'
                          : 'When there are new reminders, care updates, messages, or resources, they will appear here.',
                    )
                  else if (_filterItems(summary.items).isEmpty)
                    _NotificationMessageState(
                      icon: Icons.filter_list_off_rounded,
                      title: 'No ${_selectedFilter?.toLowerCase() ?? ""} notifications',
                      message: 'You don\'t have any notifications that match this filter.',
                    )
                  else
                    ..._filterItems(summary.items).map(
                      (item) => _NotificationCard(
                        item: item,
                        icon: _iconForType(item.type),
                        timeLabel: _timeLabel(item.createdAt),
                        onTap: () => _handleTap(item),
                        onDismiss: () => _dismiss(item),
                      ),
                    ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _summaryChip(String label, String value, {required bool isSelected, required VoidCallback onTap}) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
          decoration: BoxDecoration(
            color: isSelected ? _accent : _surface,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: isSelected ? _accent : Colors.transparent),
          ),
          child: Column(
            children: [
              Text(
                value,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: isSelected ? Colors.white : _text,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  color: isSelected ? Colors.white.withOpacity(0.9) : _muted,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NotificationCard extends StatelessWidget {
  const _NotificationCard({
    required this.item,
    required this.icon,
    required this.timeLabel,
    required this.onTap,
    required this.onDismiss,
  });

  final MotherNotificationItem item;
  final IconData icon;
  final String timeLabel;
  final VoidCallback onTap;
  final VoidCallback onDismiss;

  static const Color _accent = Color(0xFF4FA58D);
  static const Color _surface = Color(0xFFECF8F4);
  static const Color _text = Color(0xFF173C3A);
  static const Color _muted = Color(0xFF6A7B79);

  @override
  Widget build(BuildContext context) {
    final isHighPriority = item.priority == 'high';

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: item.read ? const Color(0xFFD6ECE6) : const Color(0xFFB8DED2)),
        boxShadow: const [BoxShadow(color: Color(0x12000000), blurRadius: 14, offset: Offset(0, 6))],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(22),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(color: _surface, borderRadius: BorderRadius.circular(16)),
                  child: Icon(icon, color: _accent),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Text(
                              item.title,
                              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: _text),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            timeLabel,
                            style: const TextStyle(fontSize: 12, color: _muted, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        item.description,
                        style: const TextStyle(fontSize: 13, color: _muted, height: 1.45),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(color: _surface, borderRadius: BorderRadius.circular(999)),
                            child: Text(item.type, style: const TextStyle(fontSize: 12, color: _accent, fontWeight: FontWeight.w700)),
                          ),
                          const SizedBox(width: 8),
                          if (isHighPriority)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFCEDEC),
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: const Text(
                                'Important',
                                style: TextStyle(fontSize: 12, color: Color(0xFFB6403D), fontWeight: FontWeight.w700),
                              ),
                            ),
                          const Spacer(),
                          if (!item.read)
                            Container(
                              width: 10,
                              height: 10,
                              decoration: const BoxDecoration(
                                color: _accent,
                                shape: BoxShape.circle,
                              ),
                            ),
                          IconButton(
                            onPressed: onDismiss,
                            icon: const Icon(Icons.close_rounded, size: 18, color: _muted),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(minWidth: 24, minHeight: 24),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _NotificationMessageState extends StatelessWidget {
  const _NotificationMessageState({
    required this.icon,
    required this.title,
    required this.message,
  });

  final IconData icon;
  final String title;
  final String message;

  static const Color _accent = Color(0xFF4FA58D);
  static const Color _text = Color(0xFF173C3A);
  static const Color _muted = Color(0xFF6A7B79);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 44),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
      ),
      child: Column(
        children: [
          Icon(icon, color: _accent, size: 38),
          const SizedBox(height: 14),
          Text(
            title,
            style: const TextStyle(
              color: _text,
              fontSize: 17,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            message,
            style: const TextStyle(color: _muted, fontSize: 14, height: 1.45),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
