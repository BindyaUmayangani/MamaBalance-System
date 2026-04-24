# MamaBalance Database Design

## 1. Database Technology

MamaBalance uses Firebase Cloud Firestore as the primary database. Firestore stores users, mother profiles, care records, check-ins, visits, medications, messages, notifications, content, support tickets, and audit logs.

Firebase Authentication stores authentication identities. Firestore stores the role and application profile data linked to each authentication user.

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
| `name` / `fullName` | Display name. |
| `email` / `loginEmail` | Login or contact email. |
| `phoneNumber` | Contact or OTP phone number. |
| `regionId` | Assigned region identifier. |
| `region` | Region display name. |
| `status` | Account status if configured. |
| `createdAt` | Creation timestamp. |
| `updatedAt` | Last update timestamp. |
| `createdByUid` | User who created the record. |
| `updatedByUid` | User who last updated the record. |

### 3.2 `mothers`

Purpose: mother-specific wellbeing and care profile.

Common fields:

| Field | Description |
|---|---|
| `uid` / document ID | Mother identifier. |
| `fullName` | Mother name. |
| `phoneNumber` | Mother phone number. |
| `personalEmail` | Mother email. |
| `address` | Address. |
| `birthdate` | Birth date. |
| `deliveryDate` | Delivery date. |
| `noOfChildren` | Number of children. |
| `guardianName` | Guardian name. |
| `guardianContact` | Guardian phone number. |
| `assignedDoctorUid` | Assigned doctor UID. |
| `assignedDoctorName` | Assigned doctor name. |
| `assignedMidwifeUid` | Assigned midwife UID. |
| `assignedMidwifeName` | Assigned midwife name. |
| `regionId` | Region ID. |
| `latestEpdsScore` | Latest EPDS score. |
| `latestEpdsDate` / `latestEpdsSubmittedAt` | Latest check-in timestamp. |
| `profileImageUrl` | Profile image reference or encoded data. |

Subcollection:

| Subcollection | Purpose |
|---|---|
| `epdsAttempts` | Stores individual weekly EPDS attempts for each mother. |

### 3.3 `regions`

Purpose: regional grouping for staff and mothers.

Common fields:

| Field | Description |
|---|---|
| `name` | Region name. |
| `normalizedName` | Normalized region name for comparisons. |
| `createdAt` | Creation timestamp. |
| `createdByUid` | Creator UID. |

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

### 3.5 `careObservations`

Purpose: doctor observations.

Common fields:

| Field | Description |
|---|---|
| `motherUid` | Related mother UID. |
| `authorUid` | Doctor UID. |
| `authorRole` | Usually `doctor`. |
| `notes` | Observation notes. |
| `status` | Observation or follow-up status. |
| `observedAt` | Observation timestamp. |
| `createdAt` | Creation timestamp. |
| `updatedAt` | Last update timestamp. |

### 3.6 `midwifeObservations`

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

### 3.7 `midwifeVisits`

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

### 3.8 `doctorCheckups`

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

### 3.9 `careMedications`

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

### 3.10 `medicines`

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

### 3.11 `medicineSuggestions`

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

### 3.12 `educationalContents`

Purpose: educational resources shown to mothers and guardians.

Common fields:

| Field | Description |
|---|---|
| `title` | Content title. |
| `description` | Summary or body. |
| `audience` | Target audience such as mother, guardian, or all. |
| `category` | Content category. |
| `mediaUrl` | Uploaded media URL if used. |
| `status` | Published or draft state. |
| `createdByUid` | Creator UID. |
| `updatedByUid` | Last updater UID. |
| `createdAt` | Creation timestamp. |
| `updatedAt` | Last update timestamp. |

### 3.13 `conversations`

Purpose: message thread metadata.

Common fields:

| Field | Description |
|---|---|
| `participants` | UIDs participating in the conversation. |
| `motherUid` | Mother UID. |
| `staffUid` | Doctor or midwife UID. |
| `lastMessage` | Last message preview. |
| `lastMessageAt` | Last message timestamp. |
| `updatedAt` | Last update timestamp. |

Subcollection:

| Subcollection | Purpose |
|---|---|
| `messages` | Individual message records. |

### 3.14 `notifications`

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

### 3.15 `auditLogs`

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

### 3.16 `supportTickets`

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

## 4. Main Relationships

| Relationship | Description |
|---|---|
| User to Mother | Mother users have records in both `users` and `mothers`. |
| Mother to Doctor | `mothers.assignedDoctorUid` links to a doctor in `users`. |
| Mother to Midwife | `mothers.assignedMidwifeUid` links to a midwife in `users`. |
| Mother to Guardian | `guardianLinks` links guardian accounts to mother records. |
| Mother to EPDS Attempts | Mother documents contain `epdsAttempts` subcollections. |
| Mother to Observations | Observations reference `motherUid`. |
| Mother to Visits | Midwife visits reference `motherUid`. |
| Mother to Checkups | Doctor checkups reference `motherUid`. |
| Mother to Medications | Care medications reference `motherUid`. |
| Conversation to Messages | Conversation documents contain `messages` subcollections. |

## 5. Data Integrity Notes

- User role values must match application authorization checks.
- Mother assignment fields must be kept synchronized with staff records.
- Deleting users should be restricted when related care records exist.
- Audit logs should be append-only for reliable traceability.
- Timestamp fields should use server timestamps where possible.

## 6. Privacy Notes

Mother health data is sensitive. Access should be limited by role, assignment, and region. The final project deployment should review Firestore security rules and API authorization checks before production use.
