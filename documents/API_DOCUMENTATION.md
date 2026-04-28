# MamaBalance API Documentation

## 1. Overview

The MamaBalance web application uses Next.js API routes under:

```text
mamabalance-web/app/api
```

These routes provide server-side access to Firebase using the Firebase Admin SDK. Most protected routes validate the current authenticated actor and role before returning or modifying data.

The Flutter mobile app uses Firebase Authentication for login/session tokens, then calls protected `/api/mobile/*` routes in `mamabalance-web` for application data.

## 2. Authentication

Web authentication uses Firebase Authentication and application session handling. Mobile authentication uses Firebase Authentication plus backend-supported login and OTP flows.

Common response pattern:

- Success: JSON data with HTTP `200`, `201`, or equivalent success status.
- Failure: JSON object containing `error` and an HTTP error status.

Protected mobile routes expect:

```http
Authorization: Bearer <firebase-id-token>
Accept: application/json
```

Mutating JSON routes generally use:

```http
Content-Type: application/json
```

## 3. API Route Summary

### 3.1 Authentication Routes

| Endpoint | Methods | Purpose |
|---|---|---|
| `/api/auth/session` | `POST`, `DELETE` | Create or clear web session. |
| `/api/auth/me` | `GET`, `PATCH` | Fetch or update current authenticated web user profile. |
| `/api/auth/logout` | `POST` | Log out current user. |
| `/api/auth/forgot-password` | `POST` | Start forgot password flow. |
| `/api/auth/password-reset-otp` | `POST`, `PATCH`, `PUT` | Request, verify, and complete password reset OTP flow for web users. |
| `/api/auth/resolve-login-email` | `POST` | Resolve login email for supported login identifiers. |
| `/api/mobile/auth/email-login` | `POST` | Mobile personal email login for mothers. |
| `/api/mobile/auth/email-password-reset` | `POST`, `PATCH`, `PUT` | Request, verify, and complete mother email OTP password reset. |
| `/api/mobile/auth/otp` | `POST`, `PATCH` | Request and verify mobile phone OTP login. |

### 3.2 Mobile Backend Routes

| Endpoint | Methods | Purpose |
|---|---|---|
| `/api/mobile/session` | `GET` | Validate current mobile session and role. |
| `/api/mobile/context` | `GET` | Resolve current mobile user, mother profile, and guardian link context. |
| `/api/mobile/profile` | `GET`, `PATCH` | Fetch or update mother profile data. |
| `/api/mobile/check-in` | `GET`, `POST` | Fetch check-in state and submit EPDS check-in. |
| `/api/mobile/care` | `GET` | Fetch mobile care data such as visits, checkups, and prescriptions. |
| `/api/mobile/guardian-dashboard` | `GET` | Fetch linked mother dashboard for guardian users. |
| `/api/mobile/messaging` | `GET`, `POST`, `PATCH` | Fetch chat options/messages, send messages, and mark conversation read. |
| `/api/mobile/notifications` | `GET`, `PATCH` | Fetch mobile notifications and update read/dismiss state. |
| `/api/mobile/resources` | `GET` | Fetch published educational resources for mobile users. |
| `/api/mobile/chatbot` | `POST` | Chatbot support route where configured. |

Mobile backend routes verify the Firebase ID token, resolve the Firestore user, check account status, and validate the linked mother profile before returning protected data.

### 3.3 Admin Routes

| Endpoint | Methods | Purpose |
|---|---|---|
| `/api/admin/users` | `GET`, `POST`, `PATCH`, `DELETE` | Manage users including mothers, doctors, midwives, admins, guardians, and phone auth provisioning. |
| `/api/admin/regions` | `GET`, `POST`, `DELETE` | Manage regions. |
| `/api/admin/content` | `GET`, `POST`, `PATCH`, `DELETE` | Manage educational content. |
| `/api/admin/medicines` | `GET`, `POST`, `PATCH`, `DELETE` | Manage medicine catalog records. |
| `/api/admin/medicine-suggestions` | `GET`, `PATCH` | Review or update doctor medicine suggestions. |
| `/api/admin/mothers/[uid]` | `GET` | Fetch full mother summary by UID. |

