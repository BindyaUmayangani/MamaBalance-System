# User Guide

## 1. Introduction
This document explains how the MamaBalance system can be used after installation. The system supports multiple user roles across web and mobile platforms.

The main user groups are:

- `Superadmin`
- `Regional Admin`
- `Doctor`
- `Midwife`
- `Mother`

## 2. System Overview
MamaBalance is designed to support maternal mental wellbeing monitoring and care coordination.

The web system supports:

- administration and user management
- mother management
- observations and visits
- medications
- analytics and reports
- educational content
- notifications and audit logs

The mobile application supports:

- OTP login
- biometric quick unlock
- weekly EPDS check-ins
- chatbot support
- prescription viewing
- notifications
- educational resources

## 3. Web Application Operation

### 3.1 Logging In
To access the web application:

1. Open the MamaBalance web application in a browser.
2. Enter a valid email and password.
3. Click `Login`.
4. The system redirects the user to the correct dashboard based on their role.

### 3.2 Logging Out
To log out:

1. Open the user profile or account menu.
2. Click `Logout`.
3. The system ends the session and returns to the login page.

## 4. Superadmin Functions
The Superadmin has full system access.

Main operations include:

- managing regions
- managing administrators, doctors, midwives, and mothers
- reviewing analytics and reports
- managing educational content
- reviewing audit logs

Typical workflow:

1. Open the dashboard.
2. Navigate to `User Management`.
3. Add, edit, search, or filter users.
4. Open analytics pages and export reports when needed.

## 5. Regional Admin Functions
The Regional Admin manages data within an assigned region.

Main operations include:

- managing mothers within the region
- viewing region-specific analytics
- exporting regional reports
- reviewing regional observation information

Typical workflow:

1. Open `Mother Management`.
2. Search or filter mother records.
3. Open `View` or `Observations` for details.
4. Use `Analytics` to review and export regional data.

## 6. Doctor Functions
The Doctor is responsible for clinical follow-up and assigned mothers.

Main operations include:

- reviewing assigned mothers
- reviewing observations
- managing medications
- reviewing analytics
- communicating with mothers

Typical workflow:

1. Open `Assigned Mothers`.
2. Review a mother profile using the `View` modal.
3. Review a mother timeline using the `Observation` modal.
4. Open `Observations and Visits` to create or review observation records.
5. Open `Medication Management` to add, update, or stop medications.

## 7. Midwife Functions
The Midwife is responsible for community-level follow-up and monitoring.

Main operations include:

- reviewing assigned mothers
- reviewing high-risk mothers
- recording home and clinic observations
- reviewing upcoming visits
- communicating with mothers

Typical workflow:

1. Open `Assigned Mothers` or `High Risk Mothers`.
2. Use `View` to open the mother profile modal.
3. Use `Observation` to open the observation overview modal.
4. Open `Observations and Visits` to review or create observation records.
5. Open `Upcoming Visits` to manage scheduled visits.

## 8. Mother Mobile Application Operation

### 8.1 OTP Login
To log in to the mobile application:

1. Open the app.
2. Enter the required phone number or login details.
3. Request OTP.
4. Enter the OTP.
5. After verification, the app opens the mother home screen.

### 8.2 Biometric Quick Unlock
Biometric quick unlock is optional.

How it works:

1. Log in first using OTP.
2. Choose to enable fingerprint or face unlock.
3. Confirm using the device biometric prompt.
4. On the next access, use biometrics to unlock the saved session.

Important notes:

- biometrics do not replace OTP login
- biometrics only unlock an existing authenticated session
- full OTP login is required after logout or session expiry

### 8.3 Home Screen
The home screen provides:

- a welcome summary
- EPDS score information
- quick action cards
- reminders and care updates

Quick actions may include:

- weekly test
- prescription
- messages
- chatbot support

### 8.4 Weekly Check-In
To complete the weekly EPDS test:

1. Tap `Weekly Test`.
2. Answer all EPDS questions.
3. Submit the check-in.
4. Review the result and any related guidance.

### 8.5 Chatbot
The `Supportive Companion` chatbot can be used for emotional support and educational guidance.

To use it:

1. Open the chatbot page.
2. Type a message or select a quick prompt.
3. Read the response.
4. Continue the conversation as needed.

The chatbot is designed to:

- provide supportive conversation
- give calm and practical guidance
- avoid diagnosis
- escalate more strongly when severe distress is detected

### 8.6 Clearing Chat History
To clear the saved chatbot conversation:

1. Open the chatbot page.
2. Tap the clear icon.
3. Confirm the clear action in the confirmation dialog.

### 8.7 Notifications
The notifications section informs the mother about:

- check-in reminders
- care team updates
- messages
- visit schedules
- educational resources

### 8.8 Prescriptions
To review medication information:

1. Open `Prescription`.
2. Review active medications.
3. Review medication history if available.

### 8.9 Educational Resources
To access learning materials:

1. Open `Resources`.
2. Select an available resource.
3. Read the resource details or open the attached content.

## 9. Using View and Observation Modals on Web
Several web pages use `View` and `Observation` modals.

How to use them:

1. Open the relevant page such as `Mother Management`, `Assigned Mothers`, or `High Risk Mothers`.
2. Click `View` to see mother details.
3. Click `Observation` to see the observation overview.
4. Scroll inside the modal to see all content.

Important note:

- the scrollbar appears inside the modal, not on the page behind it

## 10. Using Export Report Modals
The analytics pages allow export of PDF reports.

To export a report:

1. Open the appropriate analytics page.
2. Click `Export Reports`.
3. Review the export dialog settings.
4. Click `Export PDF`.

## 11. Recommended Demonstration Scenarios

### 11.1 Web Demonstration

1. Log in as Superadmin.
2. Open `Mother Management`.
3. Search for a mother.
4. Open `View`.
5. Open `Observations`.
6. Open analytics and export a report.

### 11.2 Midwife Demonstration

1. Log in as Midwife.
2. Open `Assigned Mothers`.
3. Open a mother profile modal.
4. Open the observation modal.
5. Open `Observations and Visits`.
6. View an observation record.

### 11.3 Mobile Demonstration

1. Log in with OTP.
2. Enable biometric quick unlock.
3. Reopen the app and unlock with fingerprint.
4. Complete a weekly check-in.
5. Open the chatbot and send a support message.
6. Open notifications and profile.

## 12. Important Usage Notes

- Ensure each role uses the correct account credentials.
- For mobile demonstration, use a physical phone if biometric features are required.
- Keep the web app and mobile app connected to the same backend during the demo.
- Do not share secret environment variables in demonstration documents or screenshots.

## 13. Conclusion
The MamaBalance system supports both administrative workflows and mother-facing wellbeing support. The web application is used by care staff and administrators, while the mobile application supports mothers through check-ins, chatbot guidance, biometric quick unlock, notifications, and care information access.
