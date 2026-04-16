class AppConfig {
  /// ⚠️ IMPORTANT: Get your Gemini API key from https://aistudio.google.com/
  /// and paste it here.
  static const String geminiApiKey = 'AIzaSyAa8Qc8NNnI-aVWR2M5mgID-skjtfeiSxI';
  
  static const String geminiModel = 'gemini-2.5-flash';
  static const String backendBaseUrl = String.fromEnvironment(
    'MAMABALANCE_API_BASE_URL',
    defaultValue: 'http://127.0.0.1:3000',
  );
}
