import json
import os

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
