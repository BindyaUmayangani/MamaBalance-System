# MamaBalance Firebase Setup

This repo now assumes a shared Firebase backend for:

- `mamabalance-web`: staff-only email/password sign-in
- `MamaBalance-Mobile`: mother email/password sign-in and mother phone OTP sign-in

## 1. Enable Firebase Authentication

Turn on these providers in Firebase Authentication:

- Email/Password
- Phone

Recommended:

- Configure an approved SMS region list for phone auth.
- Add authorized domains for the web app before testing email sign-in.

## 2. Use One Role Directory

Create a `users/{uid}` document for every authenticated account.

Minimum document shape:

```json
{
  "displayName": "Jane Doe",
  "email": "jane@example.com",
  "phoneNumber": "+94771234567",
  "role": "mother",
  "status": "active",
  "regionId": "western",
  "createdAt": "server timestamp",
  "updatedAt": "server timestamp"
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

## 3. How Access Works

### Mothers

- Mobile email/password login succeeds only when `users/{uid}.role == "mother"` and `status == "active"`.
- Mobile phone OTP login also checks the same document after Firebase verifies the phone number.
- For SMS login and OTP-based recovery to work for real mother accounts, the Firebase Auth user must also have the same `phoneNumber` provisioned on the auth record, not only in Firestore.

### Staff

- Web login accepts Firebase email/password sign-in first.
- The server then reads `users/{uid}` and creates a secure session cookie only for active staff roles.
- Each protected dashboard layout validates the cookie and the user role before rendering.

## 4. Web Environment Variables

Copy `mamabalance-web/.env.example` to `.env.local` and fill in your Firebase project values.

The web app needs:

- public Firebase web config
- Firebase Admin service account credentials for secure session cookies

## 5. Mobile Firebase Options

Replace the placeholder values in `MamaBalance-Mobile/lib/firebase_options.dart` with your project values.

If you prefer, you can regenerate that file with FlutterFire CLI and keep the rest of the auth code unchanged.

## 6. Firestore Rules

Deploy `firebase/firestore.rules` after reviewing the collection names you plan to use.

Current assumptions:

- mothers can read and update only their own profile-shaped mother document
- staff can read staff-facing collections
- account creation and role changes are handled by an admin workflow, not by public clients

## 7. Provisioning Accounts

For this first auth phase, accounts should be provisioned before login:

- Mothers: create Firebase Auth user, then create `users/{uid}` with role `mother`
- Mothers must be provisioned in Firebase Auth with both the login email/password and the normalized `phoneNumber`
- Staff: create Firebase Auth user, then create `users/{uid}` with one of the staff roles

This prevents unregistered users from gaining access just by verifying a phone number or knowing a password.
