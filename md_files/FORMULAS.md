# Formulas and Core Algorithms – Amoha AI Caregiver Support System

## Overview

The Amoha AI system is a caregiver-support platform that analyzes care log text, behavioral features, and game-based cognitive metrics to predict assistance probability, generate supportive recommendations, and adapt game difficulty for dementia care. The core mathematical/algorithmic ideas span four domains:

1. **Rule-based NLP tagging** – Deterministic keyword matching with negation handling to extract clinical symptom signals from free-text care logs.
2. **Threshold-based decision rules** – Fixed accuracy and feature thresholds that drive game difficulty adjustment, alert level classification, and assistance probability estimation.
3. **Probabilistic ML classification** – Logistic regression (or random forest) that maps 16 behavioral features to an assistance probability in [0,1].
4. **Library-driven recommendation generation** – Condition-tagged lookup library that maps detected symptoms and system state to caregiver support actions.

The system is designed for offline operation (rule-based fallbacks), deterministic output for repeated inputs, and non-diagnostic, supportive output that avoids medical conclusions. All probability outputs are clamped to [0,1] and alert levels follow a three-tier hierarchy (info → support → caregiver_review).

---

## Module: nlp_tagger

### Purpose

The rule-based NLP tagger extracts cognitive and emotional symptom tags (agitation, sleep_issue, med_missed, confusion, good_day) from caregiver-entered care log text. It handles simple negation patterns (no X, not X, did not X) and returns confidence scores that reflect whether a tag is affirmed or negated.

### Core Formula / Algorithm

The tagger uses **keyword matching** with a **negation parser**. For each tag, a set of keyword patterns is defined; if any keyword is found in the lowercased text, the tag is activated. Negation is determined by checking for negation words (no, not, didn't, wasn't, etc.) preceding the keyword in the text.

The confidence score is assigned as:
- **0.8** if the tag is positively detected (no negation)
- **0.1** if the tag is negated

The negation check examines the substring preceding each keyword occurrence for patterns such as `no ... kw`, `not ... kw`, `did not kw`, `don't kw`, and verb contractions like `wasn't kw`.

### Variable Definitions

| Symbol / Term | Meaning |
|---|---|
| `text_lower` | The care log text converted to lowercase for case-insensitive matching |
| `KEYWORD_MAP` | Dict mapping tag names (`agitation`, `sleep_issue`, etc.) to lists of matching keywords |
| `negated_tags` | Set of tag names that have a negation word preceding their keyword |
| `confidence` | Float in [0,1]; 0.8 = positive signal, 0.1 = negated signal |
| `source` | Always `"local_rule"` for this module |
| `negated` | Boolean indicating whether the tag was found within a negation scope |

### Implementation Details

- **Primary file**: `src/nlp/tagger.py`
- **Key function**: `tag_text(text: str) -> dict` returns `{"tags": [{"name", "confidence", "source", "negated"}, ...]}`
- **Keyword definitions** are loaded from `data/keywords.json` at runtime
- **Negation parsing** uses regex patterns on the substring before each keyword position
- The module is **deterministic**: identical text always produces identical output

### Design Choices and Trade-offs

- **Accuracy vs. simplicity**: A pure rule-based approach is less flexible than deep learning but guarantees determinism, transparency, and offline operation — critical for caregiver-facing tools.
- **Negation handling**: The `_parse_negation_simple` function in `brain.py` and the more sophisticated `_parse_negation_simple` in `src/nlp/tagger.py` use different strategies; the tagger's approach of scanning the substring before each keyword is more thorough.
- **Confidence scaling**: Negated tags receive much lower confidence (0.1 vs. 0.8), which downstream modules (e.g., assistance probability computation) can weight differently.

---

## Module: analysis_brain

### Purpose

The core `analyze_care_log` function orchestrates the full analysis pipeline: it tags the input text, computes game difficulty from accuracy features, estimates assistance probability from behavioral features, maps the probability to an alert level, and generates caregiver suggestions based on detected tags and system state.

### Core Formula(s) / Algorithm(s)

#### 1. Game Difficulty Computation (`_compute_game_difficulty`)

Uses **accuracy threshold rules** to determine difficulty level (1=Easy, 2=Medium, 3=Hard) and action (reduce, keep, increase):

