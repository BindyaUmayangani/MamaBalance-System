import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mamabalance/widgets/otp_code_field.dart';

void main() {
  Future<void> pumpOtpField(
    WidgetTester tester,
    ValueChanged<String> onChanged,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Center(
            child: OtpCodeField(onChanged: onChanged),
          ),
        ),
      ),
    );
  }

  group('OtpCodeField', () {
    testWidgets('renders six OTP inputs', (tester) async {
      await pumpOtpField(tester, (_) {});

      expect(find.byType(TextField), findsNWidgets(6));
    });

    testWidgets('accepts six typed OTP digits and reports the full code',
        (tester) async {
      String latest = '';
      await pumpOtpField(tester, (value) => latest = value);

      for (var index = 0; index < 6; index += 1) {
        await tester.enterText(find.byType(TextField).at(index), '${index + 1}');
        await tester.pump();
      }

      expect(latest, '123456');
      for (final digit in ['1', '2', '3', '4', '5', '6']) {
        expect(find.text(digit), findsOneWidget);
      }
    });

    testWidgets('ignores non-digit characters', (tester) async {
      String latest = '';
      await pumpOtpField(tester, (value) => latest = value);

      await tester.enterText(find.byType(TextField).first, 'a');
      await tester.pump();

      expect(latest, '');
      expect(find.text('a'), findsNothing);
    });

    testWidgets('backspace on an empty box clears previous digit', (tester) async {
      String latest = '';
      await pumpOtpField(tester, (value) => latest = value);

      await tester.enterText(find.byType(TextField).first, '12');
      await tester.pump();
      await tester.tap(find.byType(TextField).at(2));
      await tester.pump();
      await tester.sendKeyEvent(LogicalKeyboardKey.backspace);
      await tester.pump();

      expect(latest, '1');
      expect(find.text('2'), findsNothing);
    });
  });
}
