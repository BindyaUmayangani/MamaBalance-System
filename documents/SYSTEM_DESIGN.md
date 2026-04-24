# MamaBalance System Design

## 1. Design Overview

MamaBalance uses a client-server-cloud design:

- Web client: Next.js and React.
- Mobile client: Flutter.
- Backend API: Next.js API routes.
- Cloud services: Firebase Authentication, Firestore, Storage, and Admin SDK.

The design separates users by role and separates application features into role-specific web pages, mobile screens, service classes, and API route groups.

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
Flutter Mobile App
  |
  | Firebase Client SDK + selected web API calls
```

## 3. Web Application Design

The web app uses the Next.js App Router.

Important folders:

| Folder | Purpose |
|---|---|
| `app/api` | Server API routes. |
| `app/superadmin` | Superadmin pages and layouts. |
| `app/regionaladmin` | Regional Admin pages and layouts. |
| `app/doctor` | Doctor pages and layouts. |
| `app/midwife` | Midwife pages and layouts. |
| `app/components` | Feature-specific shared web components. |
| `components` | Shared application components such as global toast provider. |
| `lib` | Server utilities, role identity helpers, audit logging, Firebase config. |

## 4. Mobile Application Design

Important folders:

| Folder | Purpose |
|---|---|
| `lib/screens` | Flutter UI screens. |
| `lib/services` | Firebase, authentication, notification, chatbot, profile, messaging, and check-in services. |
| `lib/models` | Mobile data models. |
| `lib/widgets` | Reusable UI widgets. |
| `assets/images` | Image assets. |
| `assets/videos` | Video assets used in the home experience. |

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
- OTP verification
- Home dashboard
- Weekly check-in
- EPDS score result
- Chatbot support
- Secure messaging
- Notifications
- Prescriptions
- Educational resources
- Profile and profile update
- Emergency contacts

Guardian features:

- Guardian dashboard
- Linked mother summary
- Notifications
- Resources
- Profile
- Emergency and care team support

## 7. API Design

API routes are grouped by role and feature:

| Group | Purpose |
|---|---|
| `/api/auth/*` | Web authentication, session, password reset, identity lookup. |
| `/api/mobile/auth/otp` | Mobile OTP request and verification. |
| `/api/admin/*` | User, region, content, medicine, and mother summary administration. |
| `/api/superadmin/*` | Superadmin dashboard, analytics, and notifications. |
| `/api/regionaladmin/*` | Regional dashboard, analytics, and notifications. |
| `/api/doctor/*` | Doctor mothers, observations, checkups, medications, messaging, notifications. |
| `/api/midwife/*` | Midwife mothers, observations, visits, medications, messaging, notifications. |
| `/api/settings` | Role settings and notification preferences. |
| `/api/audit-logs` | Audit log retrieval. |
| `/api/support/tickets` | Help and support ticket management. |

## 8. Authentication and Authorization Design

The web app uses Firebase Authentication and server session handling. API routes check the authenticated actor and role before returning data or performing mutations.

The mobile app uses Firebase Authentication and mobile services to resolve the current mother or guardian context. Some mobile login flows use the web API for OTP support.

## 9. Notification Design

Notifications are stored in Firestore and built for different audiences:

- Superadmin notifications
- Regional Admin notifications
- Doctor notifications
- Midwife notifications
- Mother notifications
- Guardian notifications

Some role-specific notification state collections are used to track read or dismiss state without changing the original source event.

## 10. Toast Feedback Design

The web app includes a global `ToastProvider`. It wraps the root layout and intercepts successful mutating API calls.

Toast behavior:

- `POST`: created message
- `PUT`, `PATCH`, or `type=update`: updated message
- `DELETE` or `type=delete`: deleted message

Visual design:

- Create: green
- Update: blue
- Delete: red

## 11. Reporting Design

Report generation uses:

- `html2canvas`
- `jspdf`
- `jspdf-autotable`

Analytics pages and mother summary pages can generate PDF output where implemented.

## 12. Error Handling Design

The system uses:

- API error responses with status codes.
- Client-side validation in forms.
- Alert or inline error messages in older pages.
- Success toast notifications for successful web mutations.
- Snackbars in the Flutter mobile app.

## 13. Design Considerations

- Role separation keeps workflows easier to understand.
- Firebase provides rapid development for authentication and real-time data storage.
- Firestore collections are shared between web and mobile for consistent care data.
- Mobile UI prioritizes simple wellbeing workflows.
- Web UI prioritizes dense management, tables, filters, and reports.
