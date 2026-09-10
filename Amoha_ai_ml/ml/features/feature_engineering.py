import numpy as np
import pandas as pd


VALIDATION_RULES = {
    'completion_rate': (0.0, 1.0),
    'missed_rate': (0.0, 1.0),
    'response_delay': (0.0, np.inf),
    'reminder_count': (0, np.inf),
    'game_accuracy': (0.0, 1.0),
    'avg_game_time': (0.0, np.inf),
    'recent_accuracy': (0.0, 1.0),
    'time_of_day': None,
    'agitation_count_7d': (0, np.inf),
    'sleep_issue_count_7d': (0, np.inf),
    'med_missed_count_7d': (0, np.inf),
    'confusion_count_7d': (0, np.inf),
    'positive_day_ratio': (0.0, 1.0),
    'evening_agitation_rate': (0.0, 1.0),
}


def validate_numeric(value, field_name, min_val=None, max_val=None):
    """Validate a numeric value is within optional min/max bounds."""
    try:
        v = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field_name} must be numeric, got {value!r}")
    if min_val is not None and v < min_val:
        raise ValueError(f"{field_name} must be >= {min_val}, got {v}")
    if max_val is not None and v > max_val:
        raise ValueError(f"{field_name} must be <= {max_val}, got {v}")
    return v


def validate_record(record: dict) -> dict:
    """Validate and clean a single record dict, returning sanitized features.

    Returns a dict with all feature keys filled with validated values.
    Missing or invalid values are replaced with safe defaults.
    """
    cleaned = {}
    for field, rule in VALIDATION_RULES.items():
        if rule is None:
            # Non-numeric field (e.g., time_of_day); keep as-is or default to None
            if field in record:
                cleaned[field] = record[field]
            else:
                cleaned[field] = None
            continue

        min_val, max_val = rule
        if field in record:
            try:
                cleaned[field] = validate_numeric(
                    record[field], field, min_val, max_val
                )
            except (ValueError, TypeError):
                if min_val is not None and max_val is not None:
                    cleaned[field] = (min_val + max_val) / 2
                elif min_val is not None:
                    cleaned[field] = min_val
                elif max_val is not None:
                    cleaned[field] = max_val
                else:
                    cleaned[field] = 0.0
        else:
            # Missing field: use midpoint of valid range
            if min_val is not None and max_val is not None:
                cleaned[field] = (min_val + max_val) / 2
            elif min_val is not None:
                cleaned[field] = min_val
            elif max_val is not None:
                cleaned[field] = max_val
            else:
                cleaned[field] = 0.0
    return cleaned


FEATURE_ORDER = [
    'completion_rate',
    'missed_rate',
    'response_delay',
    'reminder_count',
    'game_accuracy',
    'avg_game_time',
    'recent_accuracy',
    'time_of_day',
    'agitation_count_7d',
    'sleep_issue_count_7d',
    'med_missed_count_7d',
    'confusion_count_7d',
    'positive_day_ratio',
    'evening_agitation_rate',
]


def build_feature_frame(records: list[dict]) -> pd.DataFrame:
    """Build a pandas DataFrame from a list of feature record dicts.

    Each record may contain a subset of the supported feature fields.
    Missing fields are filled with safe defaults. Numeric ranges are validated.

    Parameters
    ----------
    records : list[dict]
        List of feature dicts, typically from care-log analysis or
        behavioral feature input.

    Returns
    -------
    pandas.DataFrame
        DataFrame with stable column order and validated values.
    """
    if not records:
        return pd.DataFrame(columns=FEATURE_ORDER)

    rows = []
    for record in records:
        cleaned = validate_record(record)
        row = {field: cleaned.get(field, 0.0) for field in FEATURE_ORDER}
        rows.append(row)

    df = pd.DataFrame(rows, columns=FEATURE_ORDER)
    return df


def get_feature_order() -> list[str]:
    """Return the ordered list of feature names in stable sequence.

    The order is designed to match the feature vectors expected by
    the assistance model and other ML components.

    Returns
    -------
    list[str]
        Ordered feature names.
    """
    return list(FEATURE_ORDER)