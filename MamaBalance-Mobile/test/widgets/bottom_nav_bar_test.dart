import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mamabalance/widgets/bottom_nav_bar.dart';

void main() {
  Future<List<int>> pumpNavBar(WidgetTester tester) async {
    final taps = <int>[];
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          bottomNavigationBar: BottomNavBar(
            currentIndex: 2,
            unreadMessages: 3,
            unreadNotifications: 5,
            onTap: taps.add,
          ),
        ),
      ),
    );
    return taps;
  }

  group('BottomNavBar', () {
    testWidgets('renders mobile navigation destinations and unread badges',
        (tester) async {
      await pumpNavBar(tester);

      expect(find.text('Home'), findsOneWidget);
      expect(find.text('Check-In'), findsOneWidget);
      expect(find.text('Chat'), findsOneWidget);
      expect(find.text('Alerts'), findsOneWidget);
      expect(find.text('Profile'), findsOneWidget);
      expect(find.text('3'), findsOneWidget);
      expect(find.text('5'), findsOneWidget);
    });

    testWidgets('reports tapped destination index', (tester) async {
      final taps = await pumpNavBar(tester);

      await tester.tap(find.text('Alerts'));
      await tester.pump();

      expect(taps, [3]);
    });

    testWidgets('hides badge labels when unread counts are zero', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            bottomNavigationBar: BottomNavBar(
              currentIndex: 0,
              onTap: (_) {},
            ),
          ),
        ),
      );

      expect(find.text('0'), findsNothing);
    });
  });
}
