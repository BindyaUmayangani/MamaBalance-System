# MamaBalance System Design

## 1. Design Overview

MamaBalance uses a client-server-cloud design:

- Web client: Next.js and React.
- Mobile client: Flutter.
- Backend API: Next.js API routes inside `mamabalance-web`.
- Cloud services: Firebase Authentication, Firestore, Storage, and Admin SDK.

The design separates users by role and separates application features into role-specific web pages, mobile screens, service classes, and API route groups.

The current backend direction is centralized through the web application. The mobile app uses Firebase Authentication for login and session tokens, then calls the web backend for protected app data such as profile, user context, care data, messaging, notifications, resources, check-ins, visits, and prescriptions.

## 2. Architecture

```text
Web Browser
  |
  | HTTPS / Fetch
  v
Next.js Web App and API Routes
  |
  | Firebase Admin SDK
  v
Firebase Authentication / Firestore / Storage
  ^
  |
  | Firebase Auth session token + web API calls
  |
Flutter Mobile App
```

## 3. Web Application Design

The web app uses the Next.js App Router.

Important folders:

| Folder | Purpose |
|---|---|
| `app/api` | Server API routes. |
| `app/api/mobile` | Centralized mobile backend routes. |
| `app/superadmin` | Superadmin pages and layouts. |
| `app/regionaladmin` | Regional Admin pages and layouts. |
| `app/doctor` | Doctor pages and layouts. |
| `app/midwife` | Midwife pages and layouts. |
| `app/components` | Feature-specific shared web components. |
| `components` | Shared application components such as global toast provider and modals. |
| `lib` | Server utilities, role identity helpers, audit logging, Firebase config, auth helpers, and mobile context helpers. |

## 4. Mobile Application Design

Important folders:

| Folder | Purpose |
|---|---|
| `lib/screens` | Flutter UI screens. |
| `lib/services` | Authentication, backend API, notification, chatbot, profile, messaging, check-in, visit, and prescription services. |
| `lib/models` | Mobile data models. |
| `lib/widgets` | Reusable UI widgets. |
| `lib/config` | App configuration such as backend base URL. |
| `lib/utils` | Utility helpers such as image handling and profile initials. |
| `assets/images` | Image assets. |
| `assets/videos` | Video assets used in the home experience. |

The mobile app keeps Firebase Authentication on the client side for login and session token handling. Most application data access is routed through the `mamabalance-web` API.

## 5. Role-Based Page Design

### Superadmin

Main pages:

- Dashboard
- Region Management
- Admin Management
- User Management: Mothers, Doctors, Midwives
- Medicine Management
- Educational Content
- Analytics Reports
- Audit Logs
- Notifications
- Settings
- Help and Support

### Regional Admin

Main pages:

- Dashboard
- User Management: Mothers, Doctors, Midwives
- Medicine Management
- Educational Content
- Analytics
- Audit Logs
- Notifications
- Settings
- Help and Support

### Doctor

Main pages:

- Dashboard
- Assigned Mothers
- Medical Observation
- Upcoming Checkup
- Medication Management
- Messaging
- Analytics
- Notifications
- Settings
- Help and Support

### Midwife

Main pages:

- Dashboard
- Assigned Mothers
- High-Risk Mothers
- Observations and Visits
- Upcoming Visits
- Messaging
- Analytics
- Notifications
- Settings
- Help and Support

## 6. Mobile Screen Design

Mother features:

- Splash and intro flow
- Role selection and sign-in
- Email login with personal email
- Phone OTP login
- Forgot password with email OTP
- OTP verification
- Optional biometric unlock
- Home dashboard
- Weekly EPDS check-in
- EPDS score result and recommendations
- Chatbot support
- Secure messaging with assigned doctor or midwife
- Notifications
- Prescriptions
- Visits and checkups
- Educational resources
- Profile and profile update
- Profile picture upload and initials fallback
- Emergency contacts

Guardian features:

- Guardian login
- Guardian dashboard
- Linked mother summary
- Latest wellbeing and check-in summary
- Upcoming visits and checkups
- Care team contact information
- Notifications
- Resources
- Profile
- Emergency and care team support

## 7. API Design

API routes are grouped by role and feature:

