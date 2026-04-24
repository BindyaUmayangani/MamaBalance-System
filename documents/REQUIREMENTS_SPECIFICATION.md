# MamaBalance Requirements Specification

## 1. Purpose

This document defines the functional and non-functional requirements of the MamaBalance maternal mental health monitoring system.

## 2. Stakeholders

| Stakeholder | Interest |
|---|---|
| Mothers | Receive wellbeing support, check-ins, prescriptions, resources, and care updates. |
| Guardians | Monitor linked mother wellbeing and support safety. |
| Doctors | Review assigned mothers, observations, checkups, and medications. |
| Midwives | Track assigned mothers, visits, observations, and high-risk cases. |
| Regional Admins | Manage region-level users and review regional reports. |
| Superadmin | Manage the complete platform. |
| Project Evaluators | Review system functionality, architecture, and implementation quality. |

## 3. Functional Requirements

### FR1 Authentication

- The system shall allow web users to log in using email and password.
- The system shall route users to role-specific dashboards.
- The system shall support logout.
- The system shall support password reset flows.
- The mobile app shall support mother and guardian login.
- The mobile app shall support OTP-based authentication for mobile access.
- The mobile app shall support optional biometric unlock after successful login.

### FR2 Role-Based Access

- The system shall restrict features according to user role.
- Superadmin shall access all platform modules.
- Regional Admin shall access assigned-region modules.
- Doctor shall access assigned mother records.
- Midwife shall access assigned mother records.
- Mother shall access only her own mobile data.
- Guardian shall access only linked mother support data.

### FR3 User Management

- Superadmin shall create, update, and delete Regional Admin accounts.
- Superadmin and authorized admins shall create, update, and delete Doctor accounts.
- Superadmin and authorized admins shall create, update, and delete Midwife accounts.
- Superadmin and authorized admins shall create, update, and delete Mother accounts.
- The system shall support guardian account linking for mothers.
- The system shall allow search and filtering of user records.

### FR4 Region Management

- Superadmin shall create regions.
- Superadmin shall delete eligible regions.
- User records shall be associated with region information where applicable.

### FR5 EPDS Check-In

- The mobile app shall display EPDS questions.
- The mother shall answer all required questions before submission.
- The system shall calculate and store the EPDS score.
- The system shall enforce weekly availability rules.
- The result screen shall display score summary and supportive recommendations.

### FR6 Mother Profile and Care Summary

- The system shall store mother profile details.
- Web users shall view mother detail modals.
- Web users shall view mother observation and care summaries.
- Mobile users shall view profile and care team details.

### FR7 Observations

- Doctors shall create and update doctor observations.
- Midwives shall create and update midwife observations.
- Observation records shall be associated with a mother and author.
- Observation records shall be visible in relevant mother summary pages.

### FR8 Visits and Checkups

- Midwives shall create, update, and delete visit records.
- Doctors shall create, update, and delete checkup records.
- Mobile users shall view upcoming visits and checkups.

### FR9 Medication Management

- Doctors shall create care medication records.
- Doctors shall update medication details.
- Doctors shall stop medication.
- Mothers shall view prescriptions in the mobile app.
- Admin users shall manage medicine catalog data.
- Doctors shall create medicine suggestions.

### FR10 Messaging

- Mothers shall send messages to assigned care staff.
- Doctors and midwives shall view and reply to assigned mother conversations.
- Conversation history shall be stored in Firestore.

### FR11 Notifications

- The system shall create notifications for care updates and important events.
- Web users shall view role-specific notifications.
- Mobile users shall view mother or guardian notifications.
- Notification read and dismiss states shall be supported.

### FR12 Educational Content

- Admin users shall create, update, and delete educational resources.
- Mothers and guardians shall view published educational resources in the mobile app.
- Resource visibility shall support audience targeting where configured.

### FR13 Analytics and Reports

- Superadmin shall view platform analytics.
- Regional Admin shall view regional analytics.
- Doctors and midwives shall view role-specific analytics.
- Supported pages shall export PDF reports.

### FR14 Audit Logs

- The system shall record important administrative actions.
- Authorized users shall view audit logs according to role.

### FR15 Support Tickets

- Web users shall submit help and support tickets.
- Authorized users shall review and update ticket status.

### FR16 Toast Messages

- The web app shall show success toast notifications after create, update, and delete operations.
- Create, update, and delete toasts shall use distinct colors and icons.

## 4. Non-Functional Requirements

### NFR1 Usability

- Interfaces shall be clear and role-specific.
- Tables shall support scanning, search, and filtering.
- Mobile screens shall be simple enough for mothers to use easily.

### NFR2 Security

- Users shall authenticate before accessing protected data.
- API routes shall validate user role and permissions.
- Sensitive configuration shall be stored in environment variables.
- Secrets shall not be committed to source control.

### NFR3 Privacy

- Mother health and wellbeing data shall only be visible to authorized users.
- Guardian access shall be restricted to linked mother records.

### NFR4 Reliability

- The system shall handle failed API requests gracefully.
- Forms shall validate required fields.
- Critical workflows shall show success or error feedback.

### NFR5 Maintainability

- The system shall use modular components and services.
- API routes shall be grouped by feature and role.
- Documentation shall be maintained in Markdown files.

### NFR6 Performance

- Dashboards and tables shall load data efficiently for demonstration-scale datasets.
- Mobile app screens shall avoid unnecessary heavy processing.

### NFR7 Compatibility

- Web app shall support modern browsers.
- Mobile app shall support Android devices compatible with the selected Flutter and Firebase packages.

## 5. Assumptions

- Firebase services are available during system operation.
- Users have stable internet access.
- Role and region data are correctly configured.
- EPDS screening is used as support, not diagnosis.

## 6. Constraints

- The project relies on Firebase service availability.
- Local mobile testing requires correct LAN configuration.
- Some features depend on assigned doctor, midwife, mother, or guardian links.
