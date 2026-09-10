# AMOHA Green Demo Script

## 60-90 Second Spoken Demo Narrative

**(Opening - 10 seconds)**
"Welcome to AMOHA. I'm going to show you how our Green AI module helps caregivers support dementia patients through routine logging and analysis."

**(Step 1 - Caregiver opens "Log an Issue" - 15 seconds)**
"The caregiver opens the 'Log an Issue' interface on their phone. They type a sample sentence about a routine concern. For example: 'Dad forgot afternoon medication.'"

**(Step 2 - Text and accuracy sent - 15 seconds)**
"The Orange frontend sends the text and a game accuracy score (for example, 0.75) to the Yellow backend."

**(Step 3 - Yellow calls Green analysis - 15 seconds)**
"The Yellow service imports the analyze_care_log function from the Green module, passing the text and accuracy. The Green brain analyzes the text using rule-based NLP tagging and behavioral feature analysis."

**(Step 4 - Tags and assistance probability - 15 seconds)**
"The system tags the text. In this case, it detects 'med_missed' with high confidence. It also computes an assistance probability of about 0.8, indicating that additional routine assistance may be helpful. The alert level is 'support', not a medical diagnosis."

**(Step 5 - Caregiver-safe suggestion appears - 10 seconds)**
"A caregiver-safe suggestion appears on screen: 'Please check the caregiver plan for medication timing.' The output always includes the disclaimer that this is not a diagnosis."

**(Step 6 - Optional TTS - 5 seconds)**
"If the device has text-to-speech enabled, a respectful voice reads the result: 'A missed medication entry was noticed. Please check the caregiver plan.'"

**(Step 7 - Explanation of non-diagnostic output - 5 seconds)**
"The system explains: 'The output is based on routine and behavioral features. This is not a medical diagnosis. Caregivers and qualified clinicians remain responsible for all medical decisions.'"

**(Step 8 - Offline fallback - 5 seconds)**
"If the device has no internet connection, the fallback message appears: 'Log saved. AI analysis will run when online.'"

**(Closing - 5 seconds)**
"That's the AMOHA Green AI module in action. It helps caregivers notice important routine signals, never provides medical diagnoses, and always puts caregivers in the loop."

## Setup Commands

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run the mock server (for Orange/Yellow integration testing)
cd amoha_ai_ml
python integration/mock_server.py

# 3. Test the analysis function directly
python -c "from brain import analyze_care_log; result = analyze_care_log('Dad forgot afternoon medication', 0.72); print(result)"

# 4. Run all tests
python -m pytest -q
```

## Sample Request

```json
POST /analyze
{
  "text": "Dad forgot afternoon medication.",
  "accuracy": 0.72
}
```

## Expected Response

```json
{
  "tags": [
    {
      "name": "med_missed",
      "confidence": 0.91,
      "source": "local_rule"
    }
  ],
  "suggestions": [
    {
      "type": "routine_support",
      "text": "Please check the caregiver plan for medication timing.",
      "reason": "A missed medication entry was noticed."
    }
  ],
  "game_difficulty": {
    "level": 2,
    "action": "keep",
    "reason": "Accuracy is within the target range.",
    "confidence": "medium"
  },
  "assistance_probability": 1.0,
  "alert_level": "caregiver_review",
  "explanation": [
    "analysis completed with available features.",
  ],
  "model_version": "demo-v0.1"
}
```

## Expected UI Behavior

- Tags appear as colored badges on screen.
- Suggestion text is displayed in a large, readable font.
- Alert level determines banner color: info (green), support (yellow), caregiver_review (orange).
- TTS button available for audio playback.
- "Not a diagnosis" disclaimer shown permanently.

## Failure Fallback

- If analysis fails (invalid input, model error), display: "Unable to analyze log at this time. Please try again."
- Log the error (redacted) for debugging.
- Fallback to rule-based defaults if model is unavailable.
- Offline mode: "Log saved. AI analysis will run when online."

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Tags don't appear | Text has no matching keywords | Ensure text uses recognized keywords (check data/keywords.json) |
| accuracy validation error | accuracy not in [0, 1] | Validate accuracy before calling analyze_care_log |
| assistance_probability always 0.5 | No model trained | Train or use rule-based fallback |
| Difficulty not changing | recent_accuracy not provided | Provide recent_accuracy or ensure cold-start path |