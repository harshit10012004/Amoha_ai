# 🟣 Purple Module - Security & Compliance Lead
## Detailed Role Report for Team Amoha

---

## 👤 Your Role: Purple - Security & Compliance Lead

**Folder:** `/security/`

**Core Mission:** Protect patient health data and ensure Amoha complies with India's PDPP (Personal Data Protection) Act while keeping caregiver data private and secure. You're the guardian of trust in the Amoha system - ensuring that every caregiver and patient can trust the app with their most sensitive information.

---

## 🎯 Key Responsibilities

### 1. **Authentication & OTP Login Flow**
- Design **OTP-based** caregiver login (SMS or app-generated OTP)
- Implement secure authentication that works on low-end phones
- Handle session management with proper expiration and refresh
- Support **consent withdrawal** at any time through app settings
- Ensure login UI is elderly-friendly (large buttons, high contrast, clear text)

### 2. **Data Encryption & Privacy Protection**
- **Encrypt all patient data at rest** using AES-256 or equivalent
- **Encrypt all data in transit** with TLS 1.2+ (between Orange frontend and Yellow backend)
- Manage encryption keys via environment variables or secret management service
- **Never store encryption keys** in source code, .env files committed to version control, or client devices
- Redact raw care-log text before any debug logging
- Never store PII (names, phone numbers, addresses, government IDs) in plaintext

