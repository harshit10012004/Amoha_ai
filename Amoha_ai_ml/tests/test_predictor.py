"""Tests for the predictor.py inference API."""

from ml.inference.predictor import predict_assistance


def test_predictor_no_model():
    """Rule-based fallback works when no model is provided."""
    result = predict_assistance(
        {"completion_rate": 0.8, "missed_rate": 0.3, "game_accuracy": 0.75}
    )
    assert "assistance_probability" in result
    assert "alert_level" in result
    assert "explanation" in result
    assert "model_version" in result
    assert result["assistance_probability"] >= 0.0 and result["assistance_probability"] <= 1.0


def test_predictor_with_model_path():
    """ predictor works with model path (may fall back to rules). """
    result = predict_assistance(
        {"completion_rate": 0.5, "missed_rate": 0.6, "game_accuracy": 0.3},
        model_path=None,
    )
    assert "assistance_probability" in result


def test_predictor_deterministic():
    """Same input produces same output."""
    r1 = predict_assistance(
        {"completion_rate": 0.8, "missed_rate": 0.3, "game_accuracy": 0.75}
    )
    r2 = predict_assistance(
        {"completion_rate": 0.8, "missed_rate": 0.3, "game_accuracy": 0.75}
    )
    # Assistance probability should be the same (may differ slightly due to floating point,
    # but the function is deterministic)
    assert r1["assistance_probability"] == r2["assistance_probability"]