# MamaBalance API Documentation

## 1. Overview

The MamaBalance web application uses Next.js API routes under:

```text
mamabalance-web/app/api
```

These routes provide server-side access to Firebase using the Firebase Admin SDK. Most protected routes validate the current authenticated actor and role before returning or modifying data.

## 2. Authentication

Web authentication uses Firebase Authentication and application session handling. Mobile OTP authentication uses a dedicated API route.

Common response pattern:

- Success: JSON data with HTTP `200`, `201`, or equivalent success status.
- Failure: JSON object containing `error` and an HTTP error status.

## 3. API Route Summary

### 3.1 Authentication Routes

| Endpoint | Methods | Purpose |
|---|---|---|
| `/api/auth/session` | `POST`, `DELETE` | Create or clear web session. |
| `/api/auth/me` | `GET`, `PATCH` | Fetch or update current authenticated web user profile. |
| `/api/auth/logout` | `POST` | Log out current user. |
| `/api/auth/forgot-password` | `POST` | Start forgot password flow. |
| `/api/auth/password-reset-otp` | `POST`, `PATCH`, `PUT` | Request, verify, and complete password reset OTP flow. |
| `/api/auth/resolve-login-email` | `POST` | Resolve login email for supported login identifiers. |
| `/api/mobile/auth/otp` | `POST`, `PATCH` | Request and verify mobile OTP login. |

### 3.2 Admin Routes

| Endpoint | Methods | Purpose |
|---|---|---|
| `/api/admin/users` | `GET`, `POST`, `PATCH`, `DELETE` | Manage users including mothers, doctors, midwives, admins, guardians, and phone auth provisioning. |
| `/api/admin/regions` | `GET`, `POST`, `DELETE` | Manage regions. |
| `/api/admin/content` | `GET`, `POST`, `PATCH`, `DELETE` | Manage educational content. |
| `/api/admin/medicines` | `GET`, `POST`, `PATCH`, `DELETE` | Manage medicine catalog records. |
| `/api/admin/medicine-suggestions` | `GET`, `PATCH` | Review or update doctor medicine suggestions. |
| `/api/admin/mothers/[uid]` | `GET` | Fetch full mother summary by UID. |

### 3.3 Superadmin Routes

| Endpoint | Methods | Purpose |
|---|---|---|
| `/api/superadmin/dashboard` | `GET` | Fetch platform dashboard summary. |
| `/api/superadmin/analytics` | `GET` | Fetch platform analytics data. |
| `/api/superadmin/notifications` | `GET`, `PATCH` | Fetch and update superadmin notifications. |

### 3.4 Regional Admin Routes

| Endpoint | Methods | Purpose |
|---|---|---|
| `/api/regionaladmin/dashboard` | `GET` | Fetch regional dashboard summary. |
| `/api/regionaladmin/analytics` | `GET` | Fetch regional analytics data. |
| `/api/regionaladmin/notifications` | `GET`, `PATCH` | Fetch and update regional notifications. |

### 3.5 Doctor Routes

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

### 3.6 Midwife Routes

| Endpoint | Methods | Purpose |
|---|---|---|
| `/api/midwife/mothers` | `GET`, `PATCH` | Fetch assigned mothers and update assigned doctor where permitted. |
| `/api/midwife/mothers/[uid]/summary` | `GET` | Fetch assigned mother summary. |
| `/api/midwife/observations` | `GET`, `POST`, `PATCH` | List, create, and update midwife observations. |
| `/api/midwife/visits` | `GET`, `POST`, `PATCH`, `DELETE` | List, create, update, and delete midwife visits. |
| `/api/midwife/medications` | `GET` | Fetch medication records for assigned mothers. |
| `/api/midwife/messaging` | `GET`, `POST` | Fetch conversations and send midwife messages. |
| `/api/midwife/notifications` | `GET`, `PATCH` | Fetch and update midwife notifications. |

### 3.7 Shared Routes

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

### 4.2 Create User

```http
POST /api/admin/users
Content-Type: application/json

{
  "role": "doctor",
  "name": "Dr. Example",
  "email": "doctor@example.com",
  "regionId": "colombo"
}
```

Expected result: created user details and generated credentials where applicable.

### 4.3 Update User

```http
PATCH /api/admin/users?type=update
Content-Type: application/json

{
  "uid": "USER_UID",
  "name": "Updated Name"
}
```

### 4.4 Delete User

```http
DELETE /api/admin/users
Content-Type: application/json

{
  "uid": "USER_UID"
}
```

### 4.5 Create Doctor Checkup

```http
POST /api/doctor/checkups
Content-Type: application/json

{
  "motherUid": "MOTHER_UID",
  "scheduledAt": "2026-05-01T09:30:00.000Z",
  "notes": "Follow-up checkup"
}
```

### 4.6 Create Midwife Visit

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

## 5. Authorization Rules

General authorization expectations:

- Unauthenticated users cannot access protected API routes.
- Superadmin can access platform-level management routes.
- Regional Admin is limited to regional data.
- Doctors can access assigned mothers.
- Midwives can access assigned mothers.
- Mobile OTP routes are designed for mobile login support.

## 6. Toast Integration

The web app globally detects successful mutating API requests and shows success toasts:

| Method or Pattern | Toast |
|---|---|
| `POST` | Created successfully |
| `PATCH` / `PUT` | Updated successfully |
| `DELETE` | Deleted successfully |
| Query `type=update` | Updated successfully |
| Query `type=delete` | Deleted successfully |

Authentication, messaging, and notification state routes are excluded from automatic success toasts to avoid noise.

## 7. Error Handling

API routes return error responses when:

- required fields are missing
- role is unauthorized
- requested record does not exist
- Firebase operation fails
- validation fails

Client pages should read the returned `error` field and show a user-friendly message.
