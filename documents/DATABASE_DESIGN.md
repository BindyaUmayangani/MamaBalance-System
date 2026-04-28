# MamaBalance Database Design

## 1. Database Technology

MamaBalance uses Firebase Cloud Firestore as the primary database. Firestore stores users, mother profiles, care records, check-ins, visits, medications, messages, notifications, content, support tickets, and audit logs.

Firebase Authentication stores authentication identities. Firestore stores the role and application profile data linked to each authentication user.

Firebase Storage is used for file assets such as profile images and educational content media where configured.

## 2. Main Collections

| Collection | Purpose |
|---|---|
| `users` | Stores account and role data for all web and mobile users. |
| `mothers` | Stores mother-specific profile, care team, EPDS, and linkage data. |
| `regions` | Stores region definitions used for user grouping. |
| `epdsAssessments` | Stores EPDS assessment records for analytics and summaries. |
| `careObservations` | Stores doctor-created care observations. |
| `midwifeObservations` | Stores midwife-created observations. |
| `midwifeVisits` | Stores midwife home or clinic visits. |
| `doctorCheckups` | Stores doctor checkup records. |
| `careMedications` | Stores prescribed medication records. |
| `medicines` | Stores central medicine catalog records. |
| `medicineSuggestions` | Stores medicine suggestions from doctors. |
| `educationalContents` | Stores educational content for mobile users. |
| `conversations` | Stores message conversation metadata. |
| `notifications` | Stores notifications for different roles. |
| `auditLogs` | Stores administrative action logs. |
| `supportTickets` | Stores help and support tickets. |
| `guardianLinks` | Stores guardian-to-mother linking records. |
| `mobileOtpRequests` | Stores mobile OTP login request state. |
| `passwordResetRequests` | Stores password reset OTP request state. |
| `mail` | Stores queued email messages when Firebase mail extension is used. |

## 3. Collection Details

### 3.1 `users`

Purpose: central account profile for all roles.

Common fields:

| Field | Description |
|---|---|
| `uid` | Firebase Authentication UID or system user ID. |
| `role` | User role such as `superadmin`, `regionaladmin`, `doctor`, `midwife`, `mother`, or `guardian`. |
| `displayName` / `name` / `fullName` | Display name. |
| `email` / `loginEmail` | Login email. For mothers, this should use the personal email. |
| `personalEmail` | Personal contact email and mobile login email where applicable. |
| `phoneNumber` | Contact or OTP phone number. |
| `regionId` | Assigned region identifier. |
| `region` | Region display name. |
| `status` | Account status such as active or inactive. |
| `profileImage` | Profile image URL or stored image reference. |
| `profileImagePath` | Firebase Storage path for uploaded profile image where available. |
| `createdAt` | Creation timestamp. |
| `updatedAt` | Last update timestamp. |
| `createdByUid` | User who created the record. |
| `updatedByUid` | User who last updated the record. |

Notes:

- Personal email is the preferred login identifier for mothers and staff.
- Removed system-generated mother email values should not be shown in user management screens.
- Role and status fields are important for backend authorization checks.

### 3.2 `mothers`

Purpose: mother-specific wellbeing and care profile.

Common fields:

| Field | Description |
|---|---|
| `uid` / document ID | Mother identifier. |
| `userUid` | Linked user account UID where stored separately. |
| `fullName` | Mother name. |
| `phoneNumber` | Mother phone number. |
| `personalEmail` | Mother personal email and login email. |
| `address` | Address. |
| `birthdate` | Birth date. |
| `deliveryDate` | Delivery date. |
| `noOfChildren` | Number of children. |
| `guardianName` | Guardian name. |
| `guardianContact` | Guardian phone number. |
| `guardianUid` | Linked guardian user UID where stored directly. |
| `assignedDoctorUid` | Assigned doctor UID. |
| `assignedDoctorName` | Assigned doctor name snapshot where stored. |
| `assignedMidwifeUid` | Assigned midwife UID. |
| `assignedMidwifeName` | Assigned midwife name snapshot where stored. |
| `regionId` | Region ID. |
| `latestEpdsScore` | Latest EPDS score. |
| `latestEpdsDate` / `latestEpdsSubmittedAt` | Latest check-in timestamp. |
| `profileImage` / `profileImageUrl` | Profile image URL or encoded data from older records. |
| `profileImagePath` | Firebase Storage path for profile image where available. |
| `createdAt` | Creation timestamp. |
| `updatedAt` | Last update timestamp. |

