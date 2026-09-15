# Purple Module - Security & Compliance Lead

## Role Overview
**Team Amoha** - Purple Module is responsible for protecting patient health data and ensuring compliance with India's PDPP (Personal Data Protection) Act. We're the guardian of trust in the Amoha system.

## 🎯 Key Responsibilities

### 1. Authentication & OTP Login Flow
- OTP-based caregiver login (SMS or app-generated OTP)
- Secure authentication that works on low-end phones
- Session management with proper expiration and refresh
- Consent withdrawal at any time through app settings
- Elderly-friendly login UI (large buttons, high contrast, clear text)

### 2. Data Encryption & Privacy Protection
- Encrypt all patient data at rest using AES-256
- Encrypt all data in transit with TLS 1.2+
- Manage encryption keys via environment variables (NOT in source code)
- Never store encryption keys in source code or .env files committed to version control
- Redact raw care-log text before any debug logging
- Never store PII (names, phone numbers, addresses, government IDs) in plaintext

### 3. Compliance with PDPP Act (India)
- Follow India's Personal Data Protection Principles
- Implement data minimization (only collect what's necessary)
- Provide caregiver consent management (affirmative, specific, informed, revocable)
- Maintain audit logs of all data access and analysis events
- Ensure cross-tenant data access is prohibited without explicit authorization

### 4. Security by Design
- Privacy-by-design approach throughout all modules
- Data minimization at every layer (frontend, backend, AI/ML)
- Secure defaults - nothing is exposed unless explicitly needed
- Role-based access control (caregiver, authorized staff, admin)
- Secure handling of consent versioning and timestamps

## 🔗 Integration Points

### 🟠 Orange (Frontend) Connection
- **You add:** Login screen with OTP verification
- **They provide:** User interface components, caregiver text input
- **Interaction:** 
  - Orange → Purple: "Here's the login flow design"
  - Purple → Orange: "Here are encryption standards for storage"
  - Caregiver logs in → Purple validates OTP → Orange shows main app
- **Key handoff:** Purple → Orange: "Consent screen design" → Orange builds UI

### 🟡 Yellow (Backend/Database) Connection
- **You add:** Login checks to APIs, consent validation, encryption middleware
- **They provide:** REST API endpoints, PostgreSQL database, user storage
- **Interaction:**
  - API calls must check: "Is user authenticated? Do they have consent?"
  - Yellow stores encrypted data + consent records
  - Yellow provides OTP verification service or API
- **Key handoff:** Purple → Yellow: "Add auth middleware to /care-log endpoint" → Yellow implements it

### 🟢 Green (AI/ML) Connection
- **You ensure:** Green's analysis respects consent and privacy
- **They provide:** `analyze_care_log()` function, analysis outputs
- **Interaction:**
  - Before calling Green's function: Verify caregiver has given consent
  - After analysis: Encrypt the output before storing
  - Output metadata must include consent version (e.g., "consent-v1.0")
  - Never send raw PII to Green's module - only sanitized text
- **Key constraint:** Green only receives `text` (care log) and `accuracy` - no PII

### 🔵 Blue (Offline) Connection
- **You ensure:** Offline storage is encrypted
- **They provide:** Local storage strategy, sync protocol
- **Interaction:**
  - Before storing data locally → encrypt with Purple's keys
  - After sync from cloud → data is already encrypted end-to-end
  - Blue implements encryption before local storage
- **Key handoff:** Purple → Blue: "Encrypt all offline patient data" → Blue → Local IndexedDB/SQLite

### 🔴 Red (Project Lead) Connection
- **You report:** Security compliance status, any data breaches or concerns
- **They coordinate:** Overall project timeline and compliance deadlines
- **Key deliverable:** Combined demo by Sept 11 that meets security requirements

## 📋 Key Deliverables

1. **Authentication Flow Implementation**
   - OTP verification system (SMS or app-generated)
   - Session management with expiration
   - Consent capture screen with these requirements:
     - Affirmative consent (not assumed)
     - Specific and informed (explains what data, purpose)
     - Revocable (user can withdraw at any time)
     - No preselected checkboxes
     - Consent version tracking (e.g., "consent-v1.0")

2. **API Security Middleware** (for Yellow)
   - Authenticate every API call (`POST /care-log`, `GET /suggestions`, `POST /analyze`)
   - Verify consent status before allowing analysis
   - Return 401 Unauthorized for unauthenticated calls
   - Return 403 Forbidden for insufficient permissions
   - Audit log all access attempts (success and failure)

3. **Encryption Implementation**
   - AES-256 encryption for all stored analysis outputs
   - TLS 1.2+ enforcement for all API communications
   - Key management via environment variables (NOT in source code)
   - `.env*` added to `.gitignore` to prevent accidental commits
   - Secret rotation procedure (every 90 days minimum)

4. **Data Privacy Controls**
   - Redact raw text before any logging
   - Never store full PII in analysis results
   - Use opaque user IDs (no names, phone numbers in ID itself)
   - Role-based access control enforcement
   - Cross-tenant data isolation

5. **Consent Management System**
   - Record consent version and timestamp per user
   - Enable consent withdrawal through app settings
   - Handle historical data per retention policy when consent withdrawn
   - Include consent version in all analysis metadata

## ⏰ Timeline & Milestones

### **Sept 4-5:** Foundation
- Set up `/security/` folder structure
- Design OTP login flow mockup
- Define encryption standards and key management
- Create consent screen UI design

### **Sept 5-8:** Core Security
- Implement OTP verification logic
- Add auth middleware to Yellow's APIs
- Implement encryption for data at rest
- Build consent capture and management flow

### **Sept 8-10:** Compliance & Robustness
- PDPP compliance review
- Audit log implementation
- Security testing (auth bypass attempts, data exposure)
- Fix any vulnerability findings

### **Sept 11:** Demo Day
- Fully secured app with login + consent flow
- All data encrypted and compliant
- End-to-end demo with proper security

## 💡 Pro Tips from the Team

1. **Start with OAuth2/JWT basics:** Begin with simple JWT-based auth before adding OTP complexity
2. **Console logs are dangerous:** Never log raw care-log text - always redact first. Even "anonymized" text can contain PII
3. **Environment variables, not .env commits:** Keep all secrets in environment variables; add `.env*` to `.gitignore` immediately
4. **Consent first, analysis second:** Never call Green's `analyze_care_log()` without verified consent. Build this check into Yellow's API middleware
5. **Opaque user IDs:** User IDs should be random strings, NOT phone numbers or names. This protects privacy if data is ever exposed
6. **Smallest possible data:** Yellow only sends Green the minimum needed (`text` + `accuracy`). Purple should ensure this principle extends everywhere
7. **Test the auth flow:** Have someone who hasn't seen the code try to bypass login, break the auth flow, or access data without consent
8. **Demo security matters:** Judges will look for proper auth flow, not just "it works." A secure demo impresses more than an insecure "feature-complete" one.

## 📁 Folder Structure

```
Security/
├── frontend/
│   ├── App.tsx              - Routes: /login → /otp → /consent → /home
│   ├── OTP.tsx              - OTP verification, navigates to consent screen
│   ├── ConsentScreen.tsx    - Consent screen with affirmative/specific/informed/revocable
│   ├── api.ts               - API functions: requestOtp(), verifyOtp(), updateConsent(), withdrawConsent()
│   └── ...other frontend files
└── backend/
    ├── auth.js              - JWT with consentVersion, returns 403 if consent missing
    ├── server.js            - Full security middleware, audit logging, all API endpoints
    ├── encryption.js        - AES-256 GCM encryption/decryption utilities
    └── data/
        └── db.json          - Updated with consent tracking fields
```

## Team Members & Connections

| Task | Connects To |
|------|-------------|
| Task 1: OTP Login Flow | 🟠 Orange (login UI), 🔴 Red (timeline compliance) |
| Task 2: API Security Middleware | 🟡 Yellow (REST APIs), 🟢 Green (analysis check), 🔵 Blue (offline), 🔴 Red (compliance) |
| Task 3: Encryption Standards | 🔵 Blue (offline encryption), 🟢 Green (encrypted outputs) |
| Task 4: Consent Management | 🟡 Yellow (consent records), 🔴 Red (compliance reporting) |
| Task 5: Data Privacy Controls | 🟢 Green (sanitized text), 🔵 Blue (offline data) |
| Task 6: Audit Log Implementation | 🔴 Red (reporting to project lead), 🟢 Green (analysis audit) |
| Task 7: Cross-Tenant Isolation | 🟡 Yellow (API permissions), 🔵 Blue (local storage segregation) |
| Task 8: Consent Withdrawal | 🟡 Yellow (records withdrawal), 🔴 Red (timeline), 🟢 Green (stops analysis) |

## Security Success Criteria

- [ ] OTP login works on low-end phones and spotty networks
- [ ] All API calls require valid authentication
- [ ] Caregiver data is encrypted at rest (AES-256)
- [ ] All data in transit uses TLS 1.2+
- [ ] Consent is captured, recorded, and revocable
- [ ] No PII stored in plaintext anywhere in the system
- [ ] Audit logs capture all access attempts
- [ ] System complies with India's PDPP Act principles
- [ ] Demo works end-to-end with proper security flow by Sept 11

---

**"Security isn't a feature - it's the foundation."**

In Amoha, we're handling sensitive health data from some of the most vulnerable people in society - dementia caregivers and their patients in India's North Eastern Region. A security breach isn't just about code; it's about breaking trust with people who are already dealing with enormous challenges.

Your work ensures that:
- A caregiver in a remote village can trust the app with Grandma's care data
- Patient privacy is never compromised for the sake of functionality
- The system complies with the law (PDPP Act) from day one
- Consent is real and revocable, not just a checkbox

You are the reason families can use Amoha with confidence. **Thank you for making trust a core part of Amoha, not an afterthought.**