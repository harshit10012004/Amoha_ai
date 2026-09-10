import json
import os
import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(BASE_DIR, 'data', 'keywords.json'), 'r') as f:
    KEYWORDS = json.load(f)


def _validate_accuracy(accuracy):
    """Validate accuracy is in [0, 1]. Return None if not provided or valid."""
    if accuracy is None:
        return None
    try:
        a = float(accuracy)
    except (TypeError, ValueError):
        raise ValueError("accuracy must be a float in [0, 1] or None")
    if a < 0 or a > 1:
        raise ValueError("accuracy must be between 0 and 1")
    return a


def _parse_negation(text_lower):
    """Return set of tagged names that are negated in the text.

    Simple negation: 'no X', 'not X', 'did not X'
    Returns a set of tag names that were negated.
    """
    negated = set()
    # Split into words for scanning
    words = text_lower.split()
    # Look for patterns: no X, not X, did not X, wasn't X, etc.
    i = 0
    while i < len(words):
        word = words[i]
        if word == 'no' and i + 1 < len(words):
            # The next word or phrase could be a tag
            # Check multi-word keywords
            for tag, kw_words in KEYWORDS.items():
                for kw in kw_words:
                    if kw == words[i + 1]:
                        negated.add(tag)
            i += 2
            continue
        elif word == 'not' and i + 1 < len(words):
            for tag, kw_words in KEYWORDS.items():
                for kw in kw_words:
                    if kw == words[i + 1]:
                        negated.add(tag)
            i += 2
            continue
        elif word == 'did' and i + 2 < len(words) and words[i + 1] == 'not' and i + 2 < len(words):
            for tag, kw_words in KEYWORDS.items():
                for kw in kw_words:
                    if kw == words[i + 2]:
                        negated.add(tag)
            i += 3
            continue
        elif word in ("wasn't", "isn't", "aren't", "haven't", "hasn't", "hadn't", "won't", "wouldn't", "don't", "doesn't", "didn't"):
            # Negation word - check the next word
            if i + 1 < len(words):
                for tag, kw_words in KEYWORDS.items():
                    for kw in kw_words:
                        if kw == words[i + 1]:
                            negated.add(tag)
            i += 2
            continue
        else:
            i += 1
    return negated


def _tag_text(text_lower):
    """Rule-based tagger: return list of {name, confidence, source} dicts.

    Handles simple negation: 'no agitation', 'not confused', 'did not miss medication'.
    """
    negated = _parse_negation(text_lower)

    found = []
    seen = set()
    for tag, words in KEYWORDS.items():
        for word in words:
            if word in text_lower and tag not in seen:
                if tag in negated:
                    # Negated tag: include with low confidence
                    found.append({
                        "name": tag,
                        "confidence": 0.1,
                        "source": "local_rule",
                        "negated": True,
                    })
                else:
                    found.append({
                        "name": tag,
                        "confidence": 0.8,
                        "source": "local_rule",
                    })
                seen.add(tag)
                break
    if not found:
        found.append({
            "name": "general_wellness",
            "confidence": 0.5,
            "source": "local_rule",
        })
    return found


def _compute_game_difficulty(accuracy, recent_accuracy=None):
    """Compute game difficulty based on accuracy thresholds."""
    if recent_accuracy is not None:
        if recent_accuracy < 0.60:
            return {
                "level": 1,
                "action": "reduce",
                "reason": "Recent accuracy is below target range.",
                "confidence": "medium",
            }
        elif recent_accuracy >= 0.90:
            return {
                "level": 3,
                "action": "increase",
                "reason": "Recent accuracy is high; consider increasing difficulty gradually.",
                "confidence": "medium",
            }
    if accuracy < 0.60:
        return {
            "level": 1,
            "action": "reduce",
            "reason": "Accuracy is below the target range.",
            "confidence": "medium",
        }
    elif accuracy > 0.90:
        return {
            "level": 3,
            "action": "increase",
            "reason": "Accuracy is high; consider increasing difficulty gradually.",
            "confidence": "medium",
        }
    else:
        return {
            "level": 2,
            "action": "keep",
            "reason": "Accuracy is within the target range.",
            "confidence": "medium",
        }


def _compute_assistance_probability(features):
    """Compute assistance probability using rule-based model from features."""
    score = 0.0
    n = 0.0

    cr = features.get('completion_rate', 1.0)
    mr = features.get('missed_rate', 0.0)
    rd = features.get('response_delay', 0.0)
    rc = features.get('reminder_count', 0.0)
    ga = features.get('game_accuracy', 0.5)
    agt = features.get('avg_game_time', 0.0)
    ra = features.get('recent_accuracy', 0.5)
    tod = features.get('time_of_day', 'day')

    if cr < 0.6:
        score += 1.0; n += 1.0
    if mr > 0.4:
        score += 1.0; n += 1.0
    if rd > 2.0:
        score += 1.0; n += 1.0
    if rc > 3:
        score += 1.0; n += 1.0
    if ga < 0.6:
        score += 1.0; n += 1.0
    if agt > 60:
        score += 1.0; n += 1.0
    if ra < 0.6:
        score += 1.0; n += 1.0

    if n > 0:
        probability = score / n
    else:
        probability = 0.5

    if 'evening' in str(tod).lower() or 'night' in str(tod).lower():
        probability *= 1.1

    probability = min(round(probability, 3), 1.0)
    return probability