```
if accuracy < 0.60:          level=1, action="reduce"
elif accuracy >= 0.90:       level=3, action="increase"
elif 0.60 <= accuracy < 0.90: level=2, action="keep"
```

When `recent_accuracy` is available, recent performance takes precedence, with the same thresholds applied. Hysteresis prevents rapid difficulty changes after a recent action.

#### 2. Assistance Probability Computation (`_compute_assistance_probability`)

A **rule-based scoring model** that aggregates binary feature checks. Each contributing feature adds 1.0 to a score counter; the final probability is `score / n`, where `n` is the number of checked features. Features checked include:

- `completion_rate < 0.6` → contributes 1
- `missed_rate > 0.4` → contributes 1
- `response_delay > 2.0` → contributes 1
- `reminder_count > 3` → contributes 1
- `game_accuracy < 0.6` → contributes 1
- `avg_game_time > 60` → contributes 1
- `recent_accuracy < 0.6` → contributes 1

If `n > 0`: `probability = score / n`; else `probability = 0.5`.

An **evening/night time-of-day multiplier** of 1.1 is applied if the time of day is evening or night.

#### 3. Alert Level Mapping (`_compute_alert_level`)

A simple piecewise function mapping assistance probability to alert level:

```
if probability >= 0.7:  → "caregiver_review"
elif probability >= 0.4: → "support"
else:                    → "info"
```

#### 4. Suggestion Building (`_build_suggestions`)

Tag-conditioned rule library that appends supportive suggestion dicts based on detected tags (agitation, sleep_issue, med_missed, confusion) and the assistance probability.

### Variable Definitions

| Symbol / Term | Meaning |
|---|---|
| `accuracy` | Current game accuracy in [0,1] |
| `recent_accuracy` | Recent (last N games) average accuracy in [0,1] |
| `level` | Difficulty level: 1=Easy, 2=Medium, 3=Hard |
| `action` | Difficulty action: "reduce", "keep", "increase" |
| `score` | Aggregated rule-based score in [0, n] |
| `n` | Number of feature checks performed |
| `tod` | Time-of-day string (e.g., "day", "evening", "night") |
| `probability` | Assistance probability in [0,1] |
| `alert_level` | One of "info", "support", "caregiver_review" |

### Implementation Details

- **Primary file**: `brain.py` (the top-level module)
- **Key functions**:
  - `_compute_game_difficulty(accuracy, recent_accuracy)` → dict with level/action/reason/confidence
  - `_compute_assistance_probability(features)` → probability in [0,1]
  - `_compute_alert_level(assistance_probability)` → "info"/"support"/"caregiver_review"
  - `_build_suggestions(tags, assistance_probability, game_difficulty)` → list of suggestion dicts
  - `analyze_care_log(text, accuracy, behavioral_features, user_id, timestamp)` → full result dict
- **Feature dict keys** used: `completion_rate`, `missed_rate`, `response_delay`, `reminder_count`, `game_accuracy`, `avg_game_time`, `recent_accuracy`, `time_of_day`, and derived tag counts
- **Backward-compatible shim** `_analyze_care_log_old` preserves the old 2-argument signature

### Design Choices and Trade-offs

- **Rule-based over ML**: The assistance probability and game difficulty use hand-crafted rules rather than learned models. This ensures transparency, ease of debugging, and immediate functionality without requiring a trained model artifact.
- **Hysteresis in difficulty**: The `HYSTERESIS_COUNT = 2` in `adaptive_logic.py` prevents the difficulty from oscillating on borderline accuracy values, at the cost of potentially slower adaptation to genuine performance changes.
- **Time-of-day bias**: The 1.1 multiplier for evening/night in assistance probability reflects the observation that users tend to need more support later in the day, but may introduce bias for users with inverted routines.

---

## Module: assistance_model

### Purpose

The `AssistanceModel` class provides a machine learning interface for predicting assistance probability from behavioral feature vectors. It supports two model types — logistic regression (default) and random forest — and handles training, prediction, saving, and loading.

### Core Formula / Algorithm

#### Logistic Regression Model

The logistic regression model computes the assistance probability via the **sigmoid (logistic) function**:

\[
p = \sigma(\mathbf{w} \cdot \mathbf{x} + b) = \frac{1}{1 + e^{-(\mathbf{w} \cdot \mathbf{x} + b)}}
\]

