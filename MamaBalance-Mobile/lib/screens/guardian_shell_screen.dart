import 'package:flutter/material.dart';

import '../screens/educational_resources_screen.dart';
import '../screens/guardian_home_page.dart';
import '../screens/guardian_profile_screen.dart';
import '../screens/notification_tab.dart';
import '../services/notification_service.dart';

class GuardianShellScreen extends StatefulWidget {
  const GuardianShellScreen({
    super.key,
    this.initialIndex = 0,
  });

  final int initialIndex;

  @override
  State<GuardianShellScreen> createState() => _GuardianShellScreenState();
}

class _GuardianShellScreenState extends State<GuardianShellScreen> {
  late int _selectedIndex;

  @override
  void initState() {
    super.initState();
    _selectedIndex = widget.initialIndex.clamp(0, 3);
  }

  void _onItemTapped(int index) {
    if (_selectedIndex == index) return;
    setState(() => _selectedIndex = index);
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      GuardianHomePage(),
      const NotificationTab(audience: NotificationAudience.guardian),
      const EducationalResourcesScreen(
        audience: 'guardian',
        showBackButton: false,
      ),
      const GuardianProfileScreen(showBackButton: false),
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF3FAFD),
      body: IndexedStack(
        index: _selectedIndex,
        children: pages,
      ),
      bottomNavigationBar: StreamBuilder<MotherNotificationSummary>(
        stream: NotificationService.instance.watchGuardianSummary(),
        builder: (context, snapshot) {
          final summary = snapshot.data;
          return _GuardianBottomNavBar(
            currentIndex: _selectedIndex,
            onTap: _onItemTapped,
            unreadNotifications: summary?.unreadCount ?? 0,
          );
        },
      ),
    );
  }
}

class _GuardianBottomNavBar extends StatelessWidget {
  const _GuardianBottomNavBar({
    required this.currentIndex,
    required this.onTap,
    required this.unreadNotifications,
  });

  final int currentIndex;
  final ValueChanged<int> onTap;
  final int unreadNotifications;

  @override
  Widget build(BuildContext context) {
    const accent = Color(0xFF4A90C2);
    const muted = Color(0xFF5F7285);

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 18),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14000000),
            blurRadius: 22,
            offset: Offset(0, 10),
          ),
        ],
        border: Border.all(color: const Color(0xFFD6EAF5)),
      ),
      child: BottomNavigationBar(
        currentIndex: currentIndex,
        onTap: onTap,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
        backgroundColor: Colors.transparent,
        selectedItemColor: accent,
        unselectedItemColor: muted,
        selectedLabelStyle: const TextStyle(
          fontWeight: FontWeight.w700,
          fontSize: 12,
        ),
        unselectedLabelStyle: const TextStyle(
          fontWeight: FontWeight.w500,
          fontSize: 12,
        ),
        items: [
          const BottomNavigationBarItem(
            icon: Icon(Icons.home_rounded),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Badge(
              label: Text('$unreadNotifications'),
              isLabelVisible: unreadNotifications > 0,
              backgroundColor: accent,
              child: const Icon(Icons.notifications_rounded),
            ),
            label: 'Alerts',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.menu_book_rounded),
            label: 'Resources',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.person_rounded),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
