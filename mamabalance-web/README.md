# MamaBalance Web

MamaBalance Web is the administration portal and centralized backend API for the MamaBalance maternal care system. It is used by administrators, doctors, and midwives, and it also exposes protected mobile API routes used by the Flutter app.

## Purpose

This project handles:

- Web portal access for super admins, regional admins, doctors, and midwives.
- Mother, guardian, staff, and region management.
- Educational content and notification management.
- Doctor and midwife care workflows.
- Mobile backend APIs for profile, session, context, messaging, care, check-ins, notifications, and resources.
- Firebase Admin access to Firestore, Authentication, and Storage.

## Tech Stack

- Next.js
- React
- TypeScript
- Firebase Admin SDK
- Firebase Authentication
- Firestore
- Firebase Storage
- Recharts
- Vitest
- ESLint

## Project Structure

```text
mamabalance-web/
+-- app/                 # Next.js app routes and pages
|   +-- api/             # Backend API routes
+-- components/          # Shared UI components
+-- lib/                 # Auth, Firebase, admin, and mobile helpers
+-- scripts/             # Utility scripts
+-- public/              # Static assets
+-- package.json
+-- README.md
```

## Important API Areas

```text
app/api/mobile/
+-- auth/
+-- care/
+-- check-in/
+-- context/
+-- guardian-dashboard/
+-- messaging/
+-- notifications/
+-- profile/
+-- resources/
+-- session/
```

The mobile app uses Firebase Auth only to obtain a session token. All protected mobile data requests are sent to these web backend routes.

## Environment Variables

Create `.env.local` in this folder.

```env
NEXT_PUBLIC_FIREBASE_API_KEY=""
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=""
NEXT_PUBLIC_FIREBASE_PROJECT_ID=""
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=""
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=""
NEXT_PUBLIC_FIREBASE_APP_ID=""

FIREBASE_ADMIN_PROJECT_ID=""
FIREBASE_ADMIN_CLIENT_EMAIL=""
FIREBASE_ADMIN_PRIVATE_KEY=""

NOTIFY_LK_USER_ID=""
NOTIFY_LK_API_KEY=""
NOTIFY_LK_SENDER_ID=""
```

Do not commit `.env.local`.

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Default local URL:

```text
http://localhost:3000
```

When testing with a real mobile device, use the computer's local network IP address as the mobile backend URL.

## Production Build

```bash
npm run build
npm run start
```

## Linting

```bash
npm run lint
```

## Testing

```bash
npm run test
```

## Mobile Backend Notes

- Every protected mobile route expects `Authorization: Bearer <firebase-id-token>`.
- The backend validates the token using Firebase Admin.
- The backend resolves the user role and linked mother profile before returning data.
- Chatbot behavior is intentionally separate from the central mobile backend migration.

## Related Folders

- `../MamaBalance-Mobile/` - Flutter mobile app.
- `../documents/` - final year project documentation.
- `../firebase/` - Firebase rules and schema notes.
