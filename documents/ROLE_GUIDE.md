# MamaBalance Role Guide

## 1. Purpose

This document explains each MamaBalance role, its platform access, permissions, and main workflows.

## 2. Role Summary

| Role | Platform | Access Level |
|---|---|---|
| Superadmin | Web | Full system access. |
| Regional Admin | Web | Region-specific administrative access. |
| Doctor | Web | Assigned mother clinical access. |
| Midwife | Web | Assigned mother community care access. |
| Mother | Mobile | Own wellbeing and care information. |
| Guardian | Mobile | Linked mother support information. |

## 3. Superadmin

### Access

The Superadmin can access:

- Dashboard
- Region Management
- Admin Management
- User Management
- Medicine Management
- Educational Content
- Analytics Reports
- Audit Logs
- Notifications
- Settings
- Help and Support

### Permissions

The Superadmin can:

- create, update, and delete regional admins
- create, update, and delete doctors
- create, update, and delete midwives
- create, update, and delete mothers
- create and delete regions
- manage educational resources
- manage medicine catalog records
- review medicine suggestions
- view platform analytics
- view audit logs
- manage support tickets

### Main Workflow

1. Log in as Superadmin.
2. Review dashboard.
3. Create regions and staff accounts.
4. Register mothers and assign care staff.
5. Monitor analytics and audit logs.
6. Manage educational content and medicines.

## 4. Regional Admin

### Access

The Regional Admin can access:

- Regional Dashboard
- Regional User Management
- Educational Content
- Medicine Management
- Analytics
- Audit Logs
- Notifications
- Settings
- Help and Support

### Permissions

The Regional Admin can:

- manage mothers in the assigned region
- manage doctors and midwives in the assigned region
- view regional analytics
- review regional audit activity where permitted
- manage regional content workflows where permitted

### Main Workflow

1. Log in as Regional Admin.
2. Review regional dashboard.
3. Manage users in the assigned region.
4. Review regional analytics.
5. Follow up notifications and support tickets.

## 5. Doctor

### Access

The Doctor can access:

- Doctor Dashboard
- Assigned Mothers
- Medical Observation
- Upcoming Checkup
- Medication Management
- Messaging
- Analytics
- Notifications
- Settings
- Help and Support

### Permissions

The Doctor can:

- view mothers assigned to them
- view mother care summaries
- create and update doctor observations
- schedule, update, and delete checkups
- prescribe and update medications
- stop medication
- suggest new medicines
- message assigned mothers
- review doctor-specific notifications and analytics

### Main Workflow

1. Log in as Doctor.
2. Review assigned mothers and high-priority updates.
3. Open mother summary.
4. Record clinical observation.
5. Schedule checkup if required.
6. Add or update medication.
7. Message the mother when follow-up is needed.

## 6. Midwife

### Access

The Midwife can access:

- Midwife Dashboard
- Assigned Mothers
- High-Risk Mothers
- Observations and Visits
- Upcoming Visits
- Messaging
- Analytics
- Notifications
- Settings
- Help and Support

### Permissions

The Midwife can:

- view assigned mothers
- view high-risk mother list
- create and update midwife observations
- create, update, and delete visits
- view medication information for assigned mothers
- message assigned mothers
- review midwife-specific notifications and analytics

### Main Workflow

1. Log in as Midwife.
2. Review assigned and high-risk mothers.
3. Open mother summary.
4. Schedule or update visits.
5. Record observation notes.
6. Message the mother or coordinate with care team.

## 7. Mother

### Access

The Mother uses the mobile application.

Mother features include:

- login using OTP or email/password
- optional biometric unlock
- home wellbeing dashboard
- weekly EPDS check-in
- EPDS score result and recommendations
- chatbot support
- secure messaging
- notifications
- prescriptions
- educational resources
- profile management
- emergency contacts

### Permissions

The Mother can:

- view and update her profile
- complete weekly EPDS check-ins
- view her own prescriptions
- view her own care updates
- message assigned care staff
- view educational content
- access emergency support information

### Main Workflow

1. Log in to the mobile app.
2. Review home dashboard.
3. Complete weekly check-in when available.
4. View result and guidance.
5. Review prescriptions and notifications.
6. Contact care team or use chatbot support when needed.

## 8. Guardian

### Access

The Guardian uses the mobile application.

Guardian features include:

- login
- linked mother dashboard
- latest wellbeing and check-in summary
- upcoming visits and checkups
- care team contact information
- educational resources
- notifications
- emergency contacts

### Permissions

The Guardian can:

- view linked mother support summary
- view care schedule information
- view emergency guidance
- access selected educational resources
- receive support-related notifications

The Guardian cannot replace the mother's account or edit clinical records.

## 9. Permission Matrix

| Feature | Superadmin | Regional Admin | Doctor | Midwife | Mother | Guardian |
|---|---|---|---|---|---|---|
| Manage regions | Yes | No | No | No | No | No |
| Manage regional admins | Yes | No | No | No | No | No |
| Manage doctors | Yes | Region only | No | No | No | No |
| Manage midwives | Yes | Region only | No | No | No | No |
| Manage mothers | Yes | Region only | Assigned view | Assigned view | Own profile | Linked summary |
| EPDS check-in | No | View analytics | View summary | View summary | Submit | View summary |
| Doctor observations | View | View region | Create/update | View | No | No |
| Midwife observations | View | View region | View | Create/update | No | No |
| Visits | View | View region | View | Create/update/delete | View own | View linked |
| Checkups | View | View region | Create/update/delete | View | View own | View linked |
| Medication | Manage catalog | Manage catalog where permitted | Create/update/stop | View | View own | View linked summary |
| Messaging | No | No | Assigned mothers | Assigned mothers | Assigned staff | No |
| Educational content | Manage | Manage where permitted | View | View | View | View |
| Analytics | Platform | Region | Role scope | Role scope | No | No |
| Audit logs | Yes | Region scope | No | No | No | No |
| Support tickets | Manage | Use/manage where permitted | Use | Use | No | No |

## 10. Safety and Privacy Notes

- Mother data is sensitive and should only be viewed by authorized users.
- Doctors and midwives should only access assigned mother records.
- Guardians should only access linked mother summaries.
- EPDS scores are screening support, not a final diagnosis.
- Emergency contacts should be used when immediate safety support is needed.
