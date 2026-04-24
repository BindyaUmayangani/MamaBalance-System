# MamaBalance User Guide

## 1. Purpose

This guide explains how each user group uses the MamaBalance system after installation. MamaBalance has two main applications:

- Web application: used by Superadmin, Regional Admin, Doctor, and Midwife users.
- Mobile application: used by Mothers and Guardians.

The system supports maternal mental wellbeing monitoring, EPDS check-ins, care coordination, medication tracking, educational content, notifications, and secure communication.

## 2. User Roles

| Role | Platform | Main Purpose |
|---|---|---|
| Superadmin | Web | Manage all regions, staff, mothers, content, medicines, audit logs, and analytics. |
| Regional Admin | Web | Manage users and reports within an assigned region. |
| Doctor | Web | Review assigned mothers, create checkups and observations, manage medications, and communicate with mothers. |
| Midwife | Web | Monitor assigned mothers, create visits and observations, manage high-risk follow-up, and communicate with mothers. |
| Mother | Mobile | Complete weekly EPDS check-ins, view prescriptions, receive alerts, use chatbot support, and message care team. |
| Guardian | Mobile | View linked mother wellbeing summary, appointments, care team information, and emergency guidance. |

## 3. Web Application Login

1. Open the MamaBalance web application in a browser.
2. Enter the registered login email and password.
3. Select `Login`.
4. The system opens the dashboard that matches the logged-in user's role.

If a user enters invalid credentials or has no valid role, the system blocks access and shows an error.

## 4. Web Application Common Features

### 4.1 Dashboard

Each web role has a dashboard with role-specific summaries such as:

- total mothers
- high-risk mothers
- upcoming visits or checkups
- notifications
- recent activity
- analytics cards

### 4.2 Tables

Most management pages display records in tables. Users can usually:

- search records
- filter records
- view details
- open related observations
- create, update, or delete records when permitted
- export reports from supported pages

### 4.3 Toast Messages

The web application displays success toast notifications after successful create, update, and delete operations:

- Created: green toast with success icon.
- Updated: blue toast with edit icon.
- Deleted: red toast with delete icon.

Toasts appear at the top-right of the dashboard on desktop and at the top of the screen on mobile-width browsers.

### 4.4 Notifications

Notification pages show care-related alerts such as:

- new messages
- visit and checkup updates
- high-risk updates
- educational content updates
- support ticket updates

Users can mark notifications as read or dismiss them where permitted.

### 4.5 Settings

Settings pages allow users to manage contact details and notification preferences. Login email is generally displayed for reference and should not be edited directly.

## 5. Superadmin Guide

The Superadmin has full system-level access.

### 5.1 Dashboard

The dashboard summarizes platform activity, user counts, region distribution, high-risk trends, and recent audit logs.

### 5.2 Region Management

Use Region Management to:

1. View all regions.
2. Add a new region.
3. Delete a region if it is not actively used by linked users or care records.

### 5.3 Admin Management

Use Admin Management to:

1. Create Regional Admin accounts.
2. Update admin details.
3. Reset passwords.
4. Delete admin accounts when appropriate.

### 5.4 User Management

The Superadmin can manage:

- Mothers
- Doctors
- Midwives

Common workflow:

1. Open the required user management section.
2. Search or filter records.
3. Select `Add` to create a new user.
4. Select `Edit` to update user details.
5. Select `Delete` to remove an account if permitted.
6. Use `View` or `Observation` options for mother details.

When a mother is created, the system can also provision guardian access if guardian details are available.

### 5.5 Educational Content

Use Educational Content to create and manage resources for mothers and guardians. Resources can include text, images, PDFs, or video links depending on the configured form.

### 5.6 Medicine Management

Use Medicine Management to:

- create medicine records
- update medicine information
- review medicine suggestions from doctors
- approve or manage medicine catalog entries

### 5.7 Analytics and Reports

Analytics and Reports provide overall system insight. Reports can be exported where the page supports PDF generation.

### 5.8 Audit Logs

Audit Logs show important administrative actions such as user creation, updates, deletion, region management, and content changes.

## 6. Regional Admin Guide

The Regional Admin manages data within a specific region.

Main tasks:

- view regional dashboard
- manage doctors, midwives, and mothers in the assigned region
- review regional analytics
- manage educational content where permitted
- review audit logs and notifications
- manage support tickets

Regional Admin users should only create or modify records that belong to their assigned region.

## 7. Doctor Guide

Doctors use the web application for clinical follow-up.

### 7.1 Assigned Mothers

Doctors can:

- view assigned mothers
- inspect mother profile information
- review EPDS history
- review observation timeline
- generate patient summary reports

### 7.2 Medical Observation

Doctors can create and update doctor observations for assigned mothers. Observation records support care follow-up and high-risk monitoring.

### 7.3 Upcoming Checkups

Doctors can:

- schedule checkups
- update checkup details
- mark checkups as complete
- delete checkup records when allowed

### 7.4 Medication Management

Doctors can:

- prescribe medication
- update dosage, frequency, notes, and dates
- stop medication
- suggest medicines for the central medicine catalog

### 7.5 Messaging

Doctors can communicate with assigned mothers using secure conversation threads.

## 8. Midwife Guide

Midwives support community-level care and early monitoring.

### 8.1 Assigned Mothers

Midwives can view mother records assigned to them and inspect profile, EPDS, visit, medication, and observation summaries.

### 8.2 High-Risk Mothers

The High-Risk Mothers page helps midwives prioritize mothers who need closer follow-up.

### 8.3 Observations and Visits

Midwives can:

- create home or clinic observation records
- update observation details
- schedule visits
- update visit status
- delete visit records when permitted

### 8.4 Messaging

Midwives can communicate with assigned mothers through secure messaging.

## 9. Mother Mobile App Guide

### 9.1 Login

Mothers can log in using:

- OTP phone login
- email and password login

### 9.2 Biometric Unlock

After a successful login, the mother can enable biometric unlock. Biometric unlock only opens an existing valid session. It does not replace full authentication after logout or session expiry.

### 9.3 Home

The home page shows:

- latest EPDS score
- next check-in date
- care updates
- quick actions
- daily support reminders

### 9.4 Weekly Check-In

1. Open `Weekly Test` or the Check-In tab.
2. Read the instructions.
3. Choose a language.
4. Answer all EPDS questions.
5. Submit the check-in.
6. Review the score and recommended next steps.

Weekly check-ins are limited by the configured seven-day availability rule.

### 9.5 Chatbot Support

The Supportive Companion chatbot provides gentle emotional support and self-care suggestions. It does not provide a medical diagnosis.

### 9.6 Prescriptions

The mother can view active medication and medication history assigned by the doctor.

### 9.7 Notifications

Notifications include check-in reminders, message alerts, care team updates, appointment updates, and educational content notices.

### 9.8 Educational Resources

Mothers can view health and wellbeing resources published through the web application.

## 10. Guardian Mobile App Guide

Guardians can log in and view information for the linked mother. Guardian access supports family involvement and safety monitoring.

Guardian features include:

- linked mother wellbeing summary
- latest EPDS score and check-in status
- upcoming visits and checkups
- care team contact details
- notifications
- educational resources
- emergency contacts

## 11. Emergency Support

The system includes emergency contact pages for urgent support. If a mother, baby, guardian, or family member is in immediate danger, users should contact emergency services first.

## 12. Usage Notes

- Use correct role credentials during demonstrations.
- Do not share `.env.local` secrets in screenshots or reports.
- The mobile app and web app should use the same Firebase project during testing.
- The system supports care coordination and screening support, but it is not a replacement for professional medical diagnosis.
