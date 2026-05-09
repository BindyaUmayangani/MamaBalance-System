import 'package:flutter/material.dart';

class BottomNavBar extends StatelessWidget {
  final int currentIndex;
  final Function(int) onTap;
  final int unreadMessages;
  final int unreadNotifications;

  const BottomNavBar({
    super.key,
    required this.currentIndex,
    required this.onTap,
    this.unreadMessages = 0,
    this.unreadNotifications = 0,
  });

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
          const BottomNavigationBarItem(icon: Icon(Icons.home_rounded), label: 'Home'),
          const BottomNavigationBarItem(
            icon: Icon(Icons.check_circle_rounded),
            label: 'Check-In',
          ),
          BottomNavigationBarItem(
            icon: Badge(
              label: Text('$unreadMessages'),
              isLabelVisible: unreadMessages > 0,
              backgroundColor: const Color(0xFFB6403D),
              child: const Icon(Icons.chat_bubble_rounded),
            ),
            label: 'Chat',
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
          const BottomNavigationBarItem(icon: Icon(Icons.person_rounded), label: 'Profile'),
        ],
      ),
    );
  }
}

