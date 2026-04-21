enum AppUserRole {
  mother,
  guardian,
  unknown,
}

extension AppUserRoleX on AppUserRole {
  static AppUserRole fromString(dynamic value) {
    switch ('$value'.trim().toLowerCase()) {
      case 'mother':
        return AppUserRole.mother;
      case 'guardian':
        return AppUserRole.guardian;
      default:
        return AppUserRole.unknown;
    }
  }

  bool get isMobileUser => this == AppUserRole.mother || this == AppUserRole.guardian;

  String get homeRoute {
    switch (this) {
      case AppUserRole.guardian:
        return '/guardian-home';
      case AppUserRole.mother:
      case AppUserRole.unknown:
        return '/home';
    }
  }

  String get label {
    switch (this) {
      case AppUserRole.guardian:
        return 'Guardian';
      case AppUserRole.mother:
        return 'Mother';
      case AppUserRole.unknown:
        return 'User';
    }
  }
}

class AppSession {
  final String uid;
  final AppUserRole role;

  const AppSession({
    required this.uid,
    required this.role,
  });
}
