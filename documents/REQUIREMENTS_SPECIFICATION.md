# MamaBalance Requirements Specification

## 1. Purpose

This document defines the functional and non-functional requirements of the MamaBalance maternal mental health monitoring and care coordination system.

## 2. Stakeholders

| Stakeholder | Interest |
|---|---|
| Mothers | Receive wellbeing support, check-ins, prescriptions, resources, notifications, and care updates. |
| Guardians | Monitor linked mother wellbeing and support safety. |
| Doctors | Review assigned mothers, observations, checkups, medications, and secure messages. |
| Midwives | Track assigned mothers, visits, observations, high-risk cases, and secure messages. |
| Regional Admins | Manage region-level users and review regional reports. |
| Superadmin | Manage the complete platform, users, regions, content, medicines, analytics, and audit logs. |
| Project Evaluators | Review system functionality, architecture, documentation, and implementation quality. |

## 3. System Scope

MamaBalance includes:

- a Next.js web application for staff and administrators
- a Flutter mobile application for mothers and guardians
- a centralized web backend API for mobile app data access
- Firebase Authentication, Firestore, and Storage integration
- role-based access control across all supported workflows

The mobile app keeps Firebase Authentication client-side for login/session token handling. Protected mobile app data is retrieved through `mamabalance-web` API routes.

## 4. Functional Requirements

### FR1 User Authentication

Priority: High

- The system shall allow web users to log in using personal email and password.
- The system shall route web users to role-specific dashboards.
- The system shall support logout.
- The system shall support password reset flows for web users.
- The web password reset flow shall send OTP codes to the registered personal email where configured.
- The mobile app shall support mother and guardian login.
- The mobile app shall support personal email and password login for mothers.
- The mobile app shall support OTP-based phone authentication for mobile access.
- Guardian login shall use OTP-only access where configured.
- The mobile app shall support email OTP password reset for mother email login.
- The mobile app shall support optional biometric unlock after successful login.
- The system shall reject inactive, deleted, or unauthorized accounts.

### FR2 Role-Based Access Control

Priority: High

- The system shall restrict features according to user role.
- Superadmin shall access all platform modules.
- Regional Admin shall access assigned-region modules.
- Doctor shall access assigned mother records.
- Midwife shall access assigned mother records.
- Mother shall access only her own mobile data.
- Guardian shall access only linked mother support data.
- Staff users shall use the web portal.
- Mother and Guardian users shall use the mobile app.

### FR3 User Management

Priority: High

- Superadmin shall create, update, and delete Regional Admin accounts.
- Superadmin and authorized admins shall create, update, and delete Doctor accounts.
- Superadmin and authorized admins shall create, update, and delete Midwife accounts.
- Superadmin and authorized admins shall create, update, and delete Mother accounts.
- Mother account creation shall use the mother's personal email as the login email.
- The system shall not require system-generated mother emails for mother login.
- The system shall generate temporary passwords for new mother accounts where configured.
- The system shall send mother account credentials through SMS where SMS configuration is available.
- The system shall support guardian account linking for mothers.
- The system shall allow search and filtering of user records.
- User management tables shall display personal email where relevant.
- User and mother detail modals shall avoid showing removed system email fields.

### FR4 Region Management

Priority: High

- Superadmin shall create regions.
- Superadmin shall update region details where supported.
- Superadmin shall delete eligible regions.
- Superadmin shall manage region records and assign users to regions.
- User records shall be associated with region information where applicable.
- Regional Admin data visibility shall be limited to assigned region scope.

### FR5 Digital EPDS Screening

Priority: High

- The mobile app shall display EPDS questions.
- The mother shall answer all required questions before submission.
- The mobile app shall support the EPDS questionnaire as a digital check-in workflow.
- Submitted EPDS answers shall be linked to the correct mother record.

### FR6 Score Calculation

Priority: High

- The system shall calculate and store the EPDS score.
- The system shall categorize EPDS risk levels as Low, Moderate, or High where configured.
- The result screen shall display score summary and supportive recommendations.
- Score summaries shall be available to assigned care providers where permitted.

### FR7 Weekly Check-In Control

Priority: High

- The system shall enforce weekly availability rules.
- The home screen shall display latest EPDS score, last test date, and next check-in date.
- The last test display shall show date only where required.
- The mother shall not be able to submit repeated EPDS check-ins before the configured interval.

### FR8 Data Storage

Priority: High

- The system shall securely store user data, mother profiles, EPDS results, observations, visits, checkups, medications, messages, notifications, content, support tickets, and audit logs.
- Firestore shall be used as the primary centralized database.
- Firebase Authentication shall store authentication identities.
- Firebase Storage shall store profile images and file assets where configured.

### FR9 Risk Alerts

Priority: High

- The system shall generate alerts for healthcare providers when EPDS scores exceed risk thresholds.
- High-risk mothers shall be visible to relevant care providers.
- Doctors and midwives shall receive role-specific notifications or dashboard indicators where configured.
- Risk alerts shall support timely follow-up and care coordination.

### FR10 Guardian Integration

Priority: High

