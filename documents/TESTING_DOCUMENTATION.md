# MamaBalance Testing Documentation

## 1. Purpose

This document describes the testing approach used for the MamaBalance system. It covers manual testing and automated testing for both applications:

- Web application: staff portal for Superadmin, Regional Admin, Doctor, and Midwife users.
- Mobile application: Flutter app for Mothers and Guardians.

Testing was performed to verify authentication, role-based access, care workflows, clinical data handling, notifications, secure messaging, and user interface behavior.

## 2. Testing Strategy

MamaBalance uses two main testing approaches:

| Testing Type | Purpose |
|---|---|
| Manual Testing | Confirms full user workflows from the user point of view. |
| Unit Testing | Verifies small functions, models, helpers, and isolated UI components. |
| Integration Testing | Verifies that multiple parts of the system work together, such as API routes with mocked Firebase behavior. |
| Widget Testing | Verifies Flutter UI widgets and screen interactions. |

The automated tests avoid using a live Firebase project. Firebase behavior is mocked where needed, which makes the test suites safer, faster, and repeatable.

## 3. Manual Testing

Manual testing was used to verify real application behavior through the web browser and mobile app.

### 3.1 Web Application Manual Tests

| Test Area | Manual Test Scenario | Expected Result |
|---|---|---|
| Staff Login | Login with valid staff credentials. | User is redirected to the correct role dashboard. |
| Invalid Login | Login with wrong email or password. | Error message is displayed and access is blocked. |
| Role Access | Doctor, Midwife, Regional Admin, and Superadmin open role dashboards. | Each role only sees allowed pages and actions. |
| User Management | Admin creates, edits, views, and deletes users. | User records update correctly in the system. |
| Assigned Mothers | Doctor opens assigned mothers page. | Only assigned mothers are displayed. |
| High-Risk Mothers | Midwife opens high-risk mothers page. | High-risk mothers are listed correctly. |
| Visits | Midwife creates and reschedules a visit. | Visit appears with correct date, time, status, and notes. |
| Observations | Doctor or midwife creates an observation. | Observation is saved and visible in the related mother record. |
| Medication | Doctor adds, updates, and stops medication. | Medication status and history update correctly. |
| Messaging | Doctor or midwife sends a secure message. | Conversation updates and message appears for the receiver. |
| Notifications | Staff opens notifications and marks them as read. | Unread counts and read state update correctly. |
| Reports | Admin exports PDF reports. | PDF is generated with the expected report data. |
| Settings | User updates profile image or settings. | Updated details are saved and shown after reload. |

### 3.2 Mobile Application Manual Tests

| Test Area | Manual Test Scenario | Expected Result |
|---|---|---|
| Account Selection | Select Mother or Guardian account. | App navigates to the correct sign-in flow. |
| Mother Login | Mother signs in using valid email or phone OTP. | Mother home screen opens. |
| Guardian Login | Guardian signs in using phone OTP. | Guardian dashboard opens. |
| EPDS Check-In | Mother completes weekly EPDS questionnaire. | Score and risk level are calculated and saved. |
| Weekly Lock | Mother tries to submit another EPDS check-in before seven days. | App blocks the check-in until the next available date. |
| Notifications | Mother opens alerts tab. | Messages, visits, checkups, resources, and reminders appear. |
| Chat | Mother sends and receives messages with care team. | Conversation updates correctly. |
| Prescriptions | Mother opens prescriptions page. | Active and historical medications are visible. |
| Profile | Mother views and edits profile details. | Profile information updates correctly. |
| Guardian View | Guardian views linked mother summary. | Linked mother details, care team, visits, and alerts are shown. |

## 4. Automated Testing

Automated tests were added for both the web and mobile applications.

### 4.1 Web Automated Tests

Frameworks and tools:

- Vitest
- React Testing Library
- jsdom
- Firebase Admin mocks

Run command:

```bash
cd mamabalance-web
npm test
```

Current result:

```text
16 test files
61 tests passing
```

#### 4.1.1 Web Unit Tests

| Test File | Coverage |
|---|---|
| `lib/admin/format.test.ts` | Date formatting, username generation, role user IDs, temporary passwords. |
| `lib/auth/types.test.ts` | Staff role detection and role dashboard paths. |
| `lib/messaging/encryption.test.ts` | Message encryption, decryption, legacy fallback, tampered payload handling. |
| `lib/doctor/identity.test.ts` | Linked doctor UID resolution and chunked Firestore loading. |
| `lib/midwife/identity.test.ts` | Linked midwife UID resolution and assigned mother loading. |
| `components/admin/LoadingState.test.tsx` | Loading and error UI states. |
| `components/common/modals/ModalBase.test.tsx` | Modal accessibility, scroll lock, and close behavior. |