where:
- \(\mathbf{w}\) is the weight vector learned during training
- \(\mathbf{x}\) is the 16-dimensional feature vector
- \(b\) is the bias term
- \(\sigma(z) = 1 / (1 + e^{-z})\) is the logistic sigmoid

The model is trained with the `lbfgs` solver and L2 regularization (default scikit-learn defaults).

#### Random Forest Model

If `model_type="random_forest"`, the model uses an ensemble of 100 decision trees, each trained on a bootstrap sample of the data with `max_depth=5`. The predicted probability is the proportion of trees voting class 1 (needs assistance), averaged across all trees:

\[
p = \frac{1}{T} \sum_{t=1}^{T} \mathbb{1}[f_t(\mathbf{x}) = 1]
\]

where \(T = 100\) is the number of trees and \(f_t\) is the \(t\)-th tree's prediction.

### Variable Definitions

| Symbol / Term | Meaning |
|---|---|
| \(\mathbf{x}\) | Feature vector of length 16 (see `FEATURE_ORDER` in `feature_engineering.py`) |
| \(\mathbf{w}\) | Learned weight vector (logistic) or tree split indicators (random forest) |
| \(b\) | Learned bias term (logistic) |
| \(\sigma\) | Sigmoid activation function |
| \(T\) | Number of trees in the random forest (100) |
| `n_estimators` | Number of trees in the random forest |
| `max_depth` | Maximum depth of each tree (5) |
| `random_state` | Seed for reproducibility (42) |

### Implementation Details

- **Primary file**: `ml/models/assistance_model.py`
- **Key classes/functions**:
  - `AssistanceModel.__init__(model_type="logistic", random_state=42)` — constructor
  - `AssistanceModel.train(X, y, test_size=0.2)` — trains and evaluates the model; returns ROC-AUC and classification report
  - `AssistanceModel.predict_proba(X)` → ndarray of probabilities in [0,1]
  - `AssistanceModel.predict(X, threshold=0.5)` → binary predictions
  - `AssistanceModel.save(filepath)` / `AssistanceModel.load(filepath)` — joblib persistence
  - `fit_assistance_model(X, y, ...)` — convenience function that trains and returns the model
  - `predict_assistance_probability(model, X)` — predicts probability using a trained model (falls back to 0.5 if untrained)
- **Feature order**: `FEATURE_ORDER = ['completion_rate', 'missed_rate', 'response_delay', 'reminder_count', 'game_accuracy', 'avg_game_time', 'recent_accuracy', 'time_of_day', 'agitation_count_7d', 'sleep_issue_count_7d', 'med_missed_count_7d', 'confusion_count_7d', 'positive_day_ratio', 'evening_agitation_rate']` (16 features)
- **Synthetic training** in `ml/analyze_assistance.py` uses `np.random.rand(20, 16)` features and balanced binary labels (10 class 0, 10 class 1) for demo purposes

### Design Choices and Trade-offs

- **Logistic regression as default**: Chosen for interpretability (weights directly indicate feature direction/scale) and speed. The linear decision boundary is a simplification when cognitive patterns may be nonlinear, but works well with 16 carefully engineered features.
- **Random forest alternative**: Provides nonlinear decision boundaries and feature interaction capture, at the cost of increased model size and slightly slower inference. `max_depth=5` limits overfitting on small datasets.
- **Synthetic demo data**: The `ml/analyze_assistance.py` script trains on randomly generated data for demonstration; in production, a properly labeled dataset with real assistance outcomes would be required.
- **Probability clamping**: `predict_proba` returns `np.clip(proba, 0.0, 1.0)` to ensure valid probability output even if the raw model output slightly exceeds [0,1].

---

## Module: feature_engineering

### Purpose

The feature engineering module validates, cleans, and orders behavioral feature records into a stable pandas DataFrame format compatible with the assistance model and other ML components. It ensures that all feature values fall within expected ranges and replaces invalid or missing values with safe defaults.

### Core Algorithm

#### `validate_record(record: dict) -> dict`