- The system shall allow guardians to be linked to mothers.
- Guardians shall access only linked mother support information.
- Guardians shall view notifications, care updates, educational resources, and support features where permitted.
- Guardians shall not replace the mother's account or edit clinical records.

### FR11 Midwife Assignment

Priority: Medium

- The system shall assign midwives to mothers based on region where applicable.
- Superadmin or authorized admins shall manage midwife assignments.
- Midwives shall view and manage assigned mother cases.
- Assigned midwives shall be available in mother profile and mobile care team details.

### FR12 Doctor Assignment

Priority: High

- The system shall allow doctors to be assigned to mothers who need clinical follow-up.
- Midwives shall assign doctors to high-risk mothers where the workflow permits.
- Assigned doctors shall access only assigned mother records.
- Assigned doctor details shall be available to mothers in the mobile app.

### FR13 Medical Observations

Priority: High

- Doctors shall create and update doctor observations.
- Midwives shall create and update midwife observations.
- Observation records shall be associated with a mother and author.
- Observation records shall be visible in relevant mother summary pages.

### FR14 Visit Management

Priority: High

- Midwives shall create, update, and delete visit records.
- Visit records shall support home and clinic visit types.
- Visit records shall include scheduled date/time, status, and notes where applicable.
- Mobile users shall view upcoming visits through the web backend.

### FR15 Checkup Scheduling

Priority: High

- Doctors shall create, update, and delete checkup records.
- Checkup records shall include scheduled date/time, status, and notes where applicable.
- Mobile users shall view upcoming checkups through the web backend.
- Checkup data shall be limited to the relevant assigned or linked mother.

### FR16 Medication Management

Priority: High

- Doctors shall create care medication records.
- Doctors shall update medication details.
- Doctors shall stop or discontinue medication.
- Mothers shall view prescriptions in the mobile app.
- Guardians may view linked medication summaries where permitted.
- Admin users shall manage medicine catalog data.
- Doctors shall create medicine suggestions.

### FR17 Messaging System

Priority: High

- Mothers shall send messages to assigned care staff.
- Doctors and midwives shall view and reply to assigned mother conversations.
- Conversation history shall be stored in Firestore.
- Mobile messaging shall go through the web backend.
- Message access shall be limited to assigned mother-care staff relationships.
- Message timestamps shall display correctly in the user's local time.
- Secure message payloads shall be encrypted where implemented.

### FR18 Notification System

Priority: High

- The system shall create notifications for EPDS check-ins, visits, checkups, messages, care updates, educational content, and important events.
- Web users shall view role-specific notifications.
- Mobile users shall view mother or guardian notifications through the web backend.
- Notification read and dismiss states shall be supported.
- Notification summaries shall support unread counts where implemented.
- SMS notification delivery shall be supported where provider configuration is available.

### FR19 Educational Content

Priority: Medium

- Admin users shall create, update, and delete educational resources.
- Mothers and guardians shall view published educational resources in the mobile app.
- Mobile educational resources shall be loaded through the web backend.
- Resource visibility shall support audience targeting where configured.

### FR20 Analytics Dashboard

Priority: High

- Superadmin shall view platform analytics.
- Regional Admin shall view regional analytics.
- Doctors and midwives shall view role-specific analytics.
- Dashboards shall monitor risk levels, visits, checkups, user counts, and system activity where implemented.
- Dashboards shall summarize important care and usage data.

### FR21 Reporting

Priority: Medium

- The system shall generate reports where supported.
- Analytics data and mother summary data shall be exportable from supported pages.
- PDF report generation shall be supported where implemented.

### FR22 Audit Logs

Priority: Medium

- The system shall record important administrative actions.
- Authorized users shall view audit logs according to role.
- Audit log records shall help trace user, region, content, and account changes.

### FR23 Support Tickets

Priority: Medium

- Web users shall submit help and support tickets.
- Authorized users shall review support tickets.
- Authorized users shall update ticket status where permitted.

### FR24 AI Chatbot Support

Priority: High

- The system shall provide an AI-assisted chatbot for informational and supportive interaction.
- The chatbot shall provide supportive guidance only.
- The chatbot shall be non-diagnostic and shall not replace clinical advice.
- The chatbot shall be available to mothers through the mobile app where configured.

### FR25 Profile Management

Priority: Medium

- The system shall store mother profile details.
- Web users shall view mother detail modals.
- Web users shall view mother observation and care summaries.
- Mobile users shall view profile and care team details.
- Mobile users shall update allowed profile fields through the web backend.
- Mobile profile image upload shall be handled separately from normal profile detail updates.
- Until a profile picture is added, the mobile app shall show initials based on the mother's name.

### FR26 UI Feedback

Priority: Low

- The web app shall show success toast notifications after create, update, and delete operations.
- Create, update, and delete toasts shall use distinct colors and icons.
- Mobile app workflows shall show success or error feedback using Snackbars or inline messages.
- Profile picture update shall show a success message after successful upload.

### Additional Mobile User Context Requirements

- The mobile backend shall verify Firebase ID tokens before returning protected data.
- The mobile backend shall resolve the signed-in user's role and status.
- The mobile backend shall resolve the linked mother profile for mother users.
- The mobile backend shall resolve the linked mother profile for guardian users.
- The mobile app shall use the web backend for profile, context, session, care, check-in, notifications, resources, visits, prescriptions, and messaging.

