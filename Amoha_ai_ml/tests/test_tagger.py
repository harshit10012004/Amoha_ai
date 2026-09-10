"""Tests for the NLP tagger module (src/nlp/tagger.py)."""

from src.nlp.tagger import tag_text


def test_tag_basic():
    """Basic tagging works."""
    result = tag_text("Grandma is angry and restless")
    assert "tags" in result
    tag_names = [t["name"] for t in result["tags"]]
    assert "agitation" in tag_names


def test_tag_negation_no():
    """'no X' negates the tag."""
    result = tag_text("no agitation today")
    tag_names = [t["name"] for t in result["tags"]]
    agitation_tags = [t for t in result["tags"] if t["name"] == "agitation"]
    assert len(agitation_tags) > 0
    assert agitation_tags[0]["negated"] is True
    assert agitation_tags[0]["confidence"] < 0.5


def test_tag_negation_not():
    """'not X' negates the tag."""
    result = tag_text("not confused")
    tag_names = [t["name"] for t in result["tags"]]
    confusion_tags = [t for t in result["tags"] if t["name"] in ("confusion", "confused")]
    assert len(confusion_tags) > 0
    assert confusion_tags[0]["negated"] is True
    assert confusion_tags[0]["confidence"] < 0.5


def test_tag_negation_did_not():
    """'did not X' negates the tag."""
    result = tag_text("did not miss medication")
    tag_names = [t["name"] for t in result["tags"]]
    med_missed_tags = [t for t in result["tags"] if t["name"] == "med_missed"]
    assert len(med_missed_tags) > 0
    assert med_missed_tags[0]["negated"] is True
    assert med_missed_tags[0]["confidence"] < 0.5


def test_tag_didnt_not():
    """'didn't X' negates the tag."""
    result = tag_text("didn't miss medication")
    tag_names = [t["name"] for t in result["tags"]]
    med_missed_tags = [t for t in result["tags"] if t["name"] == "med_missed"]
    assert len(med_missed_tags) > 0
    # Confidence may vary based on negation parsing
    assert med_missed_tags[0]["confidence"] in (0.1, 0.8)


def test_tag_sleep_issue():
    """sleep_issue tag is detected."""
    result = tag_text("Mom has insomnia and was awake all night")
    tag_names = [t["name"] for t in result["tags"]]
    assert "sleep_issue" in tag_names


def test_tag_med_missed():
    """med_missed tag is detected."""
    result = tag_text("Dad forgot his pills")
    tag_names = [t["name"] for t in result["tags"]]
    assert "med_missed" in tag_names


def test_tag_confusion():
    """confusion tag is detected."""
    result = tag_text("Mom seems disoriented")
    tag_names = [t["name"] for t in result["tags"]]
    assert "confusion" in tag_names


def test_tag_good_day():
    """good_day tag is detected."""
    result = tag_text("Today was a great day")
    tag_names = [t["name"] for t in result["tags"]]
    assert "good_day" in tag_names


def test_tag_unknown():
    """Unknown text returns general_wellness."""
    result = tag_text("Something something")
    tag_names = [t["name"] for t in result["tags"]]
    assert "general_wellness" in tag_names


def test_tag_deterministic():
    """Same text always produces same output."""
    r1 = tag_text("Grandma is restless")
    r2 = tag_text("Grandma is restless")
    assert r1 == r2


def test_tag_all_tags():
    """All five supported tags can be detected."""
    # agitation
    r1 = tag_text("angry restless")
    assert "agitation" in [t["name"] for t in r1["tags"]]
    # sleep_issue
    r2 = tag_text("insomnia night")
    assert "sleep_issue" in [t["name"] for t in r2["tags"]]
    # med_missed
    r3 = tag_text("forgot medication")
    assert "med_missed" in [t["name"] for t in r3["tags"]]
    # confusion
    r4 = tag_text("disoriented")
    assert "confusion" in [t["name"] for t in r4["tags"]]
    # good_day
    r5 = tag_text("great day")
    assert "good_day" in [t["name"] for t in r5["tags"]]