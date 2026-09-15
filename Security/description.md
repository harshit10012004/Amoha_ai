# Security Module Description

The **Security** module (Purple team) is responsible for protecting patient data and ensuring compliance with the Personal Data Protection Act (PDPP). It provides:

- **OTP-based authentication** for caregiver login
- **End-to-end encryption** for sensitive data (encryption.js)
- **Access control** via ownership verification (`verifyOwnership`) integrated across backend routes
- **Secure session management** and token handling

## Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `server.js` | `Security/backend/` | Express backend with Supabase integration, OTP verification, and encrypted storage routes |
| `encryption.js` | `Security/backend/` | AES-256 encryption/decryption utilities for data at rest |
| `auth.js` | `Security/backend/` | OTP generation, verification, and session management |
| `api.ts` | `Security/frontend/` | TypeScript API client for security-related endpoints |
| `App.tsx` | `Security/frontend/` | Main security screen UI (login, OTP entry) |
| `ConsentScreen.tsx` | `Security/frontend/` | Informed consent display before data processing |
| `OTP.tsx` | `Security/frontend/` | OTP input component |

## How to Use

1. **Backend** – Ensure `supabase` credentials are set in `.env`. Run `npm install && npm start` in `Security/backend/`.
2. **Frontend** – The security screens are integrated into the main PWA flow. Users are prompted for OTP on first login; credentials are encrypted before storage.
3. **Development** – Add new encryption routines to `encryption.js` and expose routes in `server.js` as needed. All database operations should pass through `verifyOwnership` to enforce caregiver-recipient ownership.

## Compliance

- All personal data is encrypted using AES-256 before persistence.
- OTPs are time‑based and expire after 10 minutes.
- Access logs are written to `access_logs` table for audit trails.
- The module complies with PDPP Act requirements for patient data privacy.