## 5. Non-Functional Requirements

### NFR1 Usability

Priority: High

- The system shall provide simple, user-friendly interfaces for both technical and non-technical users.
- Interfaces shall be clear and role-specific.
- Mobile screens shall be simple enough for mothers to use easily.
- Web dashboards, tables, and forms shall be easy for staff and administrators to understand.
- Tables shall support scanning, search, and filtering.
- Web management pages shall support efficient repeated administrative work.
- Important success and error messages shall be visible to users.

### NFR2 Security

Priority: High

- The system shall enforce authentication, authorization, and secure handling of user data.
- Users shall authenticate before accessing protected data.
- API routes shall validate user role and permissions.
- Mobile API routes shall verify Firebase ID tokens.
- Sensitive user and health-related data shall be handled through protected routes.
- Staff users shall not access mobile-only routes as mothers or guardians.

### NFR3 Privacy

Priority: High

- The system shall ensure that maternal data is accessible only to authorized users.
- Mother health and wellbeing data shall only be visible to authorized users.
- Doctors and midwives shall only access assigned mother records.
- Guardian access shall be restricted to linked mother records.
- EPDS data shall be treated as sensitive wellbeing information.
- Personal email, phone number, profile, and care information shall be protected from unauthorized access.

### NFR4 Reliability

Priority: High

- The system shall handle errors gracefully and provide feedback to users.
- The system shall handle failed API requests gracefully.
- Forms shall validate required fields.
- Critical workflows shall show success or error feedback.
- Mobile services shall show timeout or connection messages when the backend is unreachable.
- The system shall avoid crashing when optional data such as profile images, assignments, or visit records are missing.

### NFR5 Performance

Priority: Medium

- The system shall load data efficiently and provide smooth user interactions.
- Dashboards and tables shall load data efficiently for demonstration-scale datasets.
- Mobile app screens shall avoid unnecessary heavy processing.
- Backend routes shall return only data needed for the requested workflow where practical.
- Search, filter, and pagination features shall help users handle larger record lists.

### NFR6 Maintainability

Priority: Medium

- The system shall follow modular architecture and maintain clean code structure.
- The system shall use modular components and services.
- API routes shall be grouped by feature and role.
- Mobile service classes shall separate backend calls from UI screens.
- Documentation shall be maintained in Markdown files.
- Code should follow consistent naming and structure across web and mobile modules.

### NFR7 Scalability

Priority: Medium

- The system shall support future expansion and increased user load.
- The architecture shall allow new roles, modules, and API routes to be added without major restructuring.
- Firestore collections and role-based APIs should support growth beyond the demonstration dataset.
- The centralized backend approach shall allow mobile features to be expanded through additional API routes.

### NFR8 Compatibility

Priority: High

- The system shall support modern browsers and Android mobile devices.
- Web app shall support modern browsers.
- Mobile app shall support Android devices compatible with the selected Flutter and Firebase packages.
- Local mobile testing shall support LAN backend URLs.
- The web application shall support common desktop browser screen sizes used by administrators and care staff.

### NFR9 Availability

Priority: Medium

- The system shall be accessible whenever Firebase services and the hosted web backend are available.
- Local development availability depends on the web server, Firebase connectivity, and network access from the mobile device.
- The mobile app shall show connection error messages when the backend is unavailable.
- Web and mobile features that depend on the backend shall clearly inform users when service access fails.

### NFR10 Data Integrity

Priority: High

- The system shall ensure accuracy and consistency of stored data.
- Related records such as users, mothers, guardian links, care assignments, visits, checkups, prescriptions, and notifications should remain consistent.
- Timestamp fields should use server-side timestamps where practical.
- Critical updates should validate required fields before writing to Firestore.
- Audit logs should support traceability of important administrative changes.

### Additional Non-Functional Requirements

#### Safety

Priority: High

- EPDS screening shall be presented as support and monitoring, not diagnosis.
- Chatbot responses shall be supportive guidance, not clinical advice.
- Emergency support information shall be available for urgent situations.

#### Secure Configuration

Priority: High

- Secrets and Firebase Admin credentials shall be stored in environment variables.
- `.env.local` shall not be committed to public source control.
- Production deployments should review Firebase Auth, Firestore rules, Storage rules, and API authorization behavior.

## 6. Assumptions

- Firebase services are available during system operation.
- Users have stable internet access.
- Role and region data are correctly configured.
- Mothers are assigned to the correct doctor and midwife where required.
- Guardian accounts are linked to the correct mother record.
- EPDS screening is used as support, not diagnosis.
- The web backend is reachable by the mobile app during mobile data access.

## 7. Constraints

- The project relies on Firebase service availability.
- Local mobile testing requires correct LAN configuration.
- Some features depend on assigned doctor, midwife, mother, or guardian links.
- SMS and email OTP delivery depend on external provider configuration.
- Firebase Storage must be configured correctly for profile images and file assets.
- The chatbot is supportive only and should not be treated as medical diagnosis.
