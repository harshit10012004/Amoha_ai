# AMOHA Green AI Privacy Note

## 1. Purpose

This document describes the privacy characteristics of the AMOHA Green AI/ML module. It applies to the demo version (demo-v0.1) and describes demo assumptions versus production requirements.

## 2. Data Minimization

The AI module receives only the minimum data necessary for analysis:

**Required inputs:**
- `text`: Caregiver-entered care log text (short descriptive string)
- `accuracy`: Game accuracy score in [0, 1]
- Optional: `behavioral_features`: Structured behavioral features (completion_rate, missed_rate, etc.)

**Never sent to AI module:**
- Full names
- Phone numbers
- Addresses
- Government IDs
- Genetic data
- Raw medical records
- Unrelated location history
- Full conversation history

## 3. Demo Assumptions

- In this demo, minimal synthetic data is used.
- No real caregiver or patient data is collected or stored.
- All analysis is performed locally offline.
- No network calls are made by the core Green module.

## 4. Production Requirements

- TLS 1.2+ for all data in transit between Orange frontend and Yellow backend.
- Encryption at rest for stored AI outputs and metadata.
- No secrets (API keys, etc.) in source code or client-side code.
- Audit logging of all analysis events (see ACCESS_CONTROL_SPEC.md).
- Role-based access control (see ACCESS_CONTROL_SPEC.md).
- Consent recorded and manageable per user (see CONSENT_TEXT.md).

## 5. Distinction: Demo vs Production

| Aspect | Demo | Production |
|---|---|---|
| Data source | Synthetic/labeled data | Real caregiver-entered data |
| Storage | In-memory / ephemeral | Persistent with retention policy |
| Transmission | Local process only | TLS-encrypted APIs |
| Identifiability | Opaque IDs only | User-scoped with consent |
| Legal review | Not required | Required |

## 6. Key Principles

- **Data minimization**: Only necessary data is processed.
- **Offline-first**: Core analysis never requires network access.
- **Non-diagnostic outputs**: All outputs are support signals, not medical conclusions.
- **User control**: Consent can be withdrawn; data can be deleted.