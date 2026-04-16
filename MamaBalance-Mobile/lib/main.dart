import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';

import 'firebase_options.dart';
import 'screens/about_app_screen.dart';
import 'screens/chat_page.dart';
import 'screens/chatbot_screen.dart';
import 'screens/educational_resources_screen.dart';
import 'screens/emergency_contacts_page.dart';
import 'screens/epds_trend_screen.dart';
import 'screens/faq_page.dart';
import 'screens/forgot_password_screen.dart';
import 'screens/home_page.dart';
import 'screens/intro_screen.dart';
import 'screens/notification_tab.dart';
import 'screens/otp_screen.dart';
import 'screens/otp_verification_screen.dart';
import 'screens/phone_login_screen.dart';
import 'screens/prescription_page_live.dart';
import 'screens/privacy_policy_page.dart';
import 'screens/profile_details_page.dart';
import 'screens/profile_screen.dart';
import 'screens/reset_password_screen.dart';
import 'screens/signin_screen.dart';
import 'screens/splash_screen.dart';
import 'screens/weekly_checkin_page.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF4FA38A),
          primary: const Color(0xFF4FA38A),
        ),
        textSelectionTheme: const TextSelectionThemeData(
          cursorColor: Color(0xFF4FA38A),
          selectionColor: Color(0x404FA38A),
          selectionHandleColor: Color(0xFF4FA38A),
        ),
      ),
      initialRoute: '/',
      routes: {
        '/': (context) => SplashScreen(),
        '/intro': (context) => IntroScreen(),
        '/signin': (context) => SignInScreen(),
        '/forgot': (context) => ForgotPasswordScreen(),
        '/reset': (context) => ResetPasswordScreen(),
        '/home': (context) => HomePage(),
        '/weekly-checkin': (context) => WeeklyCheckInPage(),
        '/profile': (context) => ProfileScreen(),
        '/profile-details': (context) => ProfileDetailsPage(),
        '/about': (context) => AboutAppScreen(),
        '/faq': (context) => const FAQPage(),
        '/privacy-policy': (context) => const PrivacyPolicyPage(),
        '/emergency-contacts': (context) => EmergencyContactsPage(),
        '/epds-trend': (context) => EpdsTrendScreen(),
        '/educational-resources': (context) => EducationalResourcesScreen(),
        '/notifications': (context) => NotificationTab(),
        '/chat': (context) => const ChatPage(doctorName: 'Dr. Smith'),
        '/prescription': (context) => const PrescriptionPage(),
        '/chatbot': (context) => const ChatbotScreen(),
        '/phone-login': (context) => const PhoneLoginScreen(),
        '/otp': (context) => const OtpScreen(),
        '/otp-verification': (context) => const OTPVerificationScreen(),
      },
    );
  }
}