| Group | Purpose |
|---|---|
| `/api/auth/*` | Web authentication, session, password reset, and identity lookup. |
| `/api/mobile/auth/*` | Mobile email login, OTP login, and email password reset. |
| `/api/mobile/session` | Mobile session verification. |
| `/api/mobile/context` | Current mobile user, mother, and guardian context resolution. |
| `/api/mobile/profile` | Mother profile read and update. |
| `/api/mobile/care` | Mobile care data such as visits, checkups, and prescriptions. |
| `/api/mobile/check-in` | Mobile EPDS weekly check-in workflow. |
| `/api/mobile/guardian-dashboard` | Guardian linked mother dashboard data. |
| `/api/mobile/messaging` | Secure mobile messaging with care staff. |
| `/api/mobile/notifications` | Mobile notification list and summary data. |
| `/api/mobile/resources` | Mobile educational resources. |
| `/api/admin/*` | User, region, content, medicine, and mother summary administration. |
| `/api/superadmin/*` | Superadmin dashboard, analytics, and notifications. |
| `/api/regionaladmin/*` | Regional dashboard, analytics, and notifications. |
| `/api/doctor/*` | Doctor mothers, observations, checkups, medications, messaging, notifications. |
| `/api/midwife/*` | Midwife mothers, observations, visits, medications, messaging, notifications. |
| `/api/settings` | Role settings and notification preferences. |
| `/api/audit-logs` | Audit log retrieval. |
| `/api/support/tickets` | Help and support ticket management. |

## 8. Authentication and Authorization Design

The web app uses Firebase Authentication and server-side role validation. API routes check the authenticated actor and role before returning data or performing mutations.

The mobile app uses Firebase Authentication for:

- email/password login
- phone OTP login
- Firebase ID token generation
- session restore

After authentication, the mobile app sends the Firebase ID token to the web backend. The backend verifies the token using Firebase Admin SDK, resolves the user document, checks account status, checks role permissions, and resolves the linked mother profile.

Mobile access is limited to mother and guardian roles. Staff users use the web portal.

## 9. Mobile Backend Data Flow

```text
1. Mother or guardian signs in on mobile.
2. Firebase Auth returns a signed-in user.
3. Mobile app gets the Firebase ID token.
4. Mobile app calls a protected /api/mobile route.
5. Web backend verifies the token.
6. Web backend resolves user, role, status, and linked mother profile.
7. Web backend reads or writes Firestore using Firebase Admin SDK.
8. Mobile app receives a controlled JSON response.
```

This design prevents the mobile app from directly controlling Firestore business logic for core features.

## 10. Messaging Design

Messaging supports secure communication between mothers and assigned care team members.

Messaging design includes:

- conversation documents for mother-doctor and mother-midwife threads
- message subcollections
- encrypted message payload fields
- sender role tracking
- read status timestamps
- local time display in the mobile app
- role-based conversation access

The mobile app calls `/api/mobile/messaging`, and the web backend validates that the requested conversation belongs to the signed-in mother or guardian context.

## 11. Notification Design

Notifications are stored in Firestore and built for different audiences:

- Superadmin notifications
- Regional Admin notifications
- Doctor notifications
- Midwife notifications
- Mother notifications
- Guardian notifications

Some role-specific notification state collections are used to track read or dismiss state without changing the original source event.

Mobile notifications are exposed through `/api/mobile/notifications`.

## 12. Profile and User Context Design

Mobile profile and context data are handled through:

- `/api/mobile/session`
- `/api/mobile/context`
- `/api/mobile/profile`

The backend resolves whether the authenticated mobile user is a mother or guardian. For mothers, it resolves their own mother record. For guardians, it resolves the linked mother record.

Profile updates are submitted to the backend so the backend can update both relevant user and mother records consistently.

Profile image upload is handled separately from normal profile text updates. Normal profile saves do not trigger Firebase Storage upload.

## 13. Toast Feedback Design

The web app includes a global `ToastProvider`. It wraps the root layout and intercepts successful mutating API calls.

Toast behavior:

- `POST`: created message
- `PUT`, `PATCH`, or `type=update`: updated message
- `DELETE` or `type=delete`: deleted message

Visual design:

- Create: green
- Update: blue
- Delete: red

The mobile app uses Snackbars and inline states for success and error feedback.

## 14. Reporting Design

Report generation uses:

- `html2canvas`
- `jspdf`
- `jspdf-autotable`

Analytics pages and mother summary pages can generate PDF output where implemented.

## 15. Error Handling Design

The system uses:

- API error responses with status codes.
- Client-side validation in forms.
- Alert or inline error messages in older pages.
- Success toast notifications for successful web mutations.
- Snackbars in the Flutter mobile app.
- Timeout and connection messages for mobile backend calls.

## 16. Design Considerations

- Role separation keeps workflows easier to understand.
- The web backend centralizes business logic and mobile data access.
- Firebase provides rapid development for authentication and data storage.
- Firestore collections are shared between web and backend services for consistent care data.
- Mobile UI prioritizes simple wellbeing workflows.
- Web UI prioritizes dense management, tables, filters, reports, and repeated administrative tasks.
- Sensitive mother data is protected using role checks, account status checks, and linked profile resolution.

