# MamaBalance Testing Documentation

## 1. Purpose

This document describes the testing approach used for the MamaBalance system. It covers manual testing and automated testing for both applications:

- Web application: staff portal for Superadmin, Regional Admin, Doctor, and Midwife users.
- Mobile application: Flutter app for Mothers and Guardians.

Testing was performed to verify authentication, role-based access, care workflows, clinical data handling, notifications, secure messaging, mobile backend access, and user interface behavior.

## 2. Testing Strategy

MamaBalance uses four main testing approaches:

| Testing Type | Purpose |
|---|---|
| Manual Testing | Confirms complete user workflows from the user point of view. |
| Unit Testing | Verifies small functions, models, helpers, and isolated UI components. |
| Integration Testing | Verifies that multiple parts of the system work together, such as API routes with mocked Firebase behavior. |
| Widget Testing | Verifies Flutter UI widgets and screen interactions. |

The automated tests avoid using a live Firebase project. Firebase behavior is mocked where needed, which makes the test suites safer, faster, and repeatable.

## 3. Manual Testing Summary

Manual testing was used to confirm the most important real user workflows through the browser and Android mobile app. The full set of individual test cases was not included in this document to keep the final project documentation readable; instead, the table below summarizes the main areas tested and passed.

| Test Area | Important Manual Scenarios Covered | Result |
|---|---|---|
| Authentication and Session Security | Staff email login, mother email/OTP login, guardian OTP login, invalid login, inactive account blocking, logout, forgot password, and protected page access. | Pass |
| Role-Based Access and Data Privacy | Superadmin, Regional Admin, Doctor, Midwife, Mother, and Guardian access boundaries were checked, including restricted URL access and assigned/linked user data visibility. | Pass |
| User, Region, Content, and Medicine Management | Admin workflows for creating, updating, viewing, deleting, searching, and filtering users, regions, educational resources, and medicine catalog records were tested. | Pass |
| Care Coordination Workflows | Mother creation with personal email, doctor and midwife assignment, observations, visits, checkups, prescriptions, high-risk mother handling, and patient summary reports were tested. | Pass |
| Mobile Mother and Guardian Workflows | Home dashboard, EPDS weekly check-in, score display, weekly lock, prescriptions, care schedule, educational resources, profile update, profile image success message, initials fallback, and guardian linked mother summary were tested. | Pass |
| Messaging, Notifications, and Chatbot | Secure staff-mother messaging, unread counts, timestamp display, new mother chat access, role notifications, mobile alerts, and AI chatbot access were tested. | Pass |
| Backend and API Access | Centralized web backend routes for mobile profile, context, care data, messaging, notifications, and resources were tested with valid and invalid access conditions. | Pass |
| Audit, Reports, Feedback, and UI Behavior | Audit log creation, analytics and PDF export, success toasts/modals, loading states, error states, empty states, browser compatibility, and responsive layouts were tested. | Pass |

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

Automated coverage includes unit tests and route integration tests.

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

#### 4.2.1 Mobile Unit Tests

| Test File | Coverage |
|---|---|
| `test/models/app_session_test.dart` | Mobile role parsing, role labels, home routes, mobile-user checks. |
| `test/models/mother_profile_test.dart` | Mother profile first name fallback and copy behavior. |
| `test/services/auth_service_test.dart` | Phone number normalization and OTP cooldown handling. |
| `test/services/weekly_checkin_service_test.dart` | Seven-day EPDS check-in availability calculation. |
| `test/services/notification_service_test.dart` | Unread message counts, unread notification counts, important count, today count. |
| `test/utils/image_utils_test.dart` | Profile image fallback, base64 image handling, network image handling, and initials fallback. |

#### 4.2.2 Mobile Widget and Integration-Style Tests

| Test File | Coverage |
|---|---|
| `test/widgets/otp_code_field_test.dart` | OTP input rendering, digit entry, non-digit rejection, backspace behavior. |
| `test/widgets/bottom_nav_bar_test.dart` | Bottom navigation labels, unread badges, tap callbacks. |
| `test/integration/account_role_navigation_test.dart` | Mother and Guardian account selection navigation flow. |

The mobile navigation test is stored under `test/integration` so it can run with the normal `flutter test` command. This avoids requiring a device target for a simple navigation workflow.

## 5. Automated Test Execution Notes

The automated test suites are designed to run with:

```bash
cd mamabalance-web
npm test
```

and:

```bash
cd MamaBalance-Mobile
flutter test
```

During local verification in the current Windows environment, the web Vitest runner failed before executing tests because Vite could not load the config due to a Windows `spawn EPERM` startup error. The Flutter test command was also interrupted before completion. This appears to be an environment/tooling issue rather than a test assertion failure.

For final submission, run the commands again in a clean terminal with antivirus or permission restrictions checked, then record the final passing counts below.

| Application | Test Command | Latest Local Status |
|---|---|---|
| Web staff application | `npm test` | Blocked by local `spawn EPERM` before test execution in this session. |
| Mobile application | `flutter test` | Interrupted before completion in this session. |

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
- Mobile profile initials and profile image behavior
- Mobile backend session, context, and protected route behavior

## 7. Remaining Testing Improvements

The current test coverage is suitable for project evaluation. Future production-level improvements could include:

- End-to-end browser testing with Playwright for the web application.
- Firebase emulator tests for Firestore and Storage security rules.
- More mobile screen tests for EPDS questionnaire scoring UI.
- Chat screen rendering tests for mobile conversations.
- Profile update form validation tests.
- Full role-permission matrix tests for every web API route.
- Automated tests for `/api/mobile/*` routes added during the centralized backend migration.
- Device-based integration tests for biometric unlock and real notification behavior.

## 8. Conclusion

MamaBalance includes both manual and automated testing. Manual testing confirms that real user workflows operate correctly, while automated tests provide repeatable verification of core business logic, role-based access, UI components, and important integration workflows.

The web manual tests passed across staff roles and core workflows. The mobile manual tests passed across mother and guardian workflows. Automated test suites are present for both applications and should be re-run in a clean local environment before final submission to record final pass counts.