Iterates over the `VALIDATION_RULES` dict and for each feature field:
- If the rule is `None` (non-numeric, e.g., `time_of_day`), keeps the value as-is or defaults to `None`
- If the field exists in the record, validates it is numeric and within `[min_val, max_val]`
- If the field is missing, fills it with the midpoint of the valid range (or min/max if only one bound exists)
- If the value is out of range, replaces it with the midpoint of the valid range

#### `build_feature_frame(records: list[dict]) -> pd.DataFrame`

For each record in the input list, calls `validate_record` to clean it, then extracts values in the order defined by `FEATURE_ORDER` to construct a DataFrame row. All rows are concatenated into a single DataFrame with columns ordered per `FEATURE_ORDER`.

#### `FEATURE_ORDER` (stable feature sequence)

```
['completion_rate', 'missed_rate', 'response_delay', 'reminder_count',
 'game_accuracy', 'avg_game_time', 'recent_accuracy', 'time_of_day',
 'agitation_count_7d', 'sleep_issue_count_7d', 'med_missed_count_7d',
 'confusion_count_7d', 'positive_day_ratio', 'evening_agitation_rate']
```

This order is designed to match the feature vectors expected by the assistance model.

### Variable Definitions

| Symbol / Term | Meaning |
|---|---|
| `VALIDATION_RULES` | Dict mapping feature names to `(min, max)` validation bounds; `None` for non-numeric fields |
| `FEATURE_ORDER` | Ordered list of 16 feature names defining column order in output DataFrame |
| `min_val`, `max_val` | Lower and upper bounds for numeric feature validation |
| `cleaned` | Sanitized record dict with all fields filled and validated |
| `row` | A single DataFrame row as a dict mapping feature name → validated value |
| `df` | Output pandas DataFrame with stable column order |

### Implementation Details

- **Primary file**: `ml/features/feature_engineering.py`
- **Key functions**:
  - `validate_numeric(value, field_name, min_val, max_val)` — validates a single numeric value within bounds
  - `validate_record(record)` — cleans and validates a single record dict
  - `build_feature_frame(records)` — builds a DataFrame from a list of record dicts
  - `get_feature_order()` — returns the ordered feature name list
- **Validation bounds** (`VALIDATION_RULES`):
  - `completion_rate`: [0.0, 1.0]
  - `missed_rate`: [0.0, 1.0]
  - `response_delay`: [0.0, ∞)
  - `reminder_count`: [0, ∞)
  - `game_accuracy`: [0.0, 1.0]
  - `avg_game_time`: [0.0, ∞)
  - `recent_accuracy`: [0.0, 1.0]
  - `time_of_day`: None (categorical)
  - `agitation_count_7d`: [0, ∞)
  - `sleep_issue_count_7d`: [0, ∞)
  - `med_missed_count_7d`: [0, ∞)
  - `confusion_count_7d`: [0, ∞)
  - `positive_day_ratio`: [0.0, 1.0]
  - `evening_agitation_rate`: [0.0, 1.0]

### Design Choices and Trade-offs

- **Midpoint default for out-of-range values**: When a feature value falls outside its valid range, it is replaced with the midpoint of the allowed range rather than clamping to the nearest bound. This is a conservative choice that avoids extreme values influencing the model but may dilute the signal from genuinely anomalous data.
- **Missing-field interpolation**: Missing numeric fields are filled with the midpoint of their valid range, ensuring the feature vector always has 16 dimensions without zero-padding artifacts.
- **Stable feature ordering**: The explicit `FEATURE_ORDER` list ensures consistency across training, inference, and feature importance analysis, which is critical when the model is retrained or features are re-engineered.

---

## Module: inference_predictor

### Purpose

The predictor module provides the entry point for assistance probability prediction in the Yellow backend integration. It prefers a trained ML model if a `model_path` is provided and the model is trained; otherwise it falls back to the rule-based assistance probability computation that mirrors the brain module's logic.

### Core Algorithm

#### Model Prediction Path

1. Load the model from `model_path` using `ml.models.assistance_model.load_model`
2. Build a feature DataFrame from `behavioral_features` using `ml.features.feature_engineering.build_feature_frame` and `get_feature_order` to ensure all 16 features are present
3. Run `predict_assistance_probability(model, X)` to get the probability
4. Clip to [0,1] and determine alert level

#### Rule-Based Fallback Path

