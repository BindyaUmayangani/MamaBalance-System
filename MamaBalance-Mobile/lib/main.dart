import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';

import 'firebase_options.dart';
import 'services/auth_service.dart';
import 'services/biometric_auth_service.dart';
import 'screens/about_app_screen.dart';
import 'screens/account_role_selection_screen.dart';
import 'screens/biometric_lock_screen.dart';
import 'screens/chat_page.dart';
import 'screens/chatbot_screen.dart';
import 'screens/educational_resources_screen.dart';
import 'screens/emergency_contacts_page.dart';
import 'screens/epds_trend_screen.dart';
import 'screens/faq_page.dart';
import 'screens/forgot_password_screen.dart';
import 'screens/guardian_home_page.dart';
import 'screens/guardian_profile_screen.dart';
import 'screens/guardian_shell_screen.dart';
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

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> with WidgetsBindingObserver {
  final GlobalKey<NavigatorState> _navigatorKey = GlobalKey<NavigatorState>();
  final AppRouteObserver _routeObserver = AppRouteObserver();
  bool _shouldLockOnResume = false;
  bool _resumeCheckInProgress = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive) {
      if (BiometricAuthService.instance.authenticationInProgress) {
        return;
      }
      _prepareBiometricLock();
      return;
    }

    if (state == AppLifecycleState.resumed) {
      _lockOnResumeIfNeeded();
    }
  }

  Future<void> _prepareBiometricLock() async {
    final currentUser = FirebaseAuth.instance.currentUser;
    if (currentUser == null) {
      _shouldLockOnResume = false;
      return;
    }

    final isSessionFresh = await AuthService.instance.isFullLoginStillValid();
    if (!isSessionFresh) {
      _shouldLockOnResume = false;
      return;
    }

    _shouldLockOnResume =
        await BiometricAuthService.instance.isEnabledForCurrentUser();
  }

  Future<void> _lockOnResumeIfNeeded() async {
    if (_resumeCheckInProgress || !_shouldLockOnResume) {
      return;
    }

    if (BiometricAuthService.instance.authenticationInProgress ||
        BiometricAuthService.instance.shouldSuppressResumeLock) {
      _shouldLockOnResume = false;
      return;
    }

    _resumeCheckInProgress = true;
    try {
      final currentUser = FirebaseAuth.instance.currentUser;
      if (currentUser == null) {
        _shouldLockOnResume = false;
        return;
      }

      final isSessionFresh = await AuthService.instance.isFullLoginStillValid();
      if (!isSessionFresh) {
        _shouldLockOnResume = false;
        await AuthService.instance.expireCurrentSession();
        _navigatorKey.currentState?.pushNamedAndRemoveUntil(
          '/signin',
          (route) => false,
        );
        return;
      }

      final currentRoute = _routeObserver.currentRouteName;
      const unlockedRoutes = <String>{
        '/',
        '/intro',
        '/signin',
        '/forgot',
        '/reset',
        '/otp',
        '/otp-verification',
        '/biometric-lock',
      };

      if (unlockedRoutes.contains(currentRoute)) {
        return;
      }

      final biometricEnabled =
          await BiometricAuthService.instance.isEnabledForCurrentUser();
      if (!biometricEnabled) {
        _shouldLockOnResume = false;
        return;
      }

      _shouldLockOnResume = false;
      _navigatorKey.currentState?.pushNamedAndRemoveUntil(
        '/biometric-lock',
        (route) => false,
      );
    } finally {
      _resumeCheckInProgress = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: _navigatorKey,
      navigatorObservers: [_routeObserver],
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
        '/signin': (context) => const AccountRoleSelectionScreen(),
        '/mother-signin': (context) => const SignInScreen(),
        '/guardian-signin': (context) => const SignInScreen(
              audience: SignInAudience.guardian,
              initialMethod: SignInMethod.phone,
            ),
        '/forgot': (context) => ForgotPasswordScreen(),
        '/reset': (context) => ResetPasswordScreen(),
        '/home': (context) => HomePage(),
        '/guardian-home': (context) => const GuardianShellScreen(),
        '/guardian-profile': (context) => const GuardianShellScreen(initialIndex: 3),
        '/guardian-notifications': (context) => const GuardianShellScreen(initialIndex: 1),
        '/guardian-resources': (context) => const GuardianShellScreen(initialIndex: 2),
        '/biometric-lock': (context) => const BiometricLockScreen(),
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

class AppRouteObserver extends NavigatorObserver {
  String? currentRouteName;

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    currentRouteName = route.settings.name;
    super.didPush(route, previousRoute);
  }

  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) {
    currentRouteName = newRoute?.settings.name;
    super.didReplace(newRoute: newRoute, oldRoute: oldRoute);
  }

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) {
    currentRouteName = previousRoute?.settings.name;
    super.didPop(route, previousRoute);
  }
}
