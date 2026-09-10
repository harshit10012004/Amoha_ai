"""Tests for the AssistanceModel module.

Trains on a synthetic dataset and verifies:
- Predictions are probabilities in [0, 1].
- Saving and loading works correctly.
- Model works with reasonable data sizes.
"""

import numpy as np
import joblib
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from ml.models.assistance_model import AssistanceModel


def make_binary_dataset(n_samples=20, n_features=16, seed=42):
    """Create a balanced binary dataset for assistance prediction."""
    np.random.seed(seed)
    X = np.random.rand(n_samples, n_features)
    y = np.array([0] * (n_samples // 2) + [1] * (n_samples - n_samples // 2))
    return X, y


def test_predict_proba_is_probability():
    """Check that predictions are probabilities in [0, 1]."""
    X, y = make_binary_dataset(n_samples=20, n_features=16)
    model = AssistanceModel(model_type="logistic")
    model.train(X, y)

    proba = model.predict_proba(X)
    assert isinstance(proba, np.ndarray), "predict_proba should return ndarray"
    assert proba.shape[0] == X.shape[0], "Output length must match input length"
    assert np.all((proba >= 0) & (proba <= 1)), (
        f"All probabilities must be in [0, 1], got {proba}"
    )


def test_save_load_preserves_model():
    """Check that saving and loading the model works correctly."""
    X, y = make_binary_dataset(n_samples=30, n_features=16)
    model = AssistanceModel(model_type="logistic")
    model.train(X, y)

    # Save to temp path
    path = "assistance_model_test.joblib"
    model.save(path)

    # Load back
    loaded = AssistanceModel.load(path)

    # Predictions should match
    original_proba = model.predict_proba(X)
    loaded_proba = loaded.predict_proba(X)
    np.testing.assert_array_almost_equal(original_proba, loaded_proba, decimal=5)

    # Cleanup
    if os.path.exists(path):
        os.remove(path)


def test_model_returns_float_probabilities():
    """Check that predict_proba returns float values in [0, 1]."""
    X, y = make_binary_dataset(n_samples=20, n_features=16)
    model = AssistanceModel(model_type="random_forest")
    model.train(X, y)

    proba = model.predict_proba(X)
    assert proba.dtype in (float, np.float32, np.float64), (
        f"Expected float dtype, got {proba.dtype}"
    )
    assert np.all((proba >= 0) & (proba <= 1))


if __name__ == "__main__":
    test_predict_proba_is_probability()
    print("PASS: test_predict_proba_is_probability")

    test_save_load_preserves_model()
    print("PASS: test_save_load_preserves_model")

    test_model_returns_float_probabilities()
    print("PASS: test_model_returns_float_probabilities")

    print("\nAll tests passed!")