Subcollection:

| Subcollection | Purpose |
|---|---|
| `epdsAttempts` | Stores individual weekly EPDS attempts for each mother. |

Notes:

- The mobile backend resolves mothers by document ID, `userUid`, phone number, or personal email depending on login method.
- Profile image upload should be separate from normal profile text updates.

### 3.3 `regions`

Purpose: regional grouping for staff and mothers.

Common fields:

| Field | Description |
|---|---|
| `name` | Region name. |
| `normalizedName` | Normalized region name for comparisons. |
| `createdAt` | Creation timestamp. |
| `createdByUid` | Creator UID. |
| `updatedAt` | Last update timestamp where applicable. |

### 3.4 `epdsAssessments`

Purpose: EPDS records used by dashboards and analytics.

Common fields:

| Field | Description |
|---|---|
| `motherUid` | Mother UID. |
| `score` | EPDS score. |
| `answers` | Numeric EPDS answers. |
| `language` | Check-in language. |
| `createdAt` / `submittedAt` | Submission timestamp. |
| `riskLevel` | Derived risk category where available. |
| `recommendations` | Supportive recommendations where stored. |

### 3.5 `mothers/{motherId}/epdsAttempts`

Purpose: weekly EPDS attempt records under each mother.

Common fields:

| Field | Description |
|---|---|
| `score` | EPDS score. |
| `answers` | Submitted answers. |
| `language` | Selected language. |
| `submittedAt` | Submission timestamp. |
| `createdAt` | Creation timestamp. |

### 3.6 `careObservations`

Purpose: doctor observations.

Common fields:

| Field | Description |
|---|---|
| `motherUid` | Related mother UID. |
| `authorUid` | Doctor UID. |
| `doctorUid` | Doctor UID where stored separately. |
| `authorRole` | Usually `doctor`. |
| `notes` | Observation notes. |
| `status` | Observation or follow-up status. |
| `observedAt` | Observation timestamp. |
| `createdAt` | Creation timestamp. |
| `updatedAt` | Last update timestamp. |

### 3.7 `midwifeObservations`

Purpose: midwife observations.

Common fields:

| Field | Description |
|---|---|
| `motherUid` | Related mother UID. |
| `midwifeUid` / `authorUid` | Midwife UID. |
| `notes` | Observation notes. |
| `visitType` | Home or clinic context where applicable. |
| `observedAt` | Observation timestamp. |
| `createdAt` | Creation timestamp. |
| `updatedAt` | Last update timestamp. |

### 3.8 `midwifeVisits`

Purpose: scheduled and completed midwife visits.

Common fields:

| Field | Description |
|---|---|
| `motherUid` | Mother UID. |
| `midwifeUid` | Midwife UID. |
| `type` | Visit type, such as home or clinic. |
| `scheduledAt` | Visit date and time. |
| `status` | Scheduled, completed, cancelled, or similar status. |
| `notes` | Visit notes. |
| `createdAt` | Creation timestamp. |
| `updatedAt` | Last update timestamp. |

### 3.9 `doctorCheckups`

Purpose: doctor appointment and checkup tracking.

Common fields:

| Field | Description |
|---|---|
| `motherUid` | Mother UID. |
| `doctorUid` | Doctor UID. |
| `scheduledAt` | Checkup date and time. |
| `status` | Scheduled, completed, cancelled, or similar status. |
| `notes` | Checkup notes. |
| `createdAt` | Creation timestamp. |
| `updatedAt` | Last update timestamp. |

### 3.10 `careMedications`

Purpose: prescribed care medications.

Common fields:

| Field | Description |
|---|---|
| `motherUid` | Mother UID. |
| `doctorUid` | Prescribing doctor UID. |
| `medicineName` | Medicine name. |
| `dosage` | Dosage instruction. |
| `frequency` | Frequency instruction. |
| `startDate` | Medication start date. |
| `endDate` | Medication end date if set. |
| `status` | Active, stopped, or completed. |
| `notes` | Additional notes. |
| `createdAt` | Creation timestamp. |
| `updatedAt` | Last update timestamp. |