If no model is provided, the model is untrained, or prediction fails, the `_rule_based_assistance` function is used. This implements the same scoring logic as `_compute_assistance_probability` in the brain module:

```
score = 0; n = 0
if completion_rate < 0.6:       score += 1; n += 1
if missed_rate > 0.4:           score += 1; n += 1
if response_delay > 2.0:        score += 1; n += 1
if reminder_count > 3:          score += 1; n += 1
if game_accuracy < 0.6:         score += 1; n += 1
if avg_game_time > 60:          score += 1; n += 1
if recent_accuracy < 0.6:       score += 1; n += 1
if n > 0: probability = score / n
else:     probability = 0.5
if time_of_day is evening/night: probability *= 1.1
probability = min(round(probability, 3), 1.0)
```

#### Alert Level Mapping

Same three-tier mapping as the brain module:
```
if probability >= 0.7:  → "caregiver_review"
elif probability >= 0.4: → "support"
else:                    → "info"
```

### Variable Definitions

| Symbol / Term | Meaning |
|---|---|
| `behavioral_features` | Dict with keys: completion_rate, missed_rate, response_delay, reminder_count, game_accuracy, avg_game_time, recent_accuracy, time_of_day |
| `model_path` | Optional path to a joblib-trained AssistanceModel file |
| `feature_order` | Ordered list of 16 feature names from `get_feature_order()` |
| `X` | numpy array of shape (1, 16) — single-sample feature matrix |
| `proba` | Assistance probability in [0,1] |
| `model_version` | String indicating "demo-v0.1" (rule-based) or model type (e.g., "logistic") |

### Implementation Details

- **Primary file**: `ml/inference/predictor.py`
- **Key functions**:
  - `_ensure_model(model_path)` — loads model from path or returns None
  - `_rule_based_assistance(behavioral_features, care_log_features)` — rule-based fallback (same logic as brain.py)
  - `predict_assistance(behavioral_features, care_log_features, model_path)` — main entry point
- **Smart defaults**: When building the feature DataFrame, missing features are filled with sensible defaults (`time_of_day="day"`, numeric features → 0.0)
- **Error handling**: If model prediction raises any exception, the function silently falls back to rule-based computation
- **Deterministic output**: Repeated identical inputs produce identical outputs (verified in tests)

### Design Choices and Trade-offs

- **Model-first with rule fallback**: The system attempts model prediction first, which provides potentially more accurate probability estimates when a good model is available, but gracefully degrades to transparent rule-based computation when the model is absent or malfunctioning.
- **Feature alignment**: The explicit feature-order alignment between the predictor and the training pipeline prevents shape mismatches that would cause silent failures.
- **Unified output schema**: Both the model and rule-based paths produce identical output structures (`assistance_probability`, `alert_level`, `explanation`, `model_version`), simplifying downstream consumption.

---

## Module: recommendations_engine

### Purpose

The recommendation engine generates caregiver support recommendations based on detected NLP tags, the estimated assistance probability, the current game difficulty state, and adherence features (e.g., reminder count). The output is a prioritized list of supportive, non-clinical suggestions.

### Core Algorithm

#### Recommendation Library

A **static library** maps tag names and system conditions to recommendation dicts. The library (`RECOMMENDATION_LIBRARY`) contains entries keyed by tag name, each containing recommendation types (e.g., `routine_support`, `caregiver_review`) with `text` and `reason` fields.

#### Recommendation Generation Logic

The `get_recommendation` function proceeds in steps:

1. **Tag-based recommendations**: For each detected tag name that exists in `RECOMMENDATION_LIBRARY`, append the corresponding recommendations to the output list.

2. **High assistance probability**: If `assistance_probability >= 0.7`, append a `caregiver_review` recommendation and set priority to "high" if current priority is lower.

3. **Repeated missed medications**: If `reminder_count >= 2`, append a `repeated_med_missed` recommendation and elevate priority.

4. **High reminder count**: If `reminder_count >= 3`, append a `high_reminder_count` recommendation and set priority to "medium" if current priority is lower.

5. **Mixed game accuracy**: If game difficulty action is "keep" AND assistance_probability < 0.5, append a `mixed_accuracy` recommendation.

6. **Default**: If no recommendations were generated, append a `routine_support` "Continue with the current routine" suggestion and set priority to "low".