### 3. **Compliance with PDPP Act (India)**
- Follow India's Personal Data Protection Principles
- Implement data minimization (only collect what's necessary)
- Provide caregiver consent management (affirmative, specific, informed, revocable)
- Maintain audit logs of all data access and analysis events
- Ensure cross-tenant data access is prohibited without explicit authorization

### 4. **Security by Design**
- **Privacy-by-design** approach throughout all modules
- Data minimization at every layer (frontend, backend, AI/ML)
- Secure defaults - nothing is exposed unless explicitly needed
- Role-based access control (caregiver, authorized staff, admin)
- Secure handling of consent versioning and timestamps

---

## 🔗 Integration Points (How You Connect to Others)

### **🟠 Orange (Frontend) Connection**
- **You add:** Login screen with OTP verification
- **They provide:** User interface components, caregiver text input
- **Interaction:** 
  - Orange → Purple: "Here's the login flow design"
  - Purple → Orange: "Here are encryption standards for storage"
  - Caregiver logs in → Purple validates OTP → Orange shows main app
- **Key handoff:** Purple → Orange: "Consent screen design" → Orange builds UI

> **From the project docs:** "Purple protects patient health data. Connects to: Yellow (adds login checks to APIs), Orange (adds login screen), Blue (encrypts offline storage)."

### **🟡 Yellow (Backend/Database) Connection**
- **You add:** Login checks to APIs, consent validation, encryption middleware
- **They provide:** REST API endpoints, PostgreSQL database, user storage
- **Interaction:**
  - API calls must check: "Is user authenticated? Do they have consent?"
  - Yellow stores encrypted data + consent records
  - Yellow provides OTP verification service or API
- **Key handoff:** Purple → Yellow: "Add auth middleware to /care-log endpoint" → Yellow implements it

> **From the project docs:** "Yellow builds the plumbing. Connects to: Blue (syncs offline data to the cloud), Purple (enforces security rules on APIs)."

### **🟢 Green (AI/ML) Connection**
- **You ensure:** Green's analysis respects consent and privacy
- **They provide:** `analyze_care_log()` function, analysis outputs
- **Interaction:**
  - Before calling Green's function: Verify caregiver has given consent
  - After analysis: Encrypt the output before storing
  - Output metadata must include consent version (e.g., "consent-v1.0")
  - Never send raw PII to Green's module - only sanitized text
- **Key constraint:** Green only receives `text` (care log) and `accuracy` - no PII

> **From the project docs:** "Green builds the brain that reads text and gives advice. Connects to: Yellow (Yellow will import your function or call your mock API)."

### **🔵 Blue (Offline) Connection**
- **You ensure:** Offline storage is encrypted
- **They provide:** Local storage strategy, sync protocol
- **Interaction:**
  - Before storing data locally → encrypt with Purple's keys
  - After sync from cloud → data is already encrypted end-to-end
  - Blue implements encryption before local storage
- **Key handoff:** Purple → Blue: "Encrypt all offline patient data" → Blue → Local IndexedDB/SQLite

> **From the project docs:** "Purple connects to: Blue (encrypts offline storage)."

### **🔴 Red (Project Lead) Connection**
- **You report:** Security compliance status, any data breaches or concerns
- **They coordinate:** Overall project timeline and compliance deadlines
- **Key deliverable:** Combined demo by Sept 11 that meets security requirements

---

## 📋 Your Key Deliverables

### 1. **Authentication Flow Implementation**
- OTP verification system (SMS or app-generated)
- Session management with expiration
- Consent capture screen with these requirements:
  - [ ] Affirmative consent (not assumed)
  - [ ] Specific and informed (explains what data, purpose)
  - [ ] Revocable (user can withdraw at any time)
  - [ ] No preselected checkboxes
  - [ ] Consent version tracking (e.g., "consent-v1.0")

### 2. **API Security Middleware** (for Yellow)
- Authenticate every API call (`POST /care-log`, `GET /suggestions`, `POST /analyze`)
- Verify consent status before allowing analysis
- Return 401 Unauthorized for unauthenticated calls
- Return 403 Forbidden for insufficient permissions
- Audit log all access attempts (success and failure)

### 3. **Encryption Implementation**
- AES-256 encryption for all stored analysis outputs
- TLS 1.2+ enforcement for all API communications
- Key management via environment variables (NOT in source code)
- `.env*` added to `.gitignore` to prevent accidental commits
- Secret rotation procedure (every 90 days minimum)

### 4. **Data Privacy Controls**
- Redact raw text before any logging
- Never store full PII in analysis results
- Use opaque user IDs (no names, phone numbers in ID itself)
- Role-based access control enforcement
- Cross-tenant data isolation

### 5. **Consent Management System**
- Record consent version and timestamp per user
- Enable consent withdrawal through app settings
- Handle historical data per retention policy when consent withdrawn
- Include consent version in all analysis metadata

---

## 🧪 Testing Your Security Implementation

### **Test Scenarios**

| Scenario | Expected Behavior |
|----------|-------------------|
| App opens without login | Must redirect to OTP login screen |
| Invalid OTP entered | Show error, allow retry (max 3 attempts) |
| Care log submitted without consent | Must prompt for consent first |
| Analysis requested by unauthenticated user | Return 401 Unauthorized |
| Caregiver views another user's data | Return 403 Forbidden |
| Data stored offline | Must be encrypted (AES-256) |
| API calls over HTTP | Must be rejected, enforce HTTPS/TLS |
| Consent withdrawn | Stop further analysis, handle historical data |

### **Success Criteria for Purple**
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

---

## 💡 Pro Tips from the Team

1. **Start with OAuth2/JWT basics:** The docs mention OAuth2 and JWT - begin with simple JWT-based auth before adding OTP complexity

2. **Console logs are dangerous:** Never log raw care-log text - always redact first. Even "anonymized" text can contain PII

3. **Environment variables, not .env commits:** Keep all secrets in environment variables; add `.env*` to `.gitignore` immediately

4. **Consent first, analysis second:** Never call Green's `analyze_care_log()` without verified consent. Build this check into Yellow's API middleware

5. **Opaque user IDs:** User IDs should be random strings, NOT phone numbers or names. This protects privacy if data is ever exposed

6. **Smallest possible data:** Yellow only sends Green the minimum needed (`text` + `accuracy`). Purple should ensure this principle extends everywhere

7. **Test the auth flow:** Have someone who hasn't seen the code try to bypass login, break the auth flow, or access data without consent

8. **Demo security matters:** Judges will look for proper auth flow, not just "it works." A secure demo impresses more than an insecure "feature-complete" one.

---

## 📚 Resources & References

- **Project Description:** `/description.txt` - full architecture and integration
- **Consent Requirements:** `Amoha_ai_ml/docs/CONSENT_TEXT.md` - consent must be affirmative, specific, informed, revocable
- **Privacy Notes:** `Amoha_ai_ml/docs/AI_PRIVACY_NOTE.md` - data minimization, production vs demo distinctions
- **Access Control:** `Amoha_ai_ml/docs/ACCESS_CONTROL_SPEC.md` - roles (caregiver/authorized_staff/admin), permissions, scoping
- **Encryption Standards:** `Amoha_ai_ml/docs/ENCRYPTION_NOTE.md` - TLS 1.2+, AES-256 at rest, secret management
- **Green's brain.py:** `/amoha_ai/Amoha_ai_ml/brain.py` - ensure no PII is sent to this module
- **Yellow's API endpoints:** `POST /care-log`, `GET /suggestions`, plus auth middleware needs
- **PDPP Act (India):** Familiarize with India's Personal Data Protection principles
- **JWT/OAuth2:** Standard authentication libraries for your tech stack

---

## 🎯 Final Thought

**"Security isn't a feature - it's the foundation."**

In Amoha, we're handling sensitive health data from some of the most vulnerable people in society - dementia caregivers and their patients in India's North Eastern Region. A security breach isn't just about code; it's about breaking trust with people who are already dealing with enormous challenges.

Your work ensures that:
- A caregiver in a remote village can trust the app with Grandma's care data
- Patient privacy is never compromised for the sake of functionality
- The system complies with the law (PDPP Act) from day one
- Consent is real and revocable, not just a checkbox

You are the reason families can use Amoha with confidence. **Thank you for making trust a core part of Amoha, not an afterthought.**

---

*This report covers your role from start to finish: understanding the architecture, connecting with teammates, implementing security and compliance, and delivering a demo that meets PDPP standards by Sept 11.*

**Key reminder:** Your success is tied to the project's overall success - without proper security and consent, the app cannot ethically launch, regardless of how well the other modules work.