### 3.11 `medicines`

Purpose: central medicine catalog.

Common fields:

| Field | Description |
|---|---|
| `name` | Medicine name. |
| `description` | Medicine description. |
| `category` | Medicine category. |
| `status` | Active or inactive state. |
| `createdByUid` | Creator UID. |
| `updatedByUid` | Last updater UID. |
| `createdAt` | Creation timestamp. |
| `updatedAt` | Last update timestamp. |

### 3.12 `medicineSuggestions`

Purpose: suggestions submitted by doctors for new catalog medicines.

Common fields:

| Field | Description |
|---|---|
| `name` | Suggested medicine name. |
| `reason` | Reason for suggestion. |
| `status` | Pending, approved, or rejected. |
| `createdByUid` | Doctor UID. |
| `updatedByUid` | Reviewer UID. |
| `createdAt` | Creation timestamp. |
| `updatedAt` | Last update timestamp. |

### 3.13 `educationalContents`

Purpose: educational resources shown to mothers and guardians.

Common fields:

| Field | Description |
|---|---|
| `title` | Content title. |
| `description` | Summary or body. |
| `audience` | Target audience such as mother, guardian, or all. |
| `category` | Content category. |
| `mediaUrl` | Uploaded media URL if used. |
| `storagePath` | Firebase Storage path where applicable. |
| `status` | Published or draft state. |
| `createdByUid` | Creator UID. |
| `updatedByUid` | Last updater UID. |
| `createdAt` | Creation timestamp. |
| `updatedAt` | Last update timestamp. |

### 3.14 `conversations`

Purpose: message thread metadata.

Common fields:

| Field | Description |
|---|---|
| `participantUids` / `participants` | UIDs participating in the conversation. |
| `motherUid` | Mother UID. |
| `doctorUid` | Doctor UID for doctor conversation. |
| `midwifeUid` | Midwife UID for midwife conversation. |
| `staffUid` | Doctor or midwife UID in older or generic records. |
| `careTeamRole` | `doctor` or `midwife`. |
| `isOpen` | Conversation open state. |
| `lastMessageText` / `lastMessage` | Last message preview. |
| `lastMessageAt` | Last message timestamp. |
| `lastMessageSenderUid` | Last sender UID. |
| `lastReadByMotherAt` | Last read timestamp for mother. |
| `lastReadByGuardianAt` | Last read timestamp for guardian. |
| `updatedAt` | Last update timestamp. |
| `createdAt` | Creation timestamp. |

Subcollection:

| Subcollection | Purpose |
|---|---|
| `messages` | Individual message records. |

### 3.15 `conversations/{conversationId}/messages`

Purpose: individual secure messages.

Common fields:

| Field | Description |
|---|---|
| `senderUid` | Sender UID. |
| `senderRole` | Sender role, such as mother, guardian, doctor, or midwife. |
| `text` | Legacy plain text or fallback field if present. |
| `ciphertext` | Encrypted message body. |
| `iv` | Encryption initialization vector. |
| `authTag` | Encryption authentication tag. |
| `algorithm` | Encryption algorithm name. |
| `keyVersion` | Encryption key version. |
| `attachments` | Attached files list where supported. |
| `readBy` | UIDs that have read the message. |
| `createdAt` | Message timestamp. |

### 3.16 `notifications`

Purpose: role and user notifications.

Common fields:

| Field | Description |
|---|---|
| `recipientUid` | Target user UID. |
| `recipientRole` | Target role. |
| `title` | Notification title. |
| `body` | Notification message. |
| `type` | Notification category. |
| `priority` | Priority level. |
| `read` | Read state if stored directly. |
| `createdAt` | Creation timestamp. |
| `updatedAt` | Last update timestamp. |

Notes:

- Some workflows may use separate state collections or fields for read and dismiss status so the source notification is not modified globally.

### 3.17 `auditLogs`

Purpose: administrative activity tracking.

Common fields:

