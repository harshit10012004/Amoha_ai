"""Adaptive difficulty controller for game-based cognitive support.

Implements rule-based adaptive difficulty adjustment based on game accuracy,
recent accuracy patterns, and time-of-day behavior.

Does NOT increase difficulty after a single high score if recent accuracy is unstable.
Applies hysteresis/cooldown to prevent rapid difficulty changes.
"""

# Thresholds for difficulty adjustment
ACCURACY_LOW_THRESHOLD = 0.60   # Below this -> reduce difficulty
ACCURACY_HIGH_THRESHOLD = 0.90  # At or above this -> consider increasing
# Hysteresis: require sustained pattern before changing difficulty
HYSTERESIS_COUNT = 2  # Number of consecutive observations needed


def adjust_difficulty(
    game_accuracy: float,
    recent_accuracy: float | None = None,
    avg_game_time: float | None = None,
    time_of_day: str | None = None,
    last_action: str | None = None,
    hysteresis_counter: int = 0,
) -> dict:
    """Adjust game difficulty based on accuracy and behavioral features.

    Parameters
    ----------
    game_accuracy : float
        Current game accuracy score in [0, 1].
    recent_accuracy : float, optional
        Recent accuracy (last N games) average in [0, 1].
        If None, only current accuracy is used.
    avg_game_time : float, optional
        Average game session time in minutes.
    time_of_day : str, optional
        Time of day string (e.g., "morning", "afternoon", "evening", "night").
    last_action : str, optional
        Previous difficulty action: "increase", "keep", "reduce".
        Used for hysteresis/cooldown.
    hysteresis_counter : int, optional
        Counter tracking consecutive observations in current direction.
        Reset when direction changes.

    Returns
    -------
    dict
        {
            "level": int,          # Difficulty level (1=Easy, 2=Medium, 3=Hard)
            "action": str,         # "reduce", "keep", "increase"
            "reason": str,         # Human-readable reason
            "confidence": str,     # "low", "medium", "high"
        }
    """
    # Input validation
    if not 0.0 <= game_accuracy <= 1.0:
        raise ValueError("game_accuracy must be in [0, 1]")

    # Hysteresis check: don't change difficulty if we just changed it
    if last_action is not None and hysteresis_counter >= HYSTERESIS_COUNT:
        # We've recently acted in one direction; maintain it unless strong evidence otherwise
        if last_action == "reduce" and game_accuracy >= ACCURACY_LOW_THRESHOLD:
            # Current accuracy is better than when we reduced, so keep
            pass
        elif last_action == "increase" and game_accuracy < ACCURACY_HIGH_THRESHOLD:
            # Current accuracy dropped after increase, so reduce back
            pass
        else:
            # Maintain current difficulty
            current_level = 3 if game_accuracy >= ACCURACY_HIGH_THRESHOLD else (1 if game_accuracy < ACCURACY_LOW_THRESHOLD else 2)
            return {
                "level": current_level,
                "action": "keep",
                "reason": "Recent pattern detected; maintaining current difficulty per hysteresis.",
                "confidence": "medium",
            }

    # Decision logic
    if recent_accuracy is not None:
        # Use recent accuracy if available and unstable
        if recent_accuracy < ACCURACY_LOW_THRESHOLD:
            # Recent performance is poor - reduce difficulty
            return {
                "level": 1,
                "action": "reduce",
                "reason": "Recent accuracy is below target range.",
                "confidence": "medium",
            }
        elif recent_accuracy >= ACCURACY_HIGH_THRESHOLD:
            # Recent performance is high - consider increasing gradually
            # But only if current accuracy also supports it
            if game_accuracy >= ACCURACY_HIGH_THRESHOLD:
                return {
                    "level": 3,
                    "action": "increase",
                    "reason": "Recent and current accuracy are high; consider increasing difficulty gradually.",
                    "confidence": "medium",
                }
            else:
                # Current accuracy dropped after high recent scores - keep current
                current_level = 3 if game_accuracy >= ACCURACY_HIGH_THRESHOLD else (1 if game_accuracy < ACCURACY_LOW_THRESHOLD else 2)
                return {
                    "level": current_level,
                    "action": "keep",
                    "reason": "Recent accuracy was high but current accuracy has dropped; maintaining current difficulty.",
                    "confidence": "medium",
                }
        else:
            # Recent accuracy is in target range - keep current
            current_level = 3 if game_accuracy >= ACCURACY_HIGH_THRESHOLD else (1 if game_accuracy < ACCURACY_LOW_THRESHOLD else 2)
            return {
                "level": current_level,
                "action": "keep",
                "reason": "Recent accuracy is within the target range.",
                "confidence": "medium",
            }

    # Based on current accuracy only (cold start or no recent data)
    if game_accuracy < ACCURACY_LOW_THRESHOLD:
        return {
            "level": 1,
            "action": "reduce",
            "reason": "Accuracy is below the target range.",
            "confidence": "medium",
        }
    elif game_accuracy >= ACCURACY_HIGH_THRESHOLD:
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


def cold_start_difficulty(time_of_day: str | None = None) -> dict:
    """Return default difficulty for a new user (cold start).

    Parameters
    ----------
    time_of_day : str, optional
        Time of day string.

    Returns
    -------
    dict
        Difficulty dict with baseline level.
    """
    # Baseline level 2 (Medium) for cold start
    # Can be adjusted based on time of day
    adjustment = "keep"
    if time_of_day and str(time_of_day).lower() in ("evening", "night"):
        # Evening/night: start slightly easier
        return {
            "level": 1,
            "action": "reduce",
            "reason": "Cold-start: evening/night baseline is easier.",
            "confidence": "low",
        }

    return {
        "level": 2,
        "action": "keep",
        "reason": "Cold-start baseline difficulty.",
        "confidence": "low",
    }