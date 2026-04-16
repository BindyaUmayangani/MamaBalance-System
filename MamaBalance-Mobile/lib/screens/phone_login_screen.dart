import 'package:flutter/material.dart';

import 'signin_screen.dart';

class PhoneLoginScreen extends StatelessWidget {
  const PhoneLoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const SignInScreen(initialMethod: SignInMethod.phone);
  }
}
