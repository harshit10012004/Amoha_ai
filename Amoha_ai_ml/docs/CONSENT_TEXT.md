# AMOHA Green AI Consent Text

## Plain-Language Consent Snippet

I agree that my caregiver-entered routine logs and game-performance data may be analyzed to provide personalized, non-medical support suggestions. I understand that:

- The system does not diagnose conditions or make medical decisions.
- The outputs are support signals for caregivers and clinicians.
- My data is handled according to the privacy and encryption notes.
- I can withdraw consent at any time through the app.

## Consent Requirements

### 1. Affirmative Consent
- Consent must be explicitly given (not assumed or pre-selected).
- No default "opt-out" settings that function as consent.

### 2. Specific and Informed
- Consent must specify what data is being analyzed (care logs, game performance).
- Must explain the purpose (personalized support suggestions, not diagnosis).
- Must explain that outputs are non-clinical.

### 3. Revocable
- User can withdraw consent at any time through the app settings.
- Withdrawal must stop further analysis for that user.
- Historical data must be handled according to retention policy.

### 4. No Preselected Consent
- The app must not have preselected consent checkboxes.
- Consent UI must require active user choice.

### 5. Consent Versioning
- Each consent record includes a version identifier (e.g., "consent-v1.0").
- Timestamp of consent given is recorded.
- Version is included in all analysis metadata (model_version field).

## 6. Implementation Notes

- The implementation must record consent version and timestamp when consent is given.
- Production legal review is required for this document.
- This document is not formal legal advice.