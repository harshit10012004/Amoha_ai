"""Rule-based NLP tagger for caregiver care-log text.

Supports tags: agitation, sleep_issue, med_missed, confusion, good_day.

The tagger returns confidence scores between 0 and 1, includes the source
of the tag, handles simple negation, and is deterministic.

Preferred output:
    {
        "tags": [
            {
                "name": "med_missed",
                "confidence": 0.91,
                "source": "local_rule"
            }
        ]
    }
"""
import re

# Keywords mapped to tag names
KEYWORD_MAP = {
    "agitation": ["angry", "restless", "yell", "frustrated", "shouting", "violent", "irritated", "agitated", "upset", "anxious", "fidgety", "agitation"],
    "sleep_issue": ["awake", "insomnia", "night", "sleepless", "sleepy", "nap", "tired", "exhausted", "restless", "drowsy", "wakeful", "sleep_issue"],
    "med_missed": ["forgot", "missed", "medication", "pill", "dose", "tablet", "skip", "med_missed"],
    "confusion": ["confused", "confusion", "disoriented", "lost", "bewildered", "confusion"],
    "good_day": ["good", "great", "well", "fine", "positive", "excellent", "good_day"],
}


def _find_keyword_positions(text_lower):
    """Find all (tag_name, keyword, position) tuples in the text."""
    positions = []
    for tag_name, keywords in KEYWORD_MAP.items():
        for kw in keywords:
            # Find all occurrences of the keyword
            start = 0
            while True:
                pos = text_lower.find(kw, start)
                if pos == -1:
                    break
                positions.append((tag_name, kw, pos))
                start = pos + 1
    return positions


def _parse_negation_simple(text_lower):
    """Simple negation parser: look for negation words before keywords.

    Handles:
      - "no X"        -> X is negated
      - "not X"       -> X is negated
      - "did not X"   -> X is negated
      - "don't X"     -> X is negated
      - "wasn't X"    -> X is negated
    """
    negated = set()

    # Find all keyword positions
    kw_positions = _find_keyword_positions(text_lower)

    # For each keyword occurrence, check if a negation word precedes it
    for tag_name, kw, kw_pos in kw_positions:
        # Look back up to 3 words for a negation word
        words = text_lower.split()
        # Find the word index for the keyword position
        # Simple approach: check the substring before the keyword
        before_kw = text_lower[:kw_pos]

        # Check for negation patterns in the text before the keyword
        # Pattern: "no ... kw"
        if re.search(r"\bno\b", before_kw) and not re.search(r"\bno\b.*\bno\b", before_kw):
            negated.add(tag_name)

        # Pattern: "not ... kw" or " ... not kw"
        # Check if "not" appears before the keyword
        # Find position of "not" before kw_pos
        not_before = before_kw.rfind("not ")
        if not_before >= 0:
            # Make sure there's no other "not" between the found "not" and kw
            segment = before_kw[not_before + 4:kw_pos]
            if "not" not in segment.lower():
                negated.add(tag_name)
            else:
                # There are multiple "not"s - check if this is the closest one
                last_not = before_kw.rfind("not ", 0, kw_pos)
                if last_not >= 0:
                    segment2 = before_kw[last_not + 4:kw_pos]
                    if "not" not in segment2.lower():
                        negated.add(tag_name)

        # Pattern: "did not kw" / "does not kw" / "don't kw" / "didn't kw"
        # Check for "did " or "does " or "don't" or "didn't" before keyword
        for NegPat in [r"\bdid\s+not\b", r"\bdoes\s+not\b", r"\bdon't\b", r"\bdidn't\b", r"\bnot\s+did\b"]:
            if re.search(NegPat, before_kw):
                # Verify the structure: negation before keyword
                negated.add(tag_name)
                break

        # Pattern: "wasn't kw" / "isn't kw" / "aren't kw"
        for NegPat in [r"\bwasn't\b", r"\bisn't\b", r"\baren't\b"]:
            if re.search(NegPat, before_kw):
                negated.add(tag_name)
                break

    return negated


def tag_text(text: str) -> dict:
    """Tag a care-log text entry and return structured results.

    Parameters
    ----------
    text : str
        Caregiver-entered care log text.

    Returns
    -------
    dict
        {
            "tags": [
                {
                    "name": str,          # tag name
                    "confidence": float, # 0-1 confidence score
                    "source": str,       # "local_rule"
                    "negated": bool,     # True if the tag was negated
                }
            ]
        }
    """
    text_lower = text.lower()

    # Parse negation first
    negated_tags = _parse_negation_simple(text_lower)

    # Find keywords for each tag
    found = []
    seen = set()

    # Get all keyword positions with tag names
    kw_positions = _find_keyword_positions(text_lower)

    # For each keyword found, create a tag entry
    for tag_name, kw, kw_pos in kw_positions:
        if tag_name not in seen:
            # Determine confidence based on negation
            if tag_name in negated_tags:
                confidence = 0.1  # Very low confidence for negated
            else:
                confidence = 0.8
            found.append({
                "name": tag_name,
                "confidence": confidence,
                "source": "local_rule",
                "negated": tag_name in negated_tags,
            })
            seen.add(tag_name)

    # If no tags found, return general_wellness
    if not found:
        found.append({
            "name": "general_wellness",
            "confidence": 0.5,
            "source": "local_rule",
            "negated": False,
        })

    return {"tags": found}


def analyze(text: str) -> dict:
    """Alias for tag_text for compatibility.

    Parameters
    ----------
    text : str
        Caregiver-entered care log text.

    Returns
    -------
    dict
        Tagged result dict.
    """
    return tag_text(text)


# Test hook
if __name__ == "__main__":
    import json
    import sys

    if len(sys.argv) < 2:
        print("Usage: python tagger.py <text>")
        sys.exit(1)

    result = tag_text(sys.argv[1])
    print(json.dumps(result, indent=2))