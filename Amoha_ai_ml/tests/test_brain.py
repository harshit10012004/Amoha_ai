"""Tests for the upgraded brain.py module.

Tests cover:
- Existing two-argument usage (backward compatibility).
- Structured feature usage.
- Empty text.
- Missing accuracy.
- Invalid accuracy.
- Repeated identical input (determinism).
- Non-diagnostic output wording.
- Negation handling.
"""
import pytest

from brain import analyze_care_log


# P0: Existing two-argument usage
def test_brain_two_arg():
    """Original signature analyze_care_log(text, accuracy) still works."""
    result = analyze_care_log("Grandma is very angry and restless today", 0.5)
    assert "tags" in result
    assert "suggestion" in result or "suggestions" in result
    assert "game_difficulty" in result


def test_brain_structured_features():
    """Structured-feature call works with behavioral_features."""
    result = analyze_care_log(
        "Dad forgot afternoon medication",
        0.72,
        behavioral_features={"completion_rate": 0.8, "missed_rate": 0.3, "game_accuracy": 0.75},
    )
    assert "tags" in result
    assert "assistance_probability" in result
    assert "alert_level" in result
    assert "game_difficulty" in result
    assert "explanation" in result
    assert "model_version" in result


def test_brain_empty_text():
    """Empty text handling."""
    result = analyze_care_log("", 0.5)
    assert "tags" in result
    # Should have general_wellness tag for empty input
    tag_names = [t["name"] for t in result["tags"]]
    assert "general_wellness" in tag_names


def test_brain_missing_accuracy():
    """Missing accuracy (None) is handled safely."""
    result = analyze_care_log("test text")
    assert "assistance_probability" in result
    assert "alert_level" in result


def test_brain_invalid_accuracy():
    """Invalid accuracy raises ValueError."""
    with pytest.raises(ValueError):
        analyze_care_log("test text", 1.5)


def test_brain_deterministic():
    """Repeated identical input produces identical output."""
    r1 = analyze_care_log("same input", 0.5)
    r2 = analyze_care_log("same input", 0.5)
    assert r1 == r2


def test_brain_non_diagnostic():
    """Output wording is non-diagnostic (no medical conclusions)."""
    result = analyze_care_log("Grandma is restless", 0.6)
    combined = str(result).lower()
    # Should not contain diagnostic terminology
    assert "diagnosis" not in combined
    assert "dementia" not in combined
    assert "severity" not in combined


# Negation tests
def test_brain_negation_no_agitation():
    """'no agitation' should not tag agitation (or tag with low confidence)."""
    result = analyze_care_log("no agitation today", 0.7)
    tag_names = [t["name"] for t in result["tags"]]
    # agitation should either not appear or have very low confidence / be negated
    agitation_tags = [t for t in result["tags"] if t["name"] == "agitation"]
    assert len(agitation_tags) == 0 or agitation_tags[0]["confidence"] < 0.5


def test_brain_negation_not_confused():
    """'not confused' should not tag confusion (or tag with low confidence)."""
    result = analyze_care_log("not confused", 0.7)
    tag_names = [t["name"] for t in result["tags"]]
    confusion_tags = [t for t in result["tags"] if t["name"] in ("confusion", "confused")]
    # Should not have confusion tag with high confidence
    high_confusion = [t for t in confusion_tags if t["confidence"] > 0.5]
    assert len(high_confusion) == 0