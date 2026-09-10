"""Recommendation engine for caregiver support signals.

Generates supportive, concise recommendations based on NLP tags,
assistance probability, adherence features, adaptive difficulty output,
and recent history.

All outputs are supportive, caregiver-reviewable, and non-clinical.
Never prescribe medicine, change dosage, or make a diagnosis.
"""

from typing import Any, Dict, List, Optional


# Fixed set of supportive recommendations keyed by tag and condition
RECOMMENDATION_LIBRARY = {
    "agitation": {
        "routine_support": {
            "text": "Consider a calm, low-stimulation routine.",
            "reason": "The log contains an agitation signal.",
        },
    },
    "sleep_issue": {
        "routine_support": {
            "text": "Consider a consistent wind-down routine.",
            "reason": "A sleep concern was noticed.",
        },
    },
    "med_missed": {
        "routine_support": {
            "text": "Please check the caregiver plan for medication timing.",
            "reason": "A missed medication entry was noticed.",
        },
    },
    "confusion": {
        "routine_support": {
            "text": "Offer calm, simple guidance.",
            "reason": "A confusion signal was noticed.",
        },
    },
    "good_day": {
        "routine_support": {
            "text": "Continue the current positive routine.",
            "reason": "A positive day was recorded.",
        },
    },
    "high_assistance": {
        "caregiver_review": {
            "text": "Review routine and consider additional support.",
            "reason": "Assistance probability is elevated.",
        },
    },
    "repeated_med_missed": {
        "routine_support": {
            "text": "Review reminder timing after repeated missed events.",
            "reason": "Multiple missed medication events detected.",
        },
    },
    "mixed_accuracy": {
        "keep": {
            "text": "Keep game difficulty stable when recent accuracy is mixed.",
            "reason": "Game accuracy signals mixed patterns.",
        },
    },
    "high_reminder_count": {
        "caregiver_review": {
            "text": "Suggest caregiver review when reminder count is already high.",
            "reason": "Reminder count is elevated.",
        },
    },
}


def get_recommendation(
    tags: List[Dict[str, Any]],
    assistance_probability: float,
    game_difficulty: Dict[str, Any],
    adherence_features: Optional[Dict[str, Any]] = None,
    recent_history: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Generate caregiver support recommendations.

    Parameters
    ----------
    tags : list of dict
        NLP tag results from tagger, each dict with "name", "confidence", etc.
    assistance_probability : float
        Probability in [0, 1] that additional routine assistance may be useful.
    game_difficulty : dict
        Adaptive difficulty output with "level", "action", "reason", "confidence".
    adherence_features : dict, optional
        Features related to adherence, e.g. {"reminder_count": 5, ...}.
    recent_history : list, optional
        Recent analysis history dicts.

    Returns
    -------
    dict
        {
            "recommendations": [   # list of recommendation dicts
                {
                    "type": str,        # e.g. "routine_support", "caregiver_review"
                    "text": str,        # human-readable suggestion
                    "reason": str,      # brief reason
                }
            ],
            "priority": str,          # "high", "medium", "low"
            "explanation": str,       # overall explanation
        }
    """
    tags_names = {t.get("name", "") for t in tags}
    recommendations = []
    priority = "low"

    # Check for repeated med_missed (2+ times)
    rc = 0
    if adherence_features and "reminder_count" in adherence_features:
        rc = adherence_features["reminder_count"]

    # Build recommendations based on tags
    for tag_name in tags_names:
        if tag_name in RECOMMENDATION_LIBRARY:
            tag_recs = RECOMMENDATION_LIBRARY[tag_name]
            for rec_type, rec_data in tag_recs.items():
                recommendations.append({
                    "type": rec_type,
                    "text": rec_data["text"],
                    "reason": rec_data["reason"],
                })

    # Special condition: high assistance probability
    if assistance_probability >= 0.7:
        recommendations.append({
            "type": "caregiver_review",
            "text": "Review routine and consider additional support.",
            "reason": "Assistance probability is elevated.",
        })
        if priority < "high":
            priority = "high"

    # Special condition: repeated missed medications
    if rc and rc >= 2:
        recommendations.append({
            "type": "repeated_med_missed",
            "text": "Review reminder timing after repeated missed events.",
            "reason": "Multiple missed medication events detected.",
        })
        if priority < "high":
            priority = "high"

    # Special condition: high reminder count
    if rc and rc >= 3:
        recommendations.append({
            "type": "high_reminder_count",
            "text": "Suggest caregiver review when reminder count is already high.",
            "reason": "Reminder count is elevated.",
        })
        if priority < "high":
            priority = "medium"

    # Special condition: mixed game accuracy
    gd_action = game_difficulty.get("action", "keep")
    if gd_action == "keep" and assistance_probability < 0.5:
        recommendations.append({
            "type": "mixed_accuracy",
            "text": "Keep game difficulty stable when recent accuracy is mixed.",
            "reason": "Game accuracy signals mixed patterns.",
        })

    # If no specific recommendations were generated
    if not recommendations:
        recommendations.append({
            "type": "routine_support",
            "text": "Continue with the current routine.",
            "reason": "No specific signals detected.",
        })
        priority = "low"

    # Build explanation
    explanation_parts = []
    if tags_names:
        explanation_parts.append(f"Tags detected: {', '.join(sorted(tags_names))}.")
    if assistance_probability >= 0.7:
        explanation_parts.append("Assistance probability is elevated, suggesting caregiver review.")
    if rc and rc >= 2:
        explanation_parts.append(f"Reminder count ({rc}) indicates repeated events needing attention.")
    if not explanation_parts:
        explanation_parts.append("Analysis completed; no specific signals required action.")

    explanation = " ".join(explanation_parts)

    return {
        "recommendations": recommendations,
        "priority": priority,
        "explanation": explanation,
    }


# Convenience function for quick recommendation generation
def quick_recommend(tags: List[Dict[str, Any]], assistance_probability: float) -> List[Dict[str, str]]:
    """Quick recommendation extraction for simple use cases.

    Parameters
    ----------
    tags : list of dict
        NLP tag results.
    assistance_probability : float

    Returns
    -------
    list of dict
        List of {type, text, reason} dicts.
    """
    from src.reminders.adaptive_logic import adjust_difficulty

    # Map assistance probability to a dummy game accuracy for difficulty
    # Higher assistance probability typically correlates with lower accuracy
    game_accuracy = 1.0 - assistance_probability * 0.5 + 0.3  # rough mapping

    # Dummy game difficulty
    gd = adjust_difficulty(game_accuracy=game_accuracy)

    # Dummy adherence features
    adherence = {"reminder_count": 0}

    result = get_recommendation(
        tags=tags,
        assistance_probability=assistance_probability,
        game_difficulty=gd,
        adherence_features=adherence,
    )
    return result["recommendations"]