# AMOHA Pitch Slides

## Slide 1 — Problem

**Caregiver logs are unstructured.**
- Caregivers enter free-text observations about daily routines.
- Important routine signals (missed medication, agitation, sleep issues) can be difficult to notice amid unstructured text.

**Static reminders do not adapt well to individual patterns.**
- Fixed reminder schedules do not adapt to individual behavior patterns.
- A single missed reminder should not automatically increase reminder frequency.
- Patterns vary significantly between users; one-size-fits-all approaches fail.

**Game accuracy provides additional signal.**
- Cognitive game performance can indicate routine stability.
- However, static difficulty adjustments miss individual patterns.

## Slide 2 — AI Logic

```text
Care log + game behavior
        ↓
Local NLP tags + engineered features
        ↓
Classical ML + safe rule controllers
        ↓
Explainable support suggestions
```

**Detailed flow:**

1. **Care log + game behavior**: Orange frontend collects caregiver-entered text and game accuracy score.

2. **Local NLP tags + engineered features**: Green module's rule-based tagger identifies behavioral tags (agitation, sleep_issue, med_missed, confusion, good_day). Feature engineering extracts numeric features from tags and accuracy.

3. **Classical ML + safe rule controllers**: Assistance probability model (Logistic Regression / Random Forest) predicts likelihood of needing routine assistance. Adaptive difficulty controller adjusts game difficulty based on accuracy thresholds (0.60 and 0.90) with hysteresis.

4. **Explainable support recommendations**: Recommendation engine generates supportive, caregiver-reviewable suggestions based on tags, assistance probability, difficulty output, and adherence features. All outputs include disclaimers that they are non-clinical support signals.

**Key safety properties:**
- No medical diagnoses or severity estimates.
- Assistance probability is not a diagnosis.
- Alert levels are support-oriented (info, support, caregiver_review).
- Single missed event does not trigger automatic changes.
- Hysteresis prevents rapid difficulty/reminder changes.

## Slide 3 — Integration and Safety

- **Orange UI**: Caregiver-facing interface for log entry and game interaction.
- **Yellow API/database**: Backend API (/analyze) and data storage with proper schemas.
- **Green AI/ML**: Local rule-based NLP, classical ML models, adaptive controllers — offline-first, no network required for core analysis.
- **Blue offline sync**: Ensures app works without internet; syncs when connectivity restores.
- **Purple privacy and access control**: Data minimization, TLS, encryption at rest, role-based access, consent management.
- **Non-diagnostic outputs**: All AI outputs are support signals; caregivers and clinicians make medical decisions.
- **Caregiver review**: All suggestions are reviewable by caregivers; no automatic medical actions.

### Daily Status Update Template

```
Done: <completed task>
Blocked: <blocker or None>
Next: <next task>
```

The project lead needs a three-line update every day by 6 PM. This template is included in the documentation; messages are not sent automatically.