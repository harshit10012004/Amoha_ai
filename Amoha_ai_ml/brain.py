import json
import os
import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(BASE_DIR, 'data', 'keywords.json'), 'r') as f:
    KEYWORDS = json.load(f)


def analyze_care_log(text, accuracy=0.8):
    text_lower = text.lower()
    found_tags = []

    for tag, words in KEYWORDS.items():
        for word in words:
            if word in text_lower:
                found_tags.append(tag)
                break

    if accuracy < 0.6:
        difficulty = "Easy"
        suggestion = "Try a simpler version of the game."
    elif accuracy > 0.9:
        difficulty = "Hard"
        suggestion = "Challenge them with a faster pace!"
    else:
        difficulty = "Medium"
        suggestion = "Keep up the current routine."

    if not found_tags:
        found_tags = ["general_wellness"]
        suggestion = "Everything seems normal. Keep observing!"

    return {
        "tags": found_tags,
        "suggestion": suggestion,
        "game_difficulty": difficulty
    }


def compute_behavioral_features(completion_rate, missed_rate, response_delay,
                               reminder_count, game_accuracy, avg_game_time,
                               recent_accuracy, time_of_day):
    features = {
        'completion_rate': float(completion_rate),
        'missed_rate': float(missed_rate),
        'response_delay': float(response_delay),
        'reminder_count': float(reminder_count),
        'game_accuracy': float(game_accuracy),
        'avg_game_time': float(avg_game_time),
        'recent_accuracy': float(recent_accuracy),
        'time_of_day': str(time_of_day),
    }
    return features


def assess_assistance_probability(features):
    """Compute assistance probability using a simple rule-based model
    based on behavioral features. This outputs probability only (no diagnosis)."""
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