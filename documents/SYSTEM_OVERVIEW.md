# MamaBalance System Overview

## 1. Introduction

MamaBalance is a maternal mental health monitoring and care coordination system. It combines a web application for healthcare staff and administrators with a mobile application for mothers and guardians.

The system focuses on postpartum wellbeing support through EPDS weekly check-ins, care team follow-up, medication tracking, secure messaging, educational resources, notifications, and analytics.

## 2. Problem Domain

Postpartum mothers may need regular emotional wellbeing monitoring and timely care support. Manual follow-up can be difficult when care teams manage many mothers across different regions.

MamaBalance helps by centralizing mother records, EPDS check-ins, visits, checkups, observations, medications, notifications, educational resources, and care team communication.

## 3. System Objectives

- Provide role-based access for administrators and care providers.
- Allow mothers to complete weekly EPDS check-ins through mobile.
- Help doctors and midwives identify mothers who may need closer follow-up.
- Support scheduled visits, checkups, and medical observations.
- Provide medication and prescription visibility.
- Provide educational resources for mothers and guardians.
- Provide secure communication between mothers and assigned care staff.
- Provide dashboards, analytics, and reports for decision support.
- Maintain audit logs for important administrative actions.
- Centralize mobile data access through the web backend for better control.

## 4. Main Applications

### 4.1 Web Application

Technology stack:

- Next.js 16
- React 19
- TypeScript
- Firebase Admin SDK
- Firebase client SDK
- Tailwind CSS and custom CSS
- Recharts
- jsPDF and html2canvas for reports

Main web users:

- Superadmin
- Regional Admin
- Doctor
- Midwife

The web application provides both the staff/admin user interface and the centralized backend API used by the mobile application.

### 4.2 Mobile Application

Technology stack:

- Flutter
- Dart
- Firebase Auth
- HTTP API services
- Local biometric authentication
- Firebase Storage support through backend profile image upload
- Chatbot support service

Main mobile users:

- Mother
- Guardian

The mobile application uses Firebase Authentication for login and session tokens. Protected mobile data such as profile, context, messaging, care records, check-ins, notifications, prescriptions, visits, and educational resources is requested through the `mamabalance-web` backend API.

## 5. Core Modules

| Module | Description |
|---|---|
| Authentication | Login, session handling, OTP support, password reset, role-based access. |
| User Management | Create and manage mothers, doctors, midwives, regional admins, and guardians. |
| Region Management | Create and maintain regional grouping for care administration. |
| Profile and Context | Resolve current mobile user, linked mother profile, and guardian context. |
| EPDS Check-In | Weekly EPDS assessment completed by mothers through mobile. |
| Observations | Doctor and midwife observation records for assigned mothers. |
| Visits and Checkups | Midwife visits and doctor checkups. |
| Medication Management | Doctor-prescribed care medications and medicine catalog. |
| Messaging | Secure conversations between mothers and assigned care staff. |
| Notifications | Care updates, message alerts, check-in reminders, and content notices. |
| Educational Content | Content library for mothers and guardians. |
| Analytics and Reports | Dashboards, charts, and PDF export support. |
| Audit Logs | Records of important platform changes. |
| Support Tickets | Help and support communication for web users. |

## 6. High-Level Workflow

1. Superadmin or Regional Admin creates users and assigns mothers to care staff.
2. Mother receives account information and logs into the mobile app.
3. Mobile app authenticates the mother using Firebase Authentication.
4. Mobile app sends the Firebase ID token to the web backend for protected data.
5. Mother completes weekly EPDS check-ins.
6. EPDS score and check-in data are stored in Firestore through backend-controlled workflows.
7. Doctors and midwives review assigned mothers through web dashboards.
8. Care staff create observations, visits, checkups, medications, and messages.
9. Mothers receive notifications, view prescriptions, read content, and use chatbot support.
10. Admin users review analytics, reports, audit logs, and region-level activity.

## 7. Role-Based Access Summary

| Role | Scope |
|---|---|
| Superadmin | Full platform access. |
| Regional Admin | Assigned region access. |
| Doctor | Assigned mother clinical access. |
| Midwife | Assigned mother community care access. |
| Mother | Own profile, check-ins, prescriptions, resources, messages, notifications. |
| Guardian | Linked mother summary and support information. |

## 8. Data Storage

MamaBalance uses Firebase Cloud Firestore as the primary database. Key collections include:

- `users`
- `mothers`
- `regions`
- `epdsAssessments`
- `epdsAttempts` subcollections under mothers
- `careObservations`
- `midwifeObservations`
- `midwifeVisits`
- `doctorCheckups`
- `careMedications`
- `medicines`
- `medicineSuggestions`
- `educationalContents`
- `conversations`
- `messages` subcollections under conversations
- `notifications`
- `auditLogs`
- `supportTickets`
- `guardianLinks`

Firebase Storage is used for files such as profile images and educational content assets where configured.

## 9. Backend API Approach

The `mamabalance-web` application is the main backend layer for both web and mobile.

For the mobile app:

- Firebase Auth stays on the client for login/session.
- The mobile app sends the Firebase ID token to `/api/mobile/*` routes.
- The web backend verifies the token using Firebase Admin SDK.
- The backend checks user role, status, and linked mother context.
- The backend reads and writes Firestore on behalf of the mobile app.

This approach reduces direct mobile access to Firestore business logic and keeps role validation in one place.

## 10. Security Approach

The system uses:

- Firebase Authentication for user identity.
- Server-side role validation in Next.js API routes.
- Firebase Admin SDK for privileged backend operations.
- Role-based page separation.
- Account status checks before access is granted.
- Linked mother profile validation for mobile users.
- Audit logs for important administrative actions.
- Biometric unlock for mobile session convenience.
- Separate access boundaries for mothers, guardians, doctors, midwives, regional admins, and superadmins.

## 11. Notifications and Communication

MamaBalance supports:

- web notifications for admins, doctors, and midwives
- mobile notifications for mothers and guardians
- message alerts
- check-in reminders
- care update notifications
- secure messaging between mothers and assigned care staff

Messaging is role-aware and limited to assigned relationships.

## 12. Limitations

- EPDS results support screening and monitoring, not final diagnosis.
- Chatbot output is supportive guidance, not clinical advice.
- Correct operation depends on accurate role assignment and Firebase configuration.
- Local demonstration requires proper network configuration between web and mobile.
- Firebase Storage must be configured correctly for profile image uploads and file-based resources.

## 13. Expected Outcome

MamaBalance provides a practical digital support system for maternal mental wellbeing monitoring by connecting mothers, guardians, doctors, midwives, and administrators through a shared care platform.

The expected outcome is a role-based, maintainable, and centralized system that improves follow-up visibility, supports early wellbeing monitoring, and gives mothers easier access to their care information.

