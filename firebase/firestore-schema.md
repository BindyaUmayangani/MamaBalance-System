# MamaBalance Firestore Collection Structure

This is the recommended Firestore structure for your current web and mobile apps.

It is designed for:

- mothers logging in from `MamaBalance-Mobile`
- staff logging in from `mamabalance-web`
- role-based access for `superadmin`, `regionaladmin`, `doctor`, `midwife`, and `mother`

## Top-Level Collections

Use these top-level collections:

```text
users
regions
clinics
mothers
staffAssignments
epdsAssessments
observations
visits
medications
educationalContents
conversations
notifications
auditLogs
systemConfigs
```

## 1. `users`

Purpose: authentication-linked profile for every logged-in account.

Document ID:

- use Firebase Auth `uid`

Example:

```text
users/{uid}
```

Fields:

```json
{
  "uid": "firebase-auth-uid",
  "role": "mother",
  "status": "active",
  "displayName": "Nimali Perera",
  "email": "nimali@gmail.com",
  "phoneNumber": "+94771234567",
  "photoURL": "",
  "regionId": "western-colombo",
  "clinicId": "clinic-homagama",
  "lastLoginAt": "timestamp",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

Allowed `role` values:

- `mother`
- `superadmin`
- `regionaladmin`
- `doctor`
- `midwife`

Allowed `status` values:

- `active`
- `pending`
- `disabled`

Extra fields by role:

- for `mother`: `motherId`
- for `doctor` and `midwife`: `staffId`, `licenseNumber`
- for `regionaladmin`: `regionId`

## 2. `regions`

Purpose: district/regional admin boundaries.

Example:

```text
regions/{regionId}
```

Fields:

```json
{
  "name": "Colombo Region",
  "district": "Colombo",
  "province": "Western",
  "regionalAdminUid": "uid_of_regional_admin",
  "isActive": true,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

Suggested IDs:

- `western-colombo`
- `western-gampaha`

## 3. `clinics`

Purpose: MOH clinics, hospitals, field clinics, or community centers.

Example:

```text
clinics/{clinicId}
```

Fields:

```json
{
  "name": "Homagama MOH Clinic",
  "regionId": "western-colombo",
  "address": "Homagama, Sri Lanka",
  "contactNumber": "+94112223344",
  "assignedMidwifeUids": ["uid1", "uid2"],
  "assignedDoctorUids": ["uid3"],
  "isActive": true,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

## 4. `mothers`

Purpose: full mother domain profile used by staff dashboards and mobile app.

Document ID:

- use a domain ID like `mother_0001`
- store `userUid` inside the document

Example:

```text
mothers/{motherId}
```

Fields:

```json
{
  "userUid": "firebase-auth-uid",
  "fullName": "Nimali Perera",
  "nic": "200012345678",
  "dob": "2000-05-01",
  "phoneNumber": "+94771234567",
  "email": "nimali@gmail.com",
  "address": "Kaduwela, Sri Lanka",
  "pregnancyStage": "postpartum",
  "expectedDeliveryDate": "2026-06-15",
  "babyDateOfBirth": null,
  "guardianName": "Sunil Perera",
  "guardianContact": "+94775555555",
  "regionId": "western-colombo",
  "clinicId": "clinic-homagama",
  "assignedDoctorUid": "doctor_uid",
  "assignedMidwifeUid": "midwife_uid",
  "riskLevel": "moderate",
  "latestEpdsScore": 13,
  "latestAssessmentId": "epds_0001",
  "isHighRisk": false,
  "emergencyContacts": [
    {
      "name": "Sunil Perera",
      "relationship": "Spouse",
      "phoneNumber": "+94775555555"
    }
  ],
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

Allowed `riskLevel` values:

- `low`
- `moderate`
- `high`

## 5. `staffAssignments`

Purpose: track which doctor and midwife are assigned to each mother, including history.

Example:

```text
staffAssignments/{assignmentId}
```

Fields:

```json
{
  "motherId": "mother_0001",
  "motherUid": "mother_user_uid",
  "doctorUid": "doctor_uid",
  "midwifeUid": "midwife_uid",
  "regionId": "western-colombo",
  "clinicId": "clinic-homagama",
  "assignedByUid": "regionaladmin_uid",
  "isActive": true,
  "assignedAt": "timestamp",
  "endedAt": null
}
```

Why separate this:

- keeps assignment history
- supports reassignments
- useful for audit reports

## 6. `epdsAssessments`

Purpose: weekly mental health check-ins from mothers.

Example:

```text
epdsAssessments/{assessmentId}
```

Fields:

```json
{
  "motherId": "mother_0001",
  "motherUid": "mother_user_uid",
  "regionId": "western-colombo",
  "doctorUid": "doctor_uid",
  "midwifeUid": "midwife_uid",
  "weekLabel": "2026-W15",
  "answers": {
    "q1": 2,
    "q2": 1,
    "q3": 0,
    "q4": 2,
    "q5": 1,
    "q6": 2,
    "q7": 1,
    "q8": 0,
    "q9": 0,
    "q10": 0
  },
  "totalScore": 9,
  "riskLevel": "low",
  "submittedAt": "timestamp",
  "reviewedByUid": null,
  "reviewedAt": null
}
```

Important:

- create one document per submission
- do not overwrite old scores

## 7. `observations`

Purpose: doctor observations, home visit notes, and clinic visit observations.

Example:

```text
observations/{observationId}
```

Fields:

```json
{
  "motherId": "mother_0001",
  "motherUid": "mother_user_uid",
  "observedByUid": "staff_uid",
  "observedByRole": "doctor",
  "source": "doctor",
  "title": "Severe Anxiety Episode",
  "note": "Mother expressed persistent sadness and anxiety.",
  "mood": "anxious",
  "sleep": "poor",
  "appetite": "reduced",
  "additionalNotes": "Follow-up needed",
  "riskLevel": "high",
  "upcomingCheckupAt": "timestamp",
  "observedAt": "timestamp",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

Allowed `source` values:

- `doctor`
- `homeVisit`
- `clinicVisit`

## 8. `visits`

Purpose: upcoming midwife visits and visit history.

Example:

```text
visits/{visitId}
```

Fields:

```json
{
  "motherId": "mother_0001",
  "motherUid": "mother_user_uid",
  "midwifeUid": "midwife_uid",
  "doctorUid": "doctor_uid",
  "regionId": "western-colombo",
  "clinicId": "clinic-homagama",
  "visitType": "home",
  "status": "upcoming",
  "scheduledAt": "timestamp",
  "completedAt": null,
  "notes": "Routine postpartum follow-up",
  "outcomeSummary": "",
  "riskLevelAtVisit": "moderate",
  "createdByUid": "midwife_uid",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

Allowed `visitType` values:

- `home`
- `clinic`

Allowed `status` values:

- `upcoming`
- `completed`
- `overdue`
- `rescheduled`
- `cancelled`

## 9. `medications`

Purpose: prescriptions and medication history for mothers.

Example:

```text
medications/{medicationId}
```

Fields:

```json
{
  "motherId": "mother_0001",
  "motherUid": "mother_user_uid",
  "doctorUid": "doctor_uid",
  "prescribedByName": "Dr. Nipuni Kaushalya",
  "medicationName": "Fluoxetine",
  "dosage": "10 mg",
  "frequency": "Daily after breakfast",
  "instructions": "Take one tablet each morning with food.",
  "notes": "Monitor mood weekly.",
  "startDate": "2026-04-01",
  "endDate": "2026-04-30",
  "status": "active",
  "stopReason": null,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

Allowed `status` values:

- `active`
- `completed`
- `stopped`

## 10. `educationalContents`

Purpose: educational articles, PDFs, videos, and links.

Example:

```text
educationalContents/{contentId}
```

Fields:

```json
{
  "title": "Understanding Postpartum Depression",
  "description": "Short guide for mothers and families.",
  "type": "pdf",
  "category": "mental-health",
  "visibility": "published",
  "audience": ["mother"],
  "regionIds": [],
  "fileUrl": "https://...",
  "thumbnailUrl": "",
  "createdByUid": "superadmin_uid",
  "updatedByUid": "regionaladmin_uid",
  "publishedAt": "timestamp",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

Allowed `type` values:

- `pdf`
- `video`
- `link`

Allowed `visibility` values:

- `draft`
- `published`
- `archived`

## 11. `conversations`

Purpose: chat between mother and assigned doctor.

Recommended structure:

```text
conversations/{conversationId}
conversations/{conversationId}/messages/{messageId}
```

Parent document fields:

```json
{
  "motherId": "mother_0001",
  "motherUid": "mother_user_uid",
  "doctorUid": "doctor_uid",
  "participantUids": ["mother_user_uid", "doctor_uid"],
  "lastMessageText": "How are you feeling today?",
  "lastMessageAt": "timestamp",
  "lastMessageSenderUid": "doctor_uid",
  "isOpen": true,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

Message subcollection fields:

```json
{
  "senderUid": "doctor_uid",
  "senderRole": "doctor",
  "text": "How are you feeling today?",
  "attachments": [],
  "createdAt": "timestamp",
  "readBy": ["mother_user_uid"]
}
```

## 12. `notifications`

Purpose: in-app notifications for mothers and staff.

Example:

```text
notifications/{notificationId}
```

Fields:

```json
{
  "recipientUid": "target_user_uid",
  "recipientRole": "mother",
  "type": "new_message",
  "title": "New message from your doctor",
  "body": "Please review your updated care plan.",
  "isRead": false,
  "relatedCollection": "conversations",
  "relatedId": "conversation_0001",
  "createdAt": "timestamp",
  "readAt": null
}
```

Useful `type` values:

- `new_message`
- `visit_reminder`
- `epds_due`
- `medication_update`
- `high_risk_alert`
- `system`

## 13. `auditLogs`

Purpose: track admin and staff actions.

Example:

```text
auditLogs/{logId}
```

Fields:

```json
{
  "actorUid": "regionaladmin_uid",
  "actorRole": "regionaladmin",
  "action": "assign_doctor",
  "targetCollection": "mothers",
  "targetId": "mother_0001",
  "summary": "Assigned doctor Dr. Silva to Nimali Perera",
  "metadata": {
    "doctorUid": "doctor_uid",
    "midwifeUid": "midwife_uid"
  },
  "createdAt": "timestamp"
}
```

## 14. `systemConfigs`

Purpose: rare system-wide settings.

Example:

```text
systemConfigs/app
```

Fields:

```json
{
  "epdsHighRiskThreshold": 15,
  "epdsModerateRiskThreshold": 10,
  "defaultCountryCode": "+94",
  "updatedAt": "timestamp",
  "updatedByUid": "superadmin_uid"
}
```

---

# Recommended Relationships

Use this relationship pattern:

- `users/{uid}` is the auth profile
- `mothers/{motherId}` is the mother domain record
- `users/{uid}.motherId` points to `mothers/{motherId}`
- `mothers/{motherId}.userUid` points back to `users/{uid}`

For staff:

- `users/{uid}` is usually enough for login profile
- add more staff-specific details either inside `users/{uid}` or in a separate staff profile collection later if needed

---

# Best Index/Query-Friendly Fields

Add these fields because your dashboards will filter by them often:

- `role`
- `status`
- `regionId`
- `clinicId`
- `assignedDoctorUid`
- `assignedMidwifeUid`
- `riskLevel`
- `isHighRisk`
- `submittedAt`
- `scheduledAt`
- `status`

---

# How To Create Collections In Firestore

## Option 1: From Firebase Console

1. Open Firebase Console.
2. Go to `Firestore Database`.
3. Click `Start collection`.
4. Enter the collection name, for example `users`.
5. Add the first document.

Important:

- Firestore does not keep an empty collection.
- A collection appears only after you create at least one document inside it.

So to create `users`, you must create something like:

```text
users/test_uid_001
```

## Option 2: Create Automatically From Code

Whenever your app writes a document, Firestore creates the collection automatically.

Example:

```ts
await setDoc(doc(db, "users", uid), {
  uid,
  role: "mother",
  status: "active",
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});
```

That write creates:

- collection `users`
- document `users/{uid}`

## Option 3: Seed Initial Data

For your project, the best first seed order is:

1. `regions`
2. `clinics`
3. `users` for staff
4. `mothers`
5. `users` for mothers
6. `staffAssignments`
7. `educationalContents`
8. later transactional data like `epdsAssessments`, `observations`, `visits`, `medications`

---

# First Collections You Should Create Now

Create these first:

```text
regions
clinics
users
mothers
staffAssignments
systemConfigs
```

Then add:

```text
educationalContents
epdsAssessments
observations
visits
medications
notifications
auditLogs
conversations
```

---

# Example Minimal Seed Data

## `regions/western-colombo`

```json
{
  "name": "Colombo Region",
  "district": "Colombo",
  "province": "Western",
  "isActive": true
}
```

## `clinics/clinic-homagama`

```json
{
  "name": "Homagama MOH Clinic",
  "regionId": "western-colombo",
  "isActive": true
}
```

## `users/superadmin_uid`

```json
{
  "uid": "superadmin_uid",
  "role": "superadmin",
  "status": "active",
  "displayName": "Platform Super Admin",
  "email": "superadmin@mamabalance.lk",
  "regionId": null,
  "clinicId": null
}
```

## `users/doctor_uid`

```json
{
  "uid": "doctor_uid",
  "role": "doctor",
  "status": "active",
  "displayName": "Dr. Nipuni Kaushalya",
  "email": "doctor@mamabalance.lk",
  "regionId": "western-colombo",
  "clinicId": "clinic-homagama"
}
```

## `mothers/mother_0001`

```json
{
  "userUid": "mother_user_uid",
  "fullName": "Nimali Perera",
  "phoneNumber": "+94771234567",
  "email": "nimali@gmail.com",
  "regionId": "western-colombo",
  "clinicId": "clinic-homagama",
  "assignedDoctorUid": "doctor_uid",
  "assignedMidwifeUid": "midwife_uid",
  "riskLevel": "low",
  "latestEpdsScore": 0,
  "isHighRisk": false
}
```

## `users/mother_user_uid`

```json
{
  "uid": "mother_user_uid",
  "role": "mother",
  "status": "active",
  "displayName": "Nimali Perera",
  "email": "nimali@gmail.com",
  "phoneNumber": "+94771234567",
  "regionId": "western-colombo",
  "clinicId": "clinic-homagama",
  "motherId": "mother_0001"
}
```

---

# Recommendation For Your Project

Do not put everything under one giant `users` collection only.

Best pattern for MamaBalance:

- `users` for auth + role
- separate domain collections like `mothers`, `epdsAssessments`, `observations`, `visits`, `medications`

That structure will scale much better for:

- dashboards
- filtering by region
- analytics
- audit logs
- role-based rules

If you want, the next best step is for me to create:

1. the exact Firestore security rules for this full schema
2. TypeScript and Flutter model files for these collections
3. a seed script to create your first admin, doctor, midwife, and mother documents
