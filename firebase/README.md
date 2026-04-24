# MamaBalance Firestore Setup

This folder contains the Firebase Firestore configuration for the MamaBalance system.

Files in this directory:

- `firestore.rules`: security rules for mobile and staff access
- `firestore.indexes.json`: Firestore composite indexes
- `firestore-schema.md`: recommended collection structure and field model

This setup currently supports:

- `MamaBalance-Mobile` for mothers
- staff-facing access for doctors, midwives, regional admins, and superadmins
- Firebase Authentication with Firestore-backed role and profile checks

## Authentication Assumptions

Enable these Firebase Authentication providers:

- Email/Password
- Phone

Each authenticated user must have a matching Firestore profile in:

```text
users/{uid}
```

Minimum expected fields:

```json
{
  "uid": "firebase-auth-uid",
  "role": "mother",
  "status": "active",
  "displayName": "Nimali Perera",
  "email": "nimali@example.com",
  "phoneNumber": "+94771234567",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

Supported `role` values in the current rules:

- `mother`
- `guardian`
- `doctor`
- `midwife`
- `regionaladmin`
- `superadmin`

Supported `status` values:

- `active`
- `pending`
- `disabled`

## Current Firestore Access Model

The rules in [`firestore.rules`](/d:/MamaBalance-System/firebase/firestore.rules) currently enforce these access patterns:

- mothers can read their own `users/{uid}` profile and their linked mother record
- guardians can access a mother record only when the guardian identity matches the mother document
- doctors can access records only when assigned to that mother
- midwives can access records tied to their assigned mothers and visits
- staff roles can read staff-facing collections such as `regions`, `staff`, and notifications
- public client apps cannot create arbitrary users, mother profiles, or staff records directly

## Main Collections In Use

The schema reference in [`firestore-schema.md`](/d:/MamaBalance-System/firebase/firestore-schema.md) describes the broader target model. The current rules file already contains logic for these active collections:

- `users`
- `mothers`
- `mothers/{motherId}/epdsAttempts`
- `notifications`
- `educationalContents`
- `careMedications`
- `medications`
- `midwifeVisits`
- `doctorCheckups`
- `conversations`
- `conversations/{conversationId}/messages`
- `staff`
- `regions`

There is also one composite index currently defined in [`firestore.indexes.json`](/d:/MamaBalance-System/firebase/firestore.indexes.json):

- collection group `mobileOtpRequests` on `phoneNumber ASC`, `createdAtMs DESC`

If the app starts querying additional collection combinations, you will likely need to add more indexes later.

## Mother Record Expectations

The rules rely on mother-facing documents in:

```text
mothers/{motherId}
```

These records are used to validate:

- self-access for mothers
- guardian-linked access
- assigned doctor access
- assigned midwife access
- notification routing for high-risk EPDS results
- conversation eligibility

Important fields referenced by the rules include:

- `uid` or `userUid`
- `email` or `personalEmail`
- `phoneNumber`
- `guardianUid`
- `guardianContact`
- `assignedDoctorUid`
- `assignedMidwifeUid`

For profile updates, the rules currently allow mothers to update only these fields:

- `fullName`
- `personalEmail`
- `phoneNumber`
- `birthdate`
- `address`
- `guardianName`
- `guardianContact`
- `deliveryDate`
- `noOfChildren`
- `profileImage`
- `profileImagePath`
- `updatedAt`

For EPDS summary updates, only these fields are allowed to change:

- `latestEpdsScore`
- `latestEpdsAttemptId`
- `latestEpdsLanguage`
- `latestEpdsSubmittedAt`
- `riskLevel`
- `isHighRisk`
- `updatedAt`

## EPDS Attempts

The current rules allow mothers and valid guardians to create EPDS submissions in:

```text
mothers/{motherId}/epdsAttempts/{attemptId}
```

Each attempt must include:

- `motherUid`
- `answers` as a 10-item list
- `language`
- `score`
- `riskLevel` as `low`, `moderate`, or `high`
- `attemptedAt`

Old attempts are intended to remain immutable.

## Conversations And Messages

Conversation access is restricted to the linked mother plus the assigned doctor or assigned midwife.

Collections:

```text
conversations/{conversationId}
conversations/{conversationId}/messages/{messageId}
```

The current message rules expect encrypted message payload fields:

- `algorithm`
- `keyVersion`
- `ciphertext`
- `iv`
- `authTag`
- `attachments`
- `readBy`
- `createdAt`

Allowed sender roles:

- `mother`
- `guardian`
- `doctor`
- `midwife`

## Notifications

The current rules explicitly allow creation of one mother-triggered notification flow for high-risk EPDS cases:

- recipient role must be `midwife`
- type must be `high-risk-epds`
- priority must be `high`
- the notification must point to the mother's assigned midwife

Staff can read notifications, but clients cannot update or delete them through Firestore directly.

## Deployment

Deploy rules:

```bash
firebase deploy --only firestore:rules
```

Deploy indexes:

```bash
firebase deploy --only firestore:indexes
```

If you are deploying the full Firebase config from the repo root:

```bash
firebase deploy
```

## Provisioning Guidance

Before a user can successfully access app data:

1. Create the Firebase Auth account.
2. Create the matching `users/{uid}` document.
3. If the user is a mother, create the corresponding `mothers/{motherId}` document and link it correctly.
4. If the user is a guardian, doctor, or midwife, ensure the relationship fields on the mother record are already populated.

Recommended rule of thumb:

- use `users` for auth identity and role
- use `mothers` for the mother domain profile
- use assignment fields on the mother record to drive doctor and midwife access

## Important Note

[`firestore-schema.md`](/d:/MamaBalance-System/firebase/firestore-schema.md) is broader than the collections currently enforced in [`firestore.rules`](/d:/MamaBalance-System/firebase/firestore.rules). If you add new app features using collections from the schema document, review and extend the rules before shipping them.
