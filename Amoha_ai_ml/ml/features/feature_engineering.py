import numpy as np
import pandas as pd


def extract_features_from_log(text, accuracy):
    """Extract basic features from care log text and accuracy."""
    text_lower = text.lower()

    features = {}

    keyword_map = {
        'agitation': ['angry', 'restless', 'yell', 'frustrated', 'shouting', 'violent', 'irritated', 'agitated', 'upset', 'anxious', 'fidgety'],
        'sleep_issue': ['awake', 'insomnia', 'night', 'sleepless', 'sleepy', 'nap', 'tired', 'exhausted', 'restless', 'drowsy', 'wakeful'],
        'nutrition': ['refused', 'hungry', 'eat', 'food', 'meal', 'water', 'thirsty', 'appetite', 'starving', 'dehydrated', 'nourish'],
    }

    tag_counts = {}
    for tag, words in keyword_map.items():
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


def compute_risk_signals(features_dict):
    """Compute risk signals based on features (cognitive score, diabetes, APOE signals)."""
    risk = {}

    tag_counts = features_dict.get('tag_counts', {})
    accuracy = features_dict.get('accuracy', 0.5)

    cognitive_score = round(accuracy * 100, 1)

    diabetes_signal = 1 if tag_counts.get('nutrition', 0) > 0 and accuracy < 0.7 else 0

    risk['cognitive_score'] = cognitive_score
    risk['diabetes_signal'] = diabetes_signal
    risk['apoe_risk'] = 0

    return risk