def _compute_alert_level(assistance_probability):
    """Map assistance probability to a safe support-oriented alert level."""
    if assistance_probability >= 0.7:
        return "caregiver_review"
    elif assistance_probability >= 0.4:
        return "support"
    else:
        return "info"


def _build_suggestions(tags, assistance_probability, game_difficulty):
    """Build supportive suggestions based on tags and other outputs."""
    suggestions = []
    tag_names = {t["name"] for t in tags}

    if "agitation" in tag_names:
        suggestions.append({
            "type": "routine_support",
            "text": "Consider a calm, low-stimulation routine.",
            "reason": "The log contains an agitation signal.",
        })

    if "sleep_issue" in tag_names:
        suggestions.append({
            "type": "routine_support",
            "text": "Consider a consistent wind-down routine.",
            "reason": "A sleep concern was noticed.",
        })

    if "med_missed" in tag_names:
        suggestions.append({
            "type": "routine_support",
            "text": "Please check the caregiver plan for medication timing.",
            "reason": "A missed medication entry was noticed.",
        })

    if "confusion" in tag_names:
        suggestions.append({
            "type": "routine_support",
            "text": "Offer calm, simple guidance.",
            "reason": "A confusion signal was noticed.",
        })

    if assistance_probability >= 0.7:
        suggestions.append({
            "type": "caregiver_review",
            "text": "Review routine and consider additional support.",
            "reason": "Assistance probability is elevated.",
        })

    if not suggestions:
        suggestions.append({
            "type": "routine_support",
            "text": "Continue with the current routine.",
            "reason": "No specific signals detected.",
        })

    return suggestions


def analyze_care_log(
    text: str,
    accuracy: float | None = None,
    behavioral_features: dict | None = None,
    *,
    user_id: str | None = None,
    timestamp: str | None = None,
) -> dict:
    """Analyze caregiver-entered care log text and optional behavioral features.

    Preferred interface:
        analyze_care_log(text, accuracy, behavioral_features)

    Returns a dict with tags, suggestions, game_difficulty,
    assistance_probability, alert_level, explanation, and model_version.

    The old two-argument call signature analyze_care_log(text, accuracy)
    is preserved for backward compatibility.
    """
    acc = _validate_accuracy(accuracy)

    text_lower = text.lower()

    # 1. Rule-based tags
    tags = _tag_text(text_lower)

    # 2. Build feature dict for assistance probability and difficulty
    features = {}
    if behavioral_features:
        features.update(behavioral_features)
    features['accuracy'] = acc if acc is not None else 0.5

    # Derived features from tags
    tag_names = {t["name"] for t in tags}
    tag_counts = {}
    for tag_dict in tags:
        tag_counts[tag_dict["name"]] = tag_dict.get("confidence", 0.5)

    features['agitation_count_7d'] = tag_counts.get("agitation", 0)
    features['sleep_issue_count_7d'] = tag_counts.get("sleep_issue", 0)
    features['med_missed_count_7d'] = tag_counts.get("med_missed", 0)
    features['confusion_count_7d'] = tag_counts.get("confusion", 0)
    features['positive_day_ratio'] = acc if acc is not None else 0.5
    features['evening_agitation_rate'] = 1.0 if tag_counts.get("agitation") else 0.0

    # 3. Game difficulty
    game_difficulty = _compute_game_difficulty(
        acc if acc is not None else 0.5,
        features.get('recent_accuracy')
    )

    # 4. Assistance probability
    assistance_probability = _compute_assistance_probability(features)

    # 5. Alert level
    alert_level = _compute_alert_level(assistance_probability)

    # 6. Suggestions
    suggestions = _build_suggestions(tags, assistance_probability, game_difficulty)

    # 7. Explanation
    explanation_parts = []
    if features.get('missed_rate', 0) > 0.4:
        explanation_parts.append("missed-rate feature contributed to the assistance estimate.")
    if features.get('response_delay', 0) > 2.0:
        explanation_parts.append("response-delay feature contributed to the assistance estimate.")
    if features.get('game_accuracy', 0.5) < 0.6:
        explanation_parts.append("low game-accuracy feature contributed to the assistance estimate.")
    if not explanation_parts:
        explanation_parts.append("analysis completed with available features.")

    # 8. Build result
    result = {
        "tags": tags,
        "suggestions": suggestions,
        "game_difficulty": game_difficulty,
        "assistance_probability": assistance_probability,
        "alert_level": alert_level,
        "explanation": explanation_parts,
        "model_version": "demo-v0.1",
    }

    return result


# Backward-compatible shim: old signature analyze_care_log(text, accuracy)
def _analyze_care_log_old(text, accuracy=0.8):
    """Original signature preserved for backward compatibility.

    Deprecated: use analyze_care_log(text, accuracy, behavioral_features=...)
    instead for structured-feature support.
    """
    result = analyze_care_log(
        text,
        accuracy=accuracy,
    )
    # Map old output shape to new where possible
    return {
        "tags": result.get("tags", []),
        "suggestion": result.get("suggestions", [{}])[0].get("text", ""),
        "game_difficulty": result.get("game_difficulty", "Medium"),
    }