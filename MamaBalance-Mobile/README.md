# MamaBalance Mobile

MamaBalance Mobile is the Flutter application for mothers and guardians. It provides access to maternal care updates, weekly EPDS check-ins, prescriptions, visits, notifications, educational resources, profile management, and secure communication with assigned care team members.

## Purpose

This app is designed to help mothers stay connected with their care team and track important wellbeing and care information from a mobile device.

## Main Features

- Personal email and phone-based sign in.
- Mother and guardian account support.
- Mother profile view and update.
- Profile picture upload with initials fallback.
- Weekly EPDS check-in workflow.
- Home dashboard with latest EPDS score, next check-in, and care updates.
- Assigned doctor and midwife details.
- Visit, checkup, and prescription information.
- Secure messaging with assigned doctor or midwife.
- Notifications and educational resources.
- Biometric session unlock support.

## Architecture

The mobile app uses Firebase Authentication for login and session tokens. After login, app data is loaded through the centralized `mamabalance-web` backend API.

```text
Flutter App
   |
   | Firebase Auth login/session token
   v
mamabalance-web API
   |
   | Firebase Admin SDK
   v
Firestore / Firebase Storage
```

This keeps mobile business logic and Firestore access controlled through the backend.

## Tech Stack

- Flutter
- Dart
- Firebase Authentication
- HTTP API integration
- Shared Preferences
- Image Picker
- Local Auth
- Video Player
- Intl

## Project Structure

```text
MamaBalance-Mobile/
+-- android/              # Android project files
+-- ios/                  # iOS project files
+-- lib/
|   +-- config/           # App configuration
|   +-- models/           # Data models
|   +-- screens/          # UI screens
|   +-- services/         # Auth and backend API services
|   +-- utils/            # Utility helpers
|   +-- widgets/          # Shared widgets
|   +-- main.dart         # App entry point
+-- assets/               # Images, videos, and app assets
+-- pubspec.yaml
+-- README.md
```

## Prerequisites

- Flutter SDK
- Android Studio or a configured Android device
- Firebase project configuration
- Running `mamabalance-web` backend

## Installation

```bash
flutter pub get
```

## Running The App

Run the web backend first:

```bash
cd ../mamabalance-web
npm run dev
```

Then run the mobile app with the backend URL.

For a hosted backend:

```bash
cd ../MamaBalance-Mobile
flutter run --dart-define=MAMABALANCE_API_BASE_URL=https://<your-backend-domain>
```

For a local PC backend:

```bash
cd ../MamaBalance-Mobile
flutter run --dart-define=MAMABALANCE_API_BASE_URL=http://<computer-ip>:3000
```

The phone does not need to be on the same Wi-Fi when the backend URL is hosted online or exposed through a secure tunnel. For a direct local PC backend, the phone must be able to reach the PC through LAN, VPN, or another private network route.

For a real Android phone, `localhost` usually will not work because it points to the phone itself.

## Firebase Notes

The app keeps Firebase Auth client-side for login/session only. Data access such as profile, care, messaging, notifications, resources, check-ins, and prescriptions should go through the web backend.

## Assets

Assets are configured in `pubspec.yaml`.

```yaml
assets:
  - assets/images/MamaBalance_logo.png
  - assets/images/
  - assets/videos/family.mp4
```

## App Icon

Launcher icons are configured with `flutter_launcher_icons`.

```bash
flutter pub run flutter_launcher_icons
```

## Troubleshooting

If API requests fail:

- Confirm `mamabalance-web` is running.
- Confirm the phone can access the configured backend URL.
- Confirm `MAMABALANCE_API_BASE_URL` is set correctly.
- Confirm Firebase Auth is configured.
- Confirm the signed-in user exists and is active in the web system.

If profile image upload fails:

- Confirm Firebase Storage is enabled.
- Confirm the web backend has the correct storage bucket in `.env.local`.

## Related Folders

- `../mamabalance-web/` - web portal and centralized backend.
- `../documents/` - final year project documentation.
- `../firebase/` - Firebase rules and schema notes.
