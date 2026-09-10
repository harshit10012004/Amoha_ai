"""Tests for the feature_engineering module."""

import numpy as np
import pandas as pd
from ml.features.feature_engineering import build_feature_frame, get_feature_order, validate_record


def test_build_feature_frame_basic():
    """Basic feature frame building works."""
    records = [
        {"completion_rate": 0.8, "missed_rate": 0.3, "game_accuracy": 0.75},
        {"completion_rate": 0.5, "missed_rate": 0.6, "game_accuracy": 0.3},
    ]
    df = build_feature_frame(records)
    assert isinstance(df, pd.DataFrame)
    assert len(df) == 2
    assert list(df.columns) == get_feature_order()


def test_build_feature_frame_empty():
    """Empty records list returns DataFrame with correct columns."""
    df = build_feature_frame([])
    assert isinstance(df, pd.DataFrame)
    assert len(df) == 0
    assert list(df.columns) == get_feature_order()


def test_build_feature_frame_validates():
    """Feature frame validates numeric ranges."""
    records = [
        {"completion_rate": 1.5, "missed_rate": 0.3, "game_accuracy": 0.75},
    ]
    df = build_feature_frame(records)
    # Invalid values should be replaced with defaults
    assert df.iloc[0]["completion_rate"] != 1.5


def test_get_feature_order():
    """get_feature_order returns stable ordered list."""
    order = get_feature_order()
    assert isinstance(order, list)
    assert len(order) > 0
    # Should contain all expected features
    expected = [
        "completion_rate", "missed_rate", "response_delay", "reminder_count",
        "game_accuracy", "avg_game_time", "recent_accuracy", "time_of_day",
        "agitation_count_7d", "sleep_issue_count_7d", "med_missed_count_7d",
        "confusion_count_7d", "positive_day_ratio", "evening_agitation_rate",
    ]
    assert set(order) == set(expected)


def test_validate_record_basic():
    """Basic record validation works."""
    record = {"completion_rate": 0.8, "missed_rate": 0.3, "game_accuracy": 0.75}
    cleaned = validate_record(record)
    assert "completion_rate" in cleaned
    assert "missed_rate" in cleaned
    assert "game_accuracy" in cleaned


def test_validate_record_invalid():
    """Invalid values are replaced with defaults."""
    record = {"completion_rate": 1.5, "missed_rate": -0.1, "game_accuracy": 2.0}
    cleaned = validate_record(record)
    # Invalid values should be replaced
    assert cleaned["completion_rate"] < 1.0 or cleaned["completion_rate"] > 1.0


def test_validate_record_missing():
    """Missing keys get default values."""
    record = {}
    cleaned = validate_record(record)
    assert cleaned is not None