### 3.4 Superadmin Routes

| Endpoint | Methods | Purpose |
|---|---|---|
| `/api/superadmin/dashboard` | `GET` | Fetch platform dashboard summary. |
| `/api/superadmin/analytics` | `GET` | Fetch platform analytics data. |
| `/api/superadmin/notifications` | `GET`, `PATCH` | Fetch and update superadmin notifications. |

### 3.5 Regional Admin Routes

| Endpoint | Methods | Purpose |
|---|---|---|
| `/api/regionaladmin/dashboard` | `GET` | Fetch regional dashboard summary. |
| `/api/regionaladmin/analytics` | `GET` | Fetch regional analytics data. |
| `/api/regionaladmin/notifications` | `GET`, `PATCH` | Fetch and update regional notifications. |

### 3.6 Doctor Routes

| Endpoint | Methods | Purpose |
|---|---|---|
| `/api/doctor/mothers` | `GET` | Fetch assigned mothers for the doctor. |
| `/api/doctor/mothers/[uid]/summary` | `GET` | Fetch assigned mother summary. |
| `/api/doctor/observations` | `GET`, `POST`, `PATCH` | List, create, and update doctor observations. |
| `/api/doctor/checkups` | `GET`, `POST`, `PATCH`, `DELETE` | List, create, update, and delete doctor checkups. |
| `/api/doctor/medications` | `GET`, `POST`, `PATCH`, `DELETE` | List, create, update, stop, or delete medication records and medicine suggestions. |
| `/api/doctor/medicine-catalog` | `GET` | Fetch medicine catalog for doctor prescribing workflow. |
| `/api/doctor/messaging` | `GET`, `POST` | Fetch conversations and send doctor messages. |
| `/api/doctor/notifications` | `GET`, `PATCH` | Fetch and update doctor notifications. |

### 3.7 Midwife Routes

| Endpoint | Methods | Purpose |
|---|---|---|
| `/api/midwife/mothers` | `GET`, `PATCH` | Fetch assigned mothers and update assigned doctor where permitted. |
| `/api/midwife/mothers/[uid]/summary` | `GET` | Fetch assigned mother summary. |
| `/api/midwife/observations` | `GET`, `POST`, `PATCH` | List, create, and update midwife observations. |
| `/api/midwife/visits` | `GET`, `POST`, `PATCH`, `DELETE` | List, create, update, and delete midwife visits. |
| `/api/midwife/medications` | `GET` | Fetch medication records for assigned mothers. |
| `/api/midwife/messaging` | `GET`, `POST` | Fetch conversations and send midwife messages. |
| `/api/midwife/notifications` | `GET`, `PATCH` | Fetch and update midwife notifications. |

### 3.8 Shared Routes

| Endpoint | Methods | Purpose |
|---|---|---|
| `/api/settings` | `GET`, `PATCH` | Fetch and update current user settings and notification preferences. |
| `/api/audit-logs` | `GET` | Fetch audit logs for authorized roles. |
| `/api/support/tickets` | `GET`, `POST`, `PATCH` | List, create, and update support tickets. |

## 4. Request Examples

### 4.1 Create Region

```http
POST /api/admin/regions
Content-Type: application/json

{
  "name": "Colombo"
}
```

Expected result:

```json
{
  "region": {
    "id": "colombo",
    "name": "Colombo"
  }
}
```

### 4.2 Create Doctor User

```http
POST /api/admin/users
Content-Type: application/json

{
  "role": "doctor",
  "name": "Dr. Example",
  "personalEmail": "doctor@example.com",
  "phoneNumber": "+94770000000",
  "regionId": "colombo"
}
```

Expected result: created user details and generated credentials where applicable.

### 4.3 Create Mother User

