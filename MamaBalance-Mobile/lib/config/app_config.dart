class AppConfig {
  static const String backendBaseUrl = String.fromEnvironment(
    'MAMABALANCE_API_BASE_URL',
    defaultValue: 'http://127.0.0.1:3000',
  );
}