#### Explanation Building

An explanation string is constructed from observation-based parts:
- Detected tags (e.g., "Tags detected: agitation, confusion.")
- Elevated assistance probability
- Repeated missed medications (with count)
- If no parts match, a generic "Analysis completed; no specific signals required action."

### Variable Definitions

| Symbol / Term | Meaning |
|---|---|
| `tags_names` | Set of detected tag names from the NLP tagger |
| `assistance_probability` | Float in [0,1] indicating assistance likelihood |
| `game_difficulty` | Dict with keys: level, action, reason, confidence |
| `rc` | Reminder count from adherence features |
| `priority` | One of "low", "medium", "high" |
| `explanation_parts` | List of explanation string fragments joined into final explanation |
| `RECOMMENDATION_LIBRARY` | Static dict mapping tag names → {rec_type → {text, reason}} |

### Implementation Details

- **Primary file**: `src/recommendations/engine.py`
- **Key functions**:
  - `get_recommendation(tags, assistance_probability, game_difficulty, adherence_features, recent_history)` — main entry point
  - `quick_recommend(tags, assistance_probability)` — convenience function for simple use cases
- **Tag detection**: Uses `tags_names = {t.get("name", "") for t in tags}` to extract tag names from the brain/tagger output
- **Priority hierarchy**: "high" > "medium" > "low"; the first condition that elevates priority sets it, subsequent conditions can only raise it further
- **Non-prescriptive stance**: All recommendations are supportive ("consider", "review", "continue") and explicitly avoid medical advice, prescriptions, or dosage changes

### Design Choices and Trade-offs

- **Library-driven over learned**: A static recommendation library is easily auditable and can be updated by non-technical domain experts without retraining models. The trade-off is reduced personalization compared to a learned ranking model.
- **Priority escalation logic**: The "first raises, subsequent can only raise" pattern ensures that the most critical signal dominates the priority, preventing noisy lower-priority signals from diluting the caregiver's attention.
- **No recent_history usage in current implementation**: The `recent_history` parameter is accepted but not actively used in the current recommendation logic; it is reserved for future enhancements such as trend-based suggestions.

---

## Module: adaptive_difficulty

### Purpose

The adaptive difficulty controller adjusts the game's cognitive difficulty level (1=Easy, 2=Medium, 3=Hard) based on the user's game accuracy and behavioral features. It implements rule-based adjustment with hysteresis/cooldown to prevent rapid difficulty oscillations.

### Core Algorithm

#### Threshold Definitions

Two fixed accuracy thresholds govern all decisions:

```
ACCURACY_LOW_THRESHOLD  = 0.60   # Below this → reduce difficulty
ACCURACY_HIGH_THRESHOLD = 0.90   # At or above this → consider increasing difficulty
```

#### Hysteresis

A hysteresis counter (`HYSTERESIS_COUNT = 2`) tracks consecutive observations in the current difficulty direction. If the counter reaches 2, the system maintains the current difficulty unless strong evidence suggests otherwise:

