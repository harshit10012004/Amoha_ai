# ml/ - Cognitive Support Personalization Backbone

## Purpose
This module implements the machine learning backbone for the AMOHA dementia-support personalization system. **All outputs are non-diagnostic and intended for routine personalization only** — this is not a diagnostic system.

## Folder Structure

| Folder | Purpose |
|---|---|
| `data/` | Raw and processed input data (sensor, activity, routine logs) |
| `features/` | Feature engineering pipelines and transformation logic |
| `models/` | Trained model artifacts, configs, and persistence logic |
| `training/` | Training loops, hyperparameter tuning, and model evaluation |
| `inference/` | Real-time/prediction inference entry points |
| `explainability/` | SHAP values, feature importance, and model interpretability |
| `utils/` | Shared utilities, logging, and serialization helpers |

## Integration
This module is designed to be called by a backend service (e.g., Yellow) for routine activity personalization, not medical diagnosis.