# MamaBalance System Overview

## 1. Introduction

MamaBalance is a maternal mental health monitoring and care coordination system. It combines a web application for healthcare staff and administrators with a mobile application for mothers and guardians.

The system focuses on postpartum wellbeing support through EPDS weekly check-ins, care team follow-up, medication tracking, secure messaging, educational resources, notifications, and analytics.

## 2. Problem Domain

Postpartum mothers may need regular emotional wellbeing monitoring and timely care support. Manual follow-up can be difficult when care teams manage many mothers across different regions. MamaBalance helps by centralizing mother records, EPDS check-ins, visits, checkups, observations, medications, and communication.

## 3. System Objectives

- Provide role-based access for administrators and care providers.
- Allow mothers to complete weekly EPDS check-ins through mobile.
- Help doctors and midwives identify mothers who may need closer follow-up.
- Support scheduled visits, checkups, and medical observations.
- Provide medication and prescription visibility.
- Provide educational resources for mothers and guardians.
- Provide dashboards, analytics, and reports for decision support.
- Maintain audit logs for important administrative actions.

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

### 4.2 Mobile Application

Technology stack:

- Flutter
- Dart
- Firebase Auth
- Cloud Firestore
- Firebase Storage
- Local biometric authentication
- Google Generative AI for supportive chatbot

Main mobile users:

- Mother
- Guardian

## 5. Core Modules

| Module | Description |
|---|---|
| Authentication | Login, session handling, OTP support, password reset, role-based access. |
| User Management | Create and manage mothers, doctors, midwives, regional admins, and guardians. |
| Region Management | Create and maintain regional grouping for care administration. |
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
2. Mother logs into the mobile app.
3. Mother completes weekly EPDS check-ins.
4. EPDS score and check-in data are stored in Firestore.
5. Doctors and midwives review assigned mothers through web dashboards.
6. Care staff create observations, visits, checkups, medications, and messages.
7. Mothers receive notifications, view prescriptions, read content, and use chatbot support.
8. Admin users review analytics, reports, audit logs, and region-level activity.

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

## 9. Security Approach

The system uses:

- Firebase Authentication for user identity.
- Server-side role validation in Next.js API routes.
- Firebase Admin SDK for privileged backend operations.
- Role-based page separation.
- Audit logs for important administrative actions.
- Biometric unlock for mobile session convenience.

## 10. Limitations

- EPDS results support screening and monitoring, not final diagnosis.
- Chatbot output is supportive guidance, not clinical advice.
- Correct operation depends on accurate role assignment and Firebase configuration.
- Local demonstration requires proper network configuration between web and mobile.

## 11. Expected Outcome

MamaBalance provides a practical digital support system for maternal mental wellbeing monitoring by connecting mothers, guardians, doctors, midwives, and administrators through a shared care platform.