```http
POST /api/admin/users
Content-Type: application/json

{
  "role": "mother",
  "fullName": "Hashini Kawya",
  "personalEmail": "hashini@example.com",
  "phoneNumber": "+94771234567",
  "guardianName": "Guardian Name",
  "guardianContact": "+94779876543",
  "assignedMidwifeUid": "MIDWIFE_UID",
  "assignedDoctorUid": "DOCTOR_UID",
  "regionId": "colombo"
}
```

Expected result: created mother details, generated temporary password, and delivery status where configured.

### 4.4 Update User

```http
PATCH /api/admin/users?type=update
Content-Type: application/json

{
  "uid": "USER_UID",
  "name": "Updated Name"
}
```

### 4.5 Delete User

```http
DELETE /api/admin/users
Content-Type: application/json

{
  "uid": "USER_UID"
}
```

### 4.6 Create Doctor Checkup

```http
POST /api/doctor/checkups
Content-Type: application/json

{
  "motherUid": "MOTHER_UID",
  "scheduledAt": "2026-05-01T09:30:00.000Z",
  "notes": "Follow-up checkup"
}
```

### 4.7 Create Midwife Visit

```http
POST /api/midwife/visits
Content-Type: application/json

{
  "motherUid": "MOTHER_UID",
  "type": "home",
  "scheduledAt": "2026-05-02T10:00:00.000Z",
  "notes": "Home visit"
}
```

### 4.8 Mobile Session Check

```http
GET /api/mobile/session
Authorization: Bearer <firebase-id-token>
Accept: application/json
```

Expected result:

```json
{
  "ok": true,
  "session": {
    "uid": "USER_UID",
    "role": "mother",
    "status": "active"
  }
}
```

### 4.9 Mobile Profile Update

```http
PATCH /api/mobile/profile
Authorization: Bearer <firebase-id-token>
Content-Type: application/json

{
  "fullName": "Hashini Kawya",
  "personalEmail": "hashini@example.com",
  "phoneNumber": "+94771234567",
  "address": "Colombo"
}
```

### 4.10 Mobile Send Message

```http
POST /api/mobile/messaging
Authorization: Bearer <firebase-id-token>
Content-Type: application/json

{
  "conversationId": "MOTHER_UID_midwife_MIDWIFE_UID",
  "text": "Hello midwife"
}
```

## 5. Authorization Rules

General authorization expectations:

- Unauthenticated users cannot access protected API routes.
- Superadmin can access platform-level management routes.
- Regional Admin is limited to regional data.
- Doctors can access assigned mothers.
- Midwives can access assigned mothers.
- Mothers can access only their own mobile data.
- Guardians can access only linked mother support data.
- Mobile protected routes require a valid Firebase ID token.
- Mobile backend routes resolve role, account status, and linked mother context before returning data.

## 6. Mobile API Design Notes

- Firebase Auth remains client-side for login and token generation.
- The mobile app sends the token to `mamabalance-web`.
- The backend uses Firebase Admin SDK for verification and Firestore access.
- Profile and user context are resolved server-side.
- Messaging, care data, notifications, resources, visits, prescriptions, and check-ins are served through the web backend.
- Profile text updates do not automatically upload images.
- Profile image upload is handled separately by sending image data to `/api/mobile/profile`.

## 7. Toast Integration

The web app globally detects successful mutating API requests and shows success toasts:

| Method or Pattern | Toast |
|---|---|
| `POST` | Created successfully |
| `PATCH` / `PUT` | Updated successfully |
| `DELETE` | Deleted successfully |
| Query `type=update` | Updated successfully |
| Query `type=delete` | Deleted successfully |

Authentication, messaging, and notification state routes are excluded from automatic success toasts to avoid noise.

## 8. Error Handling

API routes return error responses when:

- required fields are missing
- role is unauthorized
- account status is inactive
- requested record does not exist
- Firebase operation fails
- validation fails
- mobile token verification fails
- linked mother context cannot be found

Client pages and mobile screens should read the returned `error` field and show a user-friendly message.

Example:

```json
{
  "error": "Unable to find your linked mother profile."
}
```

