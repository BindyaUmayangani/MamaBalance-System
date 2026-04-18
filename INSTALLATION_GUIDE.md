# Installation Guide

## 1. Introduction
This document explains how to install and prepare the MamaBalance system for demonstration. The system includes:

- a web application for `Superadmin`, `Regional Admin`, `Doctor`, and `Midwife`
- a Flutter mobile application for `Mother`

The guide covers minimum platform requirements, required software, setup steps, and demo startup instructions.

## 2. Minimum Platform Specification

### 2.1 Web Application

| Item | Minimum Requirement |
|---|---|
| Operating System | Windows 10/11, macOS, or Linux |
| Processor | Intel Core i3 / AMD equivalent |
| RAM | 8 GB |
| Storage | At least 2 GB free space |
| Browser | Latest Google Chrome or Microsoft Edge |
| Runtime | Node.js 20+ and npm 10+ |
| Network | Internet connection for Firebase services |

### 2.2 Mobile Application

| Item | Minimum Requirement |
|---|---|
| Operating System | Android 10+ |
| RAM | 4 GB recommended |
| Storage | At least 2 GB free space |
| Runtime | Flutter SDK 3.7+ |
| Tools | Android Studio or VS Code with Flutter extension |
| Device | Android emulator or physical Android phone |
| Network | Same network as the web/backend host for local demo |
| Biometrics | Fingerprint or face unlock configured for biometric demo |

## 3. Required Software and Services
Before running the system, ensure the following are available:

- Node.js
- npm
- Flutter SDK
- Android SDK / Android Studio
- Firebase project configuration
- Internet access for Firebase Authentication, Firestore, and Storage

## 4. Project Structure

| Folder | Purpose |
|---|---|
| `mamabalance-web` | Next.js web application |
| `MamaBalance-Mobile` | Flutter mobile application |
| `firebase` | Firebase-related configuration and documentation |

## 5. Web Application Installation

### 5.1 Open the Web Project
Open a terminal and move into the web application folder:

```powershell
cd D:\MamaBalance-System\mamabalance-web
```

### 5.2 Install Dependencies
Install the required Node.js packages:

```powershell
npm install
```

### 5.3 Configure Environment Variables
Ensure the following file exists:

```text
mamabalance-web/.env.local
```

This file should contain the required Firebase and backend configuration values for the demonstration environment.

### 5.4 Start the Web Application
Run the development server:

```powershell
npm run dev -- --hostname 0.0.0.0
```

### 5.5 Open the Application
Open the system in a browser:

```text
http://localhost:3000
```

If the mobile app will use the same local host, note the PC LAN IP address and use that IP in the mobile launch command.

## 6. Mobile Application Installation

### 6.1 Open the Mobile Project
Open a terminal and move into the mobile application folder:

```powershell
cd D:\MamaBalance-System\MamaBalance-Mobile
```

### 6.2 Install Flutter Dependencies
Run:

```powershell
flutter pub get
```

### 6.3 Connect an Android Device
Use either:

- a physical Android phone
- an Android emulator

### 6.4 Find the Host Machine IP Address
If using a real phone, find the PC LAN IP:

```powershell
ipconfig
```

Use the IPv4 address of the active adapter.

### 6.5 Run the Mobile Application
Start the Flutter app with the same backend host used by the web application:

```powershell
flutter run --dart-define=MAMABALANCE_API_BASE_URL=http://YOUR_PC_IP:3000
```

Example:

```powershell
flutter run --dart-define=MAMABALANCE_API_BASE_URL=http://192.168.1.5:3000
```

### 6.6 Run on a Specific Device
If more than one device is connected:

```powershell
flutter devices
flutter run -d DEVICE_ID --dart-define=MAMABALANCE_API_BASE_URL=http://YOUR_PC_IP:3000
```

## 7. Recommended Demonstration Startup Sequence
For a complete demonstration, use the following order:

1. Start the web application.
2. Confirm the web system opens successfully in the browser.
3. Start the mobile application with the same backend IP.
4. Log in to the required web role.
5. Log in to the mother mobile app.

## 8. Special Setup for Biometric Demonstration
To demonstrate biometric quick unlock on mobile:

1. Use a physical Android device if possible.
2. Ensure fingerprint or face unlock is already configured in device settings.
3. Log in once with OTP.
4. Enable biometric quick unlock when prompted.
5. Close and reopen the app to demonstrate fingerprint or face unlock.

Important:

- biometric quick unlock does not replace full authentication
- it only unlocks an already authenticated saved session

## 9. Troubleshooting

### 9.1 Web Application Does Not Start
Check the following:

- `npm install` completed successfully
- `.env.local` exists in `mamabalance-web`
- Node.js version is compatible

### 9.2 Mobile App Cannot Reach Backend
Check the following:

- the web application is running
- the correct `MAMABALANCE_API_BASE_URL` is used
- the phone and PC are on the same network
- `127.0.0.1` is not used on a real phone

### 9.3 Biometric Prompt Does Not Appear
Check the following:

- fingerprint or face unlock is already enrolled on the phone
- the app has been rebuilt and rerun
- the test is being performed on a compatible device

### 9.4 Firebase Errors
Check the following:

- Firebase configuration is valid
- internet connection is available
- the intended Firebase environment is being used

## 10. Conclusion
The MamaBalance system can be installed and demonstrated using a standard development laptop and an Android device. The web application supports administrative and care-team workflows, while the mobile application supports mothers through OTP login, biometric quick unlock, chatbot support, check-ins, and notifications.
