# MamaBalance Installation Guide

## 1. Purpose

This guide explains how to install and run the MamaBalance web and mobile applications for development, testing, or final year project demonstration.

## 2. Project Structure

| Path | Description |
|---|---|
| `mamabalance-web` | Next.js web application for Superadmin, Regional Admin, Doctor, and Midwife users. |
| `MamaBalance-Mobile` | Flutter mobile application for Mother and Guardian users. |
| `firebase` | Firebase-related configuration and notes. |
| `documents` | Project documentation files for report and demonstration support. |

## 3. Required Software

### 3.1 Web Application

| Software | Recommended Version |
|---|---|
| Node.js | 20 or newer |
| npm | 10 or newer |
| Browser | Latest Chrome, Edge, or Firefox |
| Firebase Project | Authentication, Firestore, Storage, and Admin SDK credentials |

### 3.2 Mobile Application

| Software | Recommended Version |
|---|---|
| Flutter SDK | Compatible with Dart SDK `^3.7.2` |
| Android Studio | Latest stable version |
| Android SDK | Android 10 or newer recommended |
| Device | Android emulator or physical Android phone |

## 4. Firebase Requirements

The project depends on Firebase services:

- Firebase Authentication
- Cloud Firestore
- Firebase Storage
- Firebase Admin SDK for server-side web API routes

The web application uses `.env.local` for Firebase and server configuration. The mobile application uses generated Firebase options and Firestore access.

Important: never commit real Firebase private keys, service account values, or production secrets into public repositories.

## 5. Install Web Application

Open PowerShell or a terminal:

```powershell
cd D:\MamaBalance-System\mamabalance-web
npm install
```

Create or verify the environment file:

```text
mamabalance-web/.env.local
```

The file should contain Firebase client configuration and server-side Firebase Admin configuration required by the API routes.

Start the development server:

```powershell
npm run dev
```

Open:

```text
http://localhost:3000
```

If testing with a physical mobile phone connected to the same backend, start the web app on all network interfaces:

```powershell
npm run dev -- --hostname 0.0.0.0
```

Then use the PC local network IP address in the mobile app API base URL.

## 6. Install Mobile Application

Open a terminal:

```powershell
cd D:\MamaBalance-System\MamaBalance-Mobile
flutter pub get
```

Check available devices:

```powershell
flutter devices
```

Run on the selected device:

```powershell
flutter run
```

If the mobile app must call the local web API server, run with:

```powershell
flutter run --dart-define=MAMABALANCE_API_BASE_URL=http://YOUR_PC_IP:3000
```

Replace `YOUR_PC_IP` with the IPv4 address of the active network adapter.

## 7. Development Commands

### Web

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Next.js development server. |
| `npm run build` | Build the production web application. |
| `npm run start` | Start the built production app. |
| `npm run lint` | Run ESLint. |

### Mobile

| Command | Purpose |
|---|---|
| `flutter pub get` | Install Flutter dependencies. |
| `flutter run` | Run the mobile app. |
| `flutter test` | Run Flutter tests. |
| `flutter build apk` | Build Android APK. |

## 8. Demo Startup Order

1. Start the web application.
2. Verify the login page opens.
3. Confirm Firebase connectivity using a valid web account.
4. Start the mobile application.
5. Log in as a mother or guardian.
6. Demonstrate web and mobile workflows using the same Firebase dataset.

## 9. Troubleshooting

### 9.1 Web App Does Not Start

Check:

- Node.js is installed.
- `npm install` completed.
- `.env.local` exists.
- Firebase values are valid.
- Port `3000` is not already in use.

### 9.2 Mobile App Cannot Connect to Backend

Check:

- The web app is running.
- The phone and PC are on the same network.
- The mobile app uses the PC IP address, not `localhost`.
- Firewall rules allow local network access.

### 9.3 Firebase Permission Errors

Check:

- Firebase Authentication user exists.
- User document exists in the `users` collection.
- User role is correct.
- Firestore rules and Admin SDK configuration are valid.

### 9.4 Biometric Unlock Does Not Work

Check:

- Device has fingerprint or face unlock configured.
- User has logged in successfully before enabling biometric unlock.
- Device supports biometric authentication.

## 10. Deployment Notes

For production or hosted demonstration:

- Host the Next.js web app on a supported Node.js hosting service.
- Configure all environment variables securely.
- Use Firebase project credentials for the intended environment.
- Build the Flutter app using the production API URL.
- Review Firebase Authentication and Firestore rules before release.
