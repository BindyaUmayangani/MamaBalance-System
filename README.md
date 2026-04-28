# MamaBalance

MamaBalance is a maternal mental health monitoring and care coordination system. It connects mothers, guardians, doctors, midwives, regional administrators, and superadmins through a web portal and a Flutter mobile app.

The system supports postpartum wellbeing monitoring using EPDS weekly check-ins, care team follow-up, visits, checkups, prescriptions, notifications, educational resources, secure messaging, and AI-assisted supportive chatbot interaction.

## Project Purpose

Postpartum mothers may need regular emotional wellbeing monitoring and timely support from healthcare providers. Manual follow-up can become difficult when doctors and midwives manage many mothers across different regions.

MamaBalance provides a digital platform to:

- help mothers complete regular EPDS wellbeing check-ins
- help care teams identify mothers who may need closer follow-up
- coordinate visits, checkups, prescriptions, observations, and messages
- provide educational resources and notifications
- give administrators tools for account, region, content, medicine, analytics, and audit management

## Applications

| Application | Users | Description |
|---|---|---|
| `mamabalance-web` | Superadmin, Regional Admin, Doctor, Midwife | Next.js web portal and centralized backend API. |
| `MamaBalance-Mobile` | Mother, Guardian | Flutter mobile app for wellbeing, care updates, resources, messaging, and profile access. |

## Architecture

```text
Web Browser
  |
  | HTTPS / Fetch
  v
mamabalance-web
Next.js Web App + API Routes
  |
  | Firebase Admin SDK
  v
Firebase Auth / Firestore / Storage
  ^
  |
  | Firebase Auth token + /api/mobile calls
  |
Flutter Mobile App
```

The mobile app keeps Firebase Authentication client-side for login and session tokens. Protected app data is loaded through the centralized `mamabalance-web` backend API.

## Main Features

### Web Portal

- Role-based login for Superadmin, Regional Admin, Doctor, and Midwife users.
- User management for mothers, guardians, doctors, midwives, and admins.
- Personal email login support for mothers and staff.
- Region management.
- Mother profile and care summary views.
- Doctor observations and checkup scheduling.
- Midwife observations and visit management.
- Medication and medicine catalog management.
- Educational content management.
- Secure care messaging.
- Notifications.
- Analytics dashboards and report export support.
- Audit logs and support tickets.
- Success toast feedback for create, update, and delete actions.

### Mobile App

- Mother and Guardian access.
- Personal email and password login for mothers.
- Phone OTP login.
- Email OTP forgot password flow for mother email login.
- Optional biometric unlock.
- Home dashboard with EPDS score, last test date, next check-in, and care updates.
- Weekly EPDS check-in.
- AI-assisted supportive chatbot.
- Secure messaging with assigned doctor or midwife.
- Prescriptions, visits, and checkups.
- Notifications and educational resources.
- Profile management with profile image upload and initials fallback.
- Guardian linked mother summary.

## Tech Stack

| Layer | Technology |
|---|---|
| Web | Next.js, React, TypeScript |
| Mobile | Flutter, Dart |
| Backend | Next.js API Routes |
| Authentication | Firebase Authentication |
| Database | Cloud Firestore |
| Storage | Firebase Storage |
| Admin SDK | Firebase Admin SDK |
| SMS Gateway | Notify.lk |
| AI Chatbot API | OpenAI API |
| Charts and Reports | Recharts, jsPDF, html2canvas |
| Testing | Vitest, Flutter test |
| Version Control | Git and GitHub |

## Repository Structure

```text
MamaBalance-System/
+-- mamabalance-web/        # Web portal and centralized backend API
+-- MamaBalance-Mobile/     # Flutter mobile app
+-- firebase/               # Firebase rules and schema notes
+-- documents/              # Final year project documentation
+-- README.md               # Main repository overview
+-- LICENSE                 # Academic-use license
```

## Documentation

Detailed documentation is available in the `documents/` folder.

| Document | Purpose |
|---|---|
| `SYSTEM_OVERVIEW.md` | Overall project explanation, problem domain, modules, and outcome. |
| `SYSTEM_DESIGN.md` | Architecture, role-based design, API design, and backend flow. |
| `REQUIREMENTS_SPECIFICATION.md` | Functional and non-functional requirements. |
| `DATABASE_DESIGN.md` | Firestore collections, fields, relationships, and integrity notes. |
| `API_DOCUMENTATION.md` | API route groups, examples, auth rules, and error handling. |
| `ROLE_GUIDE.md` | User roles, permissions, workflows, and permission matrix. |
| `USER_GUIDE.md` | How each role uses the system. |
| `INSTALLATION_GUIDE.md` | Setup instructions for web, mobile, Firebase, and local demo. |
| `TESTING_DOCUMENTATION.md` | Testing scope and sample test cases. |

Project-specific READMEs are also available:

- `mamabalance-web/README.md`
- `MamaBalance-Mobile/README.md`

## Quick Start

### 1. Start The Web App

```powershell
cd mamabalance-web
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

For mobile testing on a physical phone, run the web server on all network interfaces:

```powershell
npm run dev -- --hostname 0.0.0.0
```

### 2. Start The Mobile App

```powershell
cd MamaBalance-Mobile
flutter pub get
flutter run --dart-define=MAMABALANCE_API_BASE_URL=http://YOUR_PC_IP:3000
```

See `documents/INSTALLATION_GUIDE.md` for the full setup guide.

## Environment Configuration

The project requires Firebase, Notify.lk, and OpenAI API configuration for the complete feature set. Environment setup details are documented in `documents/INSTALLATION_GUIDE.md`.

## Mobile Backend Notes

The mobile app should use the web backend for protected data:

- session validation
- user context
- profile
- check-ins
- visits
- checkups
- prescriptions
- notifications
- educational resources
- messaging
- guardian dashboard

Firebase Auth remains on the mobile client only for login and session token generation.

## Security And Privacy

MamaBalance handles sensitive maternal wellbeing and care data. The system is designed with:

- role-based access control
- Firebase Authentication
- server-side API authorization checks
- linked mother profile validation
- assignment-based doctor and midwife access
- guardian access restrictions
- audit logs for important administrative actions

EPDS scores are screening support only and should not be treated as a final diagnosis. The chatbot provides supportive guidance only and should not replace professional medical advice.

## License

This project is prepared for academic use as a final year project. See [LICENSE](LICENSE) for usage terms.