- If last action was "reduce" and current accuracy >= 0.60 → maintain (don't increase yet)
- If last action was "increase" and current accuracy < 0.90 → reduce back

#### Decision Logic (simplified)

The function `adjust_difficulty(game_accuracy, recent_accuracy, ...)` follows these priority rules:

1. **Hysteresis check** (if `last_action` and `hysteresis_counter >= 2`):
   - Maintain current difficulty with condition-specific exceptions

2. **Recent accuracy takes precedence** (if `recent_accuracy` is not None):
   - `recent_accuracy < 0.60` → reduce to level 1
   - `recent_accuracy >= 0.90` → consider increase (if current accuracy also high)
   - Otherwise → keep current level

3. **Current accuracy only** (cold start / no recent data):
   - `game_accuracy < 0.60` → level 1, reduce
   - `game_accuracy >= 0.90` → level 3, increase
   - Otherwise → level 2, keep

#### Cold Start

`cold_start_difficulty(time_of_day)` returns level 2 (Medium) by default, or level 1 (Easy) for evening/night sessions.

### Variable Definitions

| Symbol / Term | Meaning |
|---|---|
| `game_accuracy` | Current game accuracy in [0,1] |
| `recent_accuracy` | Recent (last N games) average accuracy in [0,1] |
| `level` | Difficulty level: 1=Easy, 2=Medium, 3=Hard |
| `action` | Difficulty action: "reduce", "keep", "increase" |
| `HYSTERESIS_COUNT` | Number of consecutive observations needed to lock in a direction (2) |
| `ACCURACY_LOW_THRESHOLD` | 0.60 — below this, difficulty should be reduced |
| `ACCURACY_HIGH_THRESHOLD` | 0.90 — at or above this, difficulty may be increased |

### Implementation Details

- **Primary file**: `src/reminders/adaptive_logic.py`
- **Key function**: `adjust_difficulty(game_accuracy, recent_accuracy, avg_game_time, time_of_day, last_action, hysteresis_counter)` → dict with level/action/reason/confidence
- **Hysteresis mechanics**: The `hysteresis_counter` is incremented when the difficulty action stays the same across consecutive calls, and reset when the direction changes
- **Input validation**: Raises `ValueError` if `game_accuracy` is outside [0, 1]
- **Default cold-start behavior**: Level 2 (Medium) for most users; level 1 (Easy) for evening/night sessions

### Design Choices and Trade-offs

- **Hysteresis for stability**: The 2-observation hysteresis prevents the difficulty from oscillating between levels on every game session when accuracy fluctuates around the threshold, at the cost of potentially slower adaptation to genuine skill changes.
- **Recent accuracy weighting**: When recent accuracy is available, it overrides current accuracy, reflecting the intuition that a user's recent performance trend is more indicative of their current capability than a single session's score.
- **One-way difficulty changes**: The function can reduce or keep difficulty, but increasing difficulty requires both current and recent accuracy to be high, providing a safety guard against making the game too hard too quickly.

---

## Appendix: Glossary of Symbols

| Symbol | Meaning | Module |
|---|---|---|
| `σ(z)` | Sigmoid: `1 / (1 + e^(-z))` | assistance_model |
| `𝐰 · 𝐱` | Dot product of weight vector and feature vector | assistance_model |
| `p` | Assistance probability in [0,1] | brain, predictor, assistance_model |
| `accuracy` | Game accuracy in [0,1] | brain, adaptive_difficulty |
| `recent_accuracy` | Recent average game accuracy in [0,1] | brain, adaptive_difficulty |
| `score` | Aggregated rule-based score [0, n] | brain, predictor |
| `n` | Number of feature checks | brain, predictor |
| `T` | Number of trees in random forest (100) | assistance_model |
| `HYSTERESIS_COUNT` | Consecutive observations for hysteresis lock (2) | adaptive_difficulty |
| `ACCURACY_LOW_THRESHOLD` | 0.60 — below → reduce difficulty | adaptive_difficulty |
| `ACCURACY_HIGH_THRESHOLD` | 0.90 — at or above → consider increase | adaptive_difficulty |
| `FEATURE_ORDER` | 16 feature names in stable sequence | feature_engineering |
| `VALIDATION_RULES` | Feature → (min, max) bounds dict | feature_engineering |
| `KEYWORD_MAP` | Tag → list of matching keywords | nlp_tagger |
| `confidence` | Tag confidence: 0.8 (positive), 0.1 (negated) | nlp_tagger |
| `alert_level` | One of "info", "support", "caregiver_review" | brain, predictor |
| `priority` | One of "low", "medium", "high" | recommendations_engine |
| `level` | Difficulty level: 1=Easy, 2=Medium, 3=Hard | adaptive_difficulty |
| `action` | Difficulty action: "reduce", "keep", "increase" | brain, adaptive_difficulty |

---

## References

- All formulas and algorithms are implemented in the Python source files under `Amoha_ai_ml/`.
- The rule-based assistance probability and game difficulty logic in `brain.py` and `adaptive_logic.py` was designed for transparency and offline operation.
- The assistance model in `ml/models/assistance_model.py` uses scikit-learn's `LogisticRegression` (LBFGS solver) or `RandomForestClassifier` (100 trees, max_depth=5).
- The recommendation library in `src/recommendations/engine.py` is a static, condition-tagged library for supportive caregiver suggestions.
- Negation handling in the NLP tagger (`src/nlp/tagger.py`) supports `no X`, `not X`, `did not X`, `don't X`, and verb contraction patterns.