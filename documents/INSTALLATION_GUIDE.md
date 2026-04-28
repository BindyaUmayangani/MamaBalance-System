# MamaBalance Installation Guide

## 1. Purpose

This guide explains how to install and run the MamaBalance web and mobile applications for development, testing, or final year project demonstration.

## 2. Project Structure

| Path | Description |
|---|---|
| `mamabalance-web` | Next.js web application for Superadmin, Regional Admin, Doctor, and Midwife users. It also provides the centralized backend API for the mobile app. |
| `MamaBalance-Mobile` | Flutter mobile application for Mother and Guardian users. |
| `firebase` | Firebase-related configuration, schema notes, and rules. |
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

The web application uses `.env.local` for Firebase and server configuration. The mobile application uses Firebase Auth for login/session and calls the web backend for protected app data.

Important: never commit real Firebase private keys, service account values, or production secrets into public repositories.

## 5. Web Environment Setup

Create or verify:

```text
mamabalance-web/.env.local
```

Required Firebase client variables:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=""
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=""
NEXT_PUBLIC_FIREBASE_PROJECT_ID=""
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=""
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=""
NEXT_PUBLIC_FIREBASE_APP_ID=""
```

Required Firebase Admin variables:

```env
FIREBASE_ADMIN_PROJECT_ID=""
FIREBASE_ADMIN_CLIENT_EMAIL=""
FIREBASE_ADMIN_PRIVATE_KEY=""
```

Optional SMS provider variables:

```env
NOTIFY_LK_USER_ID=""
NOTIFY_LK_API_KEY=""
NOTIFY_LK_SENDER_ID=""
```

Notes:

- `FIREBASE_ADMIN_PRIVATE_KEY` should keep newline characters as escaped `\n` values.
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` must match an existing Firebase Storage bucket if profile image upload or content file deletion is used.
- `.env.local` should be ignored by Git.

## 6. Install Web Application

Open PowerShell or a terminal:

```powershell
cd D:\MamaBalance-System\mamabalance-web
npm install
```

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

## 7. Install Mobile Application

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
flutter run --dart-define=MAMABALANCE_API_BASE_URL=http://<computer-ip>:3000
```

Replace `<computer-ip>` with the IPv4 address of the active network adapter.

## 8. Finding The PC IP Address

On Windows PowerShell:

```powershell
ipconfig
```

Use the IPv4 address of the network adapter connected to the same Wi-Fi or LAN as the phone.

Do not use `localhost` for a physical Android phone. `localhost` points to the phone itself, not the PC.

## 9. Development Commands

### Web

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Next.js development server. |
| `npm run build` | Build the production web application. |
| `npm run start` | Start the built production app. |
| `npm run lint` | Run ESLint. |
| `npm run test` | Run Vitest tests. |

### Mobile

| Command | Purpose |
|---|---|
| `flutter pub get` | Install Flutter dependencies. |
| `flutter run` | Run the mobile app. |
| `flutter test` | Run Flutter tests. |
| `flutter build apk` | Build Android APK. |

## 10. Demo Startup Order

1. Start the web application.
2. Verify the login page opens.
3. Confirm Firebase connectivity using a valid web account.
4. Confirm the web backend is reachable from the mobile device.
5. Start the mobile application using `MAMABALANCE_API_BASE_URL`.
6. Log in as a mother or guardian.
7. Demonstrate web and mobile workflows using the same Firebase dataset.

Recommended demo flow:

1. Log in as Superadmin.
2. Show user management and mother account creation.
3. Log in as Doctor or Midwife.
4. Show assigned mothers, visits/checkups, medications, and messaging.
5. Open the mobile app as a mother.
6. Show home dashboard, EPDS check-in, prescriptions, notifications, resources, profile, and messaging.

## 11. Mobile Backend Notes

The mobile app should call the web backend for protected data:

- profile
- user context
- session validation
- visits
- checkups
- prescriptions
- notifications
- educational resources
- messaging
- guardian dashboard
- weekly check-ins

Firebase Auth remains on the mobile client for login and session token generation.

## 12. Troubleshooting

### 12.1 Web App Does Not Start

Check:

- Node.js is installed.
- `npm install` completed.
- `.env.local` exists.
- Firebase values are valid.
- Port `3000` is not already in use.

### 12.2 Mobile App Cannot Connect to Backend

Check:

- The web app is running.
- The phone and PC are on the same network.
- The web app is running with `--hostname 0.0.0.0` if needed.
- The mobile app uses the PC IP address, not `localhost`.
- Firewall rules allow local network access.
- `MAMABALANCE_API_BASE_URL` includes `http://` and port `3000`.

### 12.3 Firebase Permission Or Account Errors

Check:

- Firebase Authentication user exists.
- User document exists in the `users` collection.
- User role is correct.
- User status is active.
- Mother or guardian link exists where needed.
- Firestore rules and Admin SDK configuration are valid.

### 12.4 OTP Or Email Does Not Arrive

Check:

- Email provider or Firebase mail extension is configured.
- SMS provider credentials are configured if SMS is used.
- The recipient email or phone number is correct.
- The request did not exceed configured timeout or rate limits.

### 12.5 Profile Image Upload Fails

Check:

- Firebase Storage is enabled.
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` is correct.
- The bucket exists in the Firebase project.
- Firebase Admin credentials belong to the same project.

### 12.6 Biometric Unlock Does Not Work

Check:

- Device has fingerprint or face unlock configured.
- User has logged in successfully before enabling biometric unlock.
- Device supports biometric authentication.

## 13. Deployment Notes

For production or hosted demonstration:

- Host the Next.js web app on a supported Node.js hosting service.
- Configure all environment variables securely.
- Use Firebase project credentials for the intended environment.
- Build the Flutter app using the production API URL.
- Review Firebase Authentication, Firestore rules, Storage rules, and API authorization checks before release.
- Do not expose service account keys in a public repository.
