import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mamabalance/screens/account_role_selection_screen.dart';

void main() {
  Widget appUnderTest() {
    return MaterialApp(
      routes: {
        '/': (_) => const AccountRoleSelectionScreen(),
        '/mother-signin': (_) => const Scaffold(
              body: Center(child: Text('Mother sign-in destination')),
            ),
        '/guardian-signin': (_) => const Scaffold(
              body: Center(child: Text('Guardian sign-in destination')),
            ),
      },
    );
  }

  group('account role navigation flow', () {
    testWidgets('mother account card navigates to mother sign-in',
        (tester) async {
      await tester.pumpWidget(appUnderTest());

      expect(find.text('Choose Your Account'), findsOneWidget);

      final motherButton = find.text('Continue as Mother');
      await tester.ensureVisible(motherButton);
      await tester.pumpAndSettle();
      await tester.tap(motherButton);
      await tester.pumpAndSettle();

      expect(find.text('Mother sign-in destination'), findsOneWidget);
    });

    testWidgets('guardian account card navigates to guardian sign-in',
        (tester) async {
      await tester.pumpWidget(appUnderTest());

      final guardianButton = find.text('Continue as Guardian');
      await tester.ensureVisible(guardianButton);
      await tester.pumpAndSettle();
      await tester.tap(guardianButton);
      await tester.pumpAndSettle();

      expect(find.text('Guardian sign-in destination'), findsOneWidget);
    });
  });
}
