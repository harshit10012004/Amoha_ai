import json
import os
from pathlib import Path

import numpy as np

BASE_DIR = Path(__file__).parent.parent.parent


def _ensure_model(model_path: str | None):
    """Load model from path if provided, otherwise return None (rule-based fallback)."""
    if model_path is None or model_path == "":
        return None
    try:
        from ml.models.assistance_model import load_model
        return load_model(model_path)
    except Exception:
        return None


def _rule_based_assistance(behavioral_features: dict, care_log_features: dict | None = None) -> dict:
    """Fallback rule-based assistance probability computation.

    This implements the same logic as the core brain module so that
    predictions work even when no model artifact is available.
    """
    features = {}
    if behavioral_features:
        features.update(behavioral_features)

    # Default accuracy if not provided
    acc = features.get("accuracy", 0.5)
    if acc is None:
        acc = 0.5

    # Extract care-log tags if care_log_features provided
    if care_log_features and "tags" in care_log_features:
        tag_names = {t["name"] for t in care_log_features["tags"]}
    else:
        tag_names = set()

    # Simple rule-based scoring
    score = 0.0
    n = 0.0

    cr = features.get("completion_rate", 1.0)
    mr = features.get("missed_rate", 0.0)
    rd = features.get("response_delay", 0.0)
    rc = features.get("reminder_count", 0.0)
    ga = features.get("game_accuracy", 0.5)
    agt = features.get("avg_game_time", 0.0)
    ra = features.get("recent_accuracy", 0.5)
    tod = features.get("time_of_day", "day")

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

    if "evening" in str(tod).lower() or "night" in str(tod).lower():
        probability *= 1.1

    probability = min(round(probability, 3), 1.0)

    # Determine alert level
    if probability >= 0.7:
        alert_level = "caregiver_review"
    elif probability >= 0.4:
        alert_level = "support"
    else:
        alert_level = "info"

    # Build explanations
    explanation = [
        "The output is based on routine and behavioral features.",
        "This is not a medical diagnosis.",
    ]

    return {
        "assistance_probability": probability,
        "alert_level": alert_level,
        "explanation": explanation,
        "model_version": "demo-v0.1",
    }


def predict_assistance(
    behavioral_features: dict,
    care_log_features: dict | None = None,
    model_path: str | None = None,
) -> dict:
    """Predict assistance probability from behavioral and care-log features.

    Preferred function for Yellow backend integration.

    Parameters
    ----------
    behavioral_features : dict
        Dict with keys: completion_rate, missed_rate, response_delay,
        reminder_count, game_accuracy, avg_game_time, recent_accuracy,
        time_of_day. May also include derived features from tag_counts.
    care_log_features : dict, optional
        Dict with tag information from the NLP tagger, e.g. as returned
        by brain analyze_care_log tags output.
    model_path : str, optional
        Path to a joblib model file. If None, rule-based fallback is used.

    Returns
    -------
    dict
        {
            "assistance_probability": float,
            "alert_level": {"info" | "support" | "caregiver_review"},
            "explanation": [str, ...],
            "model_version": str,
        }
    """
    model = _ensure_model(model_path)

    # Try model prediction first
    if model is not None and model.is_trained:
        try:
            from ml.features.feature_engineering import build_feature_frame, get_feature_order

            # Build feature vector from behavioral features
            feat_dict = {}
            if behavioral_features:
                feat_dict.update(behavioral_features)

            # Ensure all required features are present
            feature_order = get_feature_order()
            for fname in feature_order:
                if fname not in feat_dict:
                    # Smart defaults
                    if fname == "time_of_day":
                        feat_dict[fname] = "day"
                    else:
                        feat_dict[fname] = 0.0

            df = build_feature_frame([feat_dict])
            X = df[feature_order].values
            proba = predict_assistance_probability(model, X)
            probability = float(proba[0])
        except Exception:
            # Fall back to rule-based if model prediction fails
            result = _rule_based_assistance(behavioral_features, care_log_features)
            result["model_version"] = getattr(model, "model_type", "demo-v0.1")
            return result
    else:
        # Use rule-based fallback
        result = _rule_based_assistance(behavioral_features, care_log_features)
        return result

    # Determine alert level
    if probability >= 0.7:
        alert_level = "caregiver_review"
    elif probability >= 0.4:
        alert_level = "support"
    else:
        alert_level = "info"

    # Build explanations
    explanation_parts = [
        "The output is based on routine and behavioral features.",
        "This is not a medical diagnosis.",
    ]

    # Add feature-based explanations
    if features.get("missed_rate", 0) > 0.4:
        explanation_parts.append("missed-rate feature contributed to the assistance estimate.")
    if features.get("response_delay", 0) > 2.0:
        explanation_parts.append("response-delay feature contributed to the assistance estimate.")
    if features.get("game_accuracy", 0.5) < 0.6:
        explanation_parts.append("low game-accuracy feature contributed to the assistance estimate.")
    if not any("contributed" in e for e in explanation_parts):
        explanation_parts.append("analysis completed with available features.")

    return {
        "assistance_probability": probability,
        "alert_level": alert_level,
        "explanation": explanation_parts,
        "model_version": "demo-v0.1",
    }