#### 4.1.2 Web Integration Tests

| Test File | Coverage |
|---|---|
| `app/api/auth/session/route.integration.test.ts` | Staff session creation, session cookie, role dashboard redirect, blocked non-staff users. |
| `app/api/auth/me/route.integration.test.ts` | Current user lookup, region name resolution, profile media update. |
| `app/api/auth/resolve-login-email/route.integration.test.ts` | Personal email to login email resolution using mocked Firebase. |
| `app/api/doctor/mothers/route.integration.test.ts` | Doctor role guard and assigned high-risk mother mapping. |
| `app/api/midwife/mothers/route.integration.test.ts` | Midwife role guard, assigned mothers, doctor options, doctor assignment. |
| `app/api/doctor/medications/route.integration.test.ts` | Doctor medication update and stop workflows with audit logging. |
| `app/api/midwife/visits/route.integration.test.ts` | Visit creation, ownership checks, rescheduling, and audit logging. |
| `app/api/doctor/observations/route.integration.test.ts` | Doctor observation creation, update, and permission checks. |
| `app/api/doctor/messaging/route.integration.test.ts` | Secure messaging validation, assignment checks, transaction writes, encrypted payload storage. |

### 4.2 Mobile Automated Tests

Frameworks and tools:

- Flutter Test
- Widget testing
- SharedPreferences test mocks

Run command:

```bash
cd MamaBalance-Mobile
flutter test
```

Current result:

```text
23 tests passing
```

#### 4.2.1 Mobile Unit Tests

| Test File | Coverage |
|---|---|
| `test/models/app_session_test.dart` | Mobile role parsing, role labels, home routes, mobile-user checks. |
| `test/models/mother_profile_test.dart` | Mother profile first name fallback and copy behavior. |
| `test/services/auth_service_test.dart` | Phone number normalization and OTP cooldown handling. |
| `test/services/weekly_checkin_service_test.dart` | Seven-day EPDS check-in availability calculation. |
| `test/services/notification_service_test.dart` | Unread message counts, unread notification counts, important count, today count. |
| `test/utils/image_utils_test.dart` | Profile image fallback, base64 image handling, network image handling. |

#### 4.2.2 Mobile Widget and Integration-Style Tests

| Test File | Coverage |
|---|---|
| `test/widgets/otp_code_field_test.dart` | OTP input rendering, digit entry, non-digit rejection, backspace behavior. |
| `test/widgets/bottom_nav_bar_test.dart` | Bottom navigation labels, unread badges, tap callbacks. |
| `test/integration/account_role_navigation_test.dart` | Mother and Guardian account selection navigation flow. |

The mobile navigation test is stored under `test/integration` so it runs with the normal `flutter test` command. This avoids requiring a device target for a simple navigation workflow.

## 5. Test Results Summary

| Application | Test Command | Result |
|---|---|---|
| Web staff application | `npm test` | 61 tests passing |
| Mobile application | `flutter test` | 23 tests passing |

Combined automated coverage:

```text
84 automated tests passing
```

## 6. Key Quality Areas Covered

The automated and manual tests cover the most important system risks:

- Authentication and session handling
- Staff role-based access
- Mother and guardian mobile role handling
- Doctor and midwife assignment boundaries
- EPDS weekly check-in timing
- High-risk mother workflows
- Visit scheduling and rescheduling
- Doctor observation workflows
- Medication update and stop workflows
- Notification summary counts
- Secure messaging and encrypted message storage
- Shared UI components and form behavior

## 7. Remaining Testing Improvements

The current test coverage is strong for project evaluation. Future production-level improvements could include:

- End-to-end browser testing with Playwright for the web application.
- Firebase emulator tests for Firestore security rules.
- More mobile screen tests for EPDS questionnaire scoring UI.
- Chat screen rendering tests for mobile conversations.
- Profile update form validation tests.
- Full role-permission matrix tests for every web API route.

## 8. Conclusion

MamaBalance includes both manual and automated testing. Manual testing confirms that real user workflows operate correctly, while automated tests provide repeatable verification of core business logic, role-based access, UI components, and important integration workflows.

The current automated test suites verify both applications successfully:

- Web staff application: 61 passing tests.
- Mobile application: 23 passing tests.
- Total: 84 passing automated tests.