| Field | Description |
|---|---|
| `actorUid` | User who performed the action. |
| `actorRole` | Actor role. |
| `action` | Action description. |
| `target` | Target record or module. |
| `metadata` | Additional details. |
| `createdAt` | Log timestamp. |

### 3.18 `supportTickets`

Purpose: help and support ticket handling.

Common fields:

| Field | Description |
|---|---|
| `subject` | Ticket subject. |
| `message` | Ticket message. |
| `status` | Open, in progress, resolved, or closed. |
| `priority` | Priority value. |
| `createdByUid` | Requester UID. |
| `assignedToUid` | Assigned support user if any. |
| `createdAt` | Creation timestamp. |
| `updatedAt` | Last update timestamp. |

### 3.19 `guardianLinks`

Purpose: explicit guardian-to-mother linking.

Common fields:

| Field | Description |
|---|---|
| `guardianUid` | Guardian user UID. |
| `motherId` / `motherUid` | Linked mother document ID. |
| `isActive` | Whether the guardian link is active. |
| `relationship` | Relationship to mother where stored. |
| `createdAt` | Creation timestamp. |
| `updatedAt` | Last update timestamp. |

### 3.20 `mobileOtpRequests`

Purpose: temporary OTP request state for mobile phone login.

Common fields:

| Field | Description |
|---|---|
| `phoneNumber` | Phone number receiving OTP. |
| `otpHash` | Hashed OTP or verification value. |
| `expiresAt` | Expiry timestamp. |
| `attempts` | Verification attempt count. |
| `createdAt` | Creation timestamp. |

### 3.21 `passwordResetRequests`

Purpose: temporary OTP request state for password reset flows.

Common fields:

| Field | Description |
|---|---|
| `email` | Email receiving OTP. |
| `phoneNumber` | Phone number receiving OTP if SMS reset is used. |
| `otpHash` | Hashed OTP or verification value. |
| `resetTokenHash` | Hashed reset token after OTP verification. |
| `expiresAt` | Expiry timestamp. |
| `verifiedAt` | OTP verification timestamp. |
| `createdAt` | Creation timestamp. |

### 3.22 `mail`

Purpose: queued email messages when Firebase mail extension or equivalent mail processing is used.

Common fields:

| Field | Description |
|---|---|
| `to` | Recipient email. |
| `message` | Email message payload. |
| `createdAt` | Creation timestamp. |
| `status` | Processing status if stored. |

## 4. Main Relationships

| Relationship | Description |
|---|---|
| Auth User to User Document | Firebase Authentication UID maps to a record in `users` or is resolved by phone or personal email. |
| User to Mother | Mother users have records in both `users` and `mothers`. |
| Mother to Doctor | `mothers.assignedDoctorUid` links to a doctor in `users`. |
| Mother to Midwife | `mothers.assignedMidwifeUid` links to a midwife in `users`. |
| Mother to Guardian | `guardianLinks` or direct guardian fields link guardian accounts to mother records. |
| Mother to EPDS Attempts | Mother documents contain `epdsAttempts` subcollections. |
| Mother to Observations | Observations reference `motherUid`. |
| Mother to Visits | Midwife visits reference `motherUid`. |
| Mother to Checkups | Doctor checkups reference `motherUid`. |
| Mother to Medications | Care medications reference `motherUid`. |
| Conversation to Messages | Conversation documents contain `messages` subcollections. |
| Notification to User | Notifications reference recipient UID and role. |

## 5. Data Integrity Notes

- User role values must match application authorization checks.
- User status must be checked before granting access.
- Mother assignment fields must be kept synchronized with staff records.
- Personal email should be stored consistently for mother and staff login.
- Deleting users should be restricted when related care records exist.
- Guardian links should be deactivated rather than removed when historical traceability is needed.
- Audit logs should be append-only for reliable traceability.
- Timestamp fields should use server timestamps where possible.
- Mobile API routes should validate user context before returning records.

## 6. Privacy Notes

Mother health data is sensitive. Access should be limited by role, assignment, region, and linked guardian records.

The final project deployment should review:

- Firestore security rules
- Firebase Storage rules
- API authorization checks
- environment variable handling
- audit logging coverage

