"""Standalone script for assistance probability analysis.

Called by the Node.js backend via subprocess to predict assistance
probability from care log text and behavioral features.

Usage (from Node.js):
  python ml/analyze_assistance.py --text "..." --accuracy 0.65

Output: JSON with assistance_probability, tags, alert_level, recommendations
"""

import sys
import argparse
import json
import numpy as np
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from ml.models.assistance_model import AssistanceModel


# Feature extraction logic (from ml/features/feature_engineering.py)
KEYWORD_MAP = {
    'agitation': ['angry', 'restless', 'yell', 'frustrated', 'shouting', 'violent', 'irritated', 'agitated', 'upset', 'anxious', 'fidgety'],
    'sleep_issue': ['awake', 'insomnia', 'night', 'sleepless', 'sleepy', 'nap', 'tired', 'exhausted', 'restless', 'drowsy', 'wakeful'],
    'nutrition': ['refused', 'hungry', 'eat', 'food', 'meal', 'water', 'thirsty', 'appetite', 'starving', 'dehydrated', 'nourish'],
}


def extract_features_from_log(text, accuracy):
    """Extract basic features from care log text and accuracy."""
    text_lower = text.lower()
    features = {}
    tag_counts = {}
    for tag, words in KEYWORD_MAP.items():
        count = sum(1 for word in words if word in text_lower)
        if count > 0:
            tag_counts[tag] = count
    features['tag_counts'] = tag_counts
    features['accuracy'] = accuracy
    features['word_count'] = len(text.split())
    return features


def build_feature_vector(features_dict, behavioral_features=None):
    """Build a numeric feature vector from extracted features."""
    vec = []
    tag_counts = features_dict.get('tag_counts', {})
    for tag in ['agitation', 'sleep_issue', 'nutrition']:
        vec.append(tag_counts.get(tag, 0))
    accuracy = features_dict.get('accuracy', 0.5)
    vec.append(accuracy)
    if behavioral_features:
        vec.extend([
            behavioral_features.get('completion_rate', 0.0),
            behavioral_features.get('missed_rate', 0.0),
            behavioral_features.get('response_delay', 0.0),
            behavioral_features.get('reminder_count', 0.0),
            behavioral_features.get('game_accuracy', 0.5),
            behavioral_features.get('avg_game_time', 0.0),
            behavioral_features.get('recent_accuracy', 0.5),
            behavioral_features.get('time_of_day', 'day'),
        ])
    else:
        vec.extend([0.0] * 8)
    return np.array(vec, dtype=np.float64)


def main():
    parser = argparse.ArgumentParser(description="Assistance probability analysis")
    parser.add_argument("--text", required=True, help="Care log text")
    parser.add_argument("--accuracy", required=True, type=float, help="Accuracy score from [0,1]")
    parser.add_argument("--completion-rate", type=float, default=0.8, help="Completion rate from [0,1]")
    parser.add_argument("--missed-rate", type=float, default=0.1, help="Missed rate from [0,1]")
    parser.add_argument("--response-delay", type=float, default=0.5, help="Response delay from [0,1]")
    parser.add_argument("--reminder-count", type=float, default=0, help="Reminder count")
    parser.add_argument("--game-accuracy", type=float, default=0.5, help="Game accuracy from [0,1]")
    parser.add_argument("--avg-game-time", type=float, default=0.0, help="Average game time")
    parser.add_argument("--recent-accuracy", type=float, default=0.5, help="Recent accuracy from [0,1]")
    parser.add_argument("--time-of-day", choices=["day", "night", "morning", "evening"], default="day", help="Time of day")
    args = parser.parse_args()

    # Extract features from text and accuracy
    features = extract_features_from_log(args.text, args.accuracy)

    # Build behavioral features dict
    time_of_day_map = {"day": 0, "evening": 1, "night": 2, "morning": 3}
    behavioral_features = {
        "completion_rate": args.completion_rate,
        "missed_rate": args.missed_rate,
        "response_delay": args.response_delay,
        "reminder_count": float(args.reminder_count),
        "game_accuracy": args.game_accuracy,
        "avg_game_time": float(args.avg_game_time),
        "recent_accuracy": args.recent_accuracy,
        "time_of_day": time_of_day_map.get(args.time_of_day, 0),
    }

    # Build feature vector (16 features) - pad if needed
    vec = build_feature_vector(features, behavioral_features)
    current_len = len(vec)
    if current_len < 16:
        vec = np.pad(vec, (0, 16 - current_len), mode='constant')
    vec = vec.reshape(1, -1)

    # Train model on tiny synthetic dataset (in production, load persisted model)
    np.random.seed(42)
    X = np.random.rand(20, 16)
    y = np.array([0] * 10 + [1] * 10)

    model = AssistanceModel(model_type="logistic")
    try:
        metrics = model.train(X, y)
    except ValueError:
        y = np.array([0] * 10 + [1] * 10)
        metrics = model.train(X, y)

    # Predict assistance probability
    proba = model.predict_proba(vec)[0]
    prediction = model.predict(vec, threshold=0.5)[0]

    # Determine alert level
    if proba < 0.4:
        alert_level = "info"
    elif proba < 0.7:
        alert_level = "support"
    else:
        alert_level = "caregiver_review"

    # Generate recommendations based on features
    tags = features.get("tag_counts", {})
    recommendations = []
    if tags.get("agitation", 0) > 0:
        recommendations.append("Consider calm environment and gentle reassurance")
    if tags.get("sleep_issue", 0) > 0:
        recommendations.append("Review sleep routine and limit evening stimulation")
    if tags.get("nutrition", 0) > 0 and args.accuracy < 0.7:
        recommendations.append("Check nutrition intake and hydration")
    if args.missed_rate > 0.3:
        recommendations.append("Increase gentle reminders and check-in frequency")
    if proba >= 0.7:
        recommendations.append("Caregiver review recommended - discuss with healthcare provider")
    if not recommendations:
        recommendations.append("Continue routine monitoring and engagement")

    result = {
        "assistance_probability": float(proba),
        "needs_assistance": bool(prediction),
        "alert_level": alert_level,
        "tags": tags,
        "accuracy": args.accuracy,
        "completion_rate": args.completion_rate,
        "missed_rate": args.missed_rate,
        "recommendations": recommendations,
        "model_version": "logistic-regression-mvp",
    }

    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()