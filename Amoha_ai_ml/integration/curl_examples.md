# cURL Examples for AMOHA Green AI /analyze Endpoint

## Basic request with text and accuracy

```bash
curl -X POST "http://localhost:8000/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Dad forgot afternoon medication.",
    "accuracy": 0.72
  }'
```

## Request with behavioral features

```bash
curl -X POST "http://localhost:8000/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Grandma is very angry and restless today",
    "accuracy": 0.55,
    "behavioral_features": {
      "completion_rate": 0.6,
      "missed_rate": 0.4,
      "game_accuracy": 0.5,
      "reminder_count": 2
    }
  }'
```

## Expected response (med_missed example)

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

## Expected response (agitation example)

```json
{
  "tags": [
    {
      "name": "agitation",
      "confidence": 0.8,
      "source": "local_rule"
    },
    {
      "name": "sleep_issue",
      "confidence": 0.8,
      "source": "local_rule"
    }
  ],
  "suggestions": [
    {
      "type": "routine_support",
      "text": "Consider a calm, low-stimulation routine.",
      "reason": "The log contains an agitation signal."
    },
    {
      "type": "routine_support",
      "text": "Consider a consistent wind-down routine.",
      "reason": "A sleep concern was noticed."
    }
  ],
  "game_difficulty": {
    "level": 1,
    "action": "reduce",
    "reason": "Accuracy is below the target range.",
    "confidence": "medium"
  },
  "assistance_probability": 1.0,
  "alert_level": "caregiver_review",
  "explanation": [
    "low game-accuracy feature contributed to the assistance estimate.",
  ],
  "model_version": "demo-v0.1"
}
```