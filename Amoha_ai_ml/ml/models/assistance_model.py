"""Assistance probability model for dementia-support app.

This module provides a cognitive-support / routine-personalization tool
that predicts the probability a user needs assistance based on behavioral
features. It must NOT be used to diagnose dementia or make medical decisions.

ML system is a cognitive-support / routine-personalization tool.
It must NOT diagnose dementia, estimate disease severity, or make
medical decisions. Caregivers and qualified clinicians remain
responsible for all medical decisions.
"""

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score


class AssistanceModel:
    """Binary classifier predicting assistance probability.

    Trains a Logistic Regression or Random Forest classifier and provides
    assistance probabilities. The model outputs a probability
    in [0, 1] indicating the likelihood that the user needs assistance,
    but must NOT be used for diagnosis or medical decisions.
    """

    def __init__(self, model_type: str = "logistic", random_state: int = 42):
        self.model_type = model_type if model_type in ("logistic", "random_forest") else "logistic"
        self.random_state = random_state
        self.model = None
        self.is_trained = False

    def train(self, X, y, test_size: float = 0.2):
        """Train the assistance probability model.

        Parameters
        ----------
        X : array-like of shape (n_samples, n_features)
            Feature matrix (pandas DataFrame or NumPy array).
        y : array-like of shape (n_samples,)
            Binary labels: 1 = needs assistance, 0 = no assistance needed.
        test_size : float, default 0.2
            Proportion of data used for validation split.

        Returns
        -------
        dict
            Validation metrics including ROC-AUC and classification report.
        """
        X = np.asarray(X, dtype=np.float64)
        y = np.asarray(y, dtype=np.int8)

        if len(np.unique(y)) < 2:
            raise ValueError("Training labels must contain both classes (0 and 1).")

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=self.random_state, stratify=y
        )

        if self.model_type == "logistic":
            self.model = LogisticRegression(
                random_state=self.random_state,
                max_iter=1000,
                solver="lbfgs",
            )
        else:
            self.model = RandomForestClassifier(
                random_state=self.random_state,
                n_estimators=100,
                max_depth=5,
            )

        self.model.fit(X_train, y_train)
        self.is_trained = True

        # Evaluate on hold-out set
        y_proba = self.model.predict_proba(X_test)[:, 1]
        y_pred = (y_proba >= 0.5).astype(int)

        metrics = {
            "roc_auc": float(roc_auc_score(y_test, y_proba)),
            "classification_report": classification_report(
                y_test, y_pred, output_dict=True, zero_division=0
            ),
        }
        return metrics

    def predict_proba(self, X) -> np.ndarray:
        """Predict assistance probability for each sample.

        Parameters
        ----------
        X : array-like of shape (n_samples, n_features)
            Feature vector(s) for which to predict assistance probability.

        Returns
        -------
        probabilities : ndarray of shape (n_samples,)
            Assistance probabilities in [0, 1]. Returns array of 0.5 if model
            is not yet trained.
        """
        if self.model is None:
            n = len(X) if hasattr(X, "__len__") else 1
            return np.full(n, 0.5, dtype=np.float64)

        X = np.asarray(X, dtype=np.float64)
        proba = self.model.predict_proba(X)[:, 1]
        return np.clip(proba, 0.0, 1.0)

    def predict(self, X, threshold: float = 0.5) -> np.ndarray:
        """Predict assistance class given probability threshold.

        Parameters
        ----------
        X : array-like of shape (n_samples, n_features)
            Feature vector(s).
        threshold : float, default 0.5
            Probability threshold above which assistance is predicted.

        Returns
        -------
        predictions : ndarray of shape (n_samples,)
            Binary predictions (1 = needs assistance, 0 = no assistance).
        """
        proba = self.predict_proba(X)
        return (proba >= threshold).astype(int)

    def save(self, filepath: str):
        """Save the trained model to disk using joblib.

        Parameters
        ----------
        filepath : str
            Path to save the model file (e.g. "assistance_model.joblib").
        """
        if self.model is None:
            raise ValueError("Model must be trained before saving.")
        joblib.dump(self, filepath)
        print(f"Model saved to {filepath}")

    @classmethod
    def load(cls, filepath: str):
        """Load a trained model from disk.

        Parameters
        ----------
        filepath : str
            Path to the model file (e.g. "assistance_model.joblib").

        Returns
        -------
        AssistanceModel
            Loaded model instance with trained weights.
        """
        model = joblib.load(filepath)
        return model


def fit_assistance_model(X, y, model_type: str = "logistic", random_state: int = 42):
    """Fit an assistance model and return the trained model.

    Parameters
    ----------
    X : array-like of shape (n_samples, n_features)
        Feature matrix.
    y : array-like of shape (n_samples,)
        Binary labels: 1 = needs assistance, 0 = no assistance needed.
    model_type : str, default "logistic"
        Either "logistic" or "random_forest".
    random_state : int, default 42
        Random seed for reproducibility.

    Returns
    -------
    AssistanceModel
        Trained model instance.
    """
    model = AssistanceModel(model_type=model_type, random_state=random_state)
    metrics = model.train(X, y)
    return model, metrics


def predict_assistance_probability(model, X) -> np.ndarray:
    """Predict assistance probability using a trained model.

    Parameters
    ----------
    model : AssistanceModel
        A trained AssistanceModel instance.
    X : array-like of shape (n_samples, n_features)
        Feature vector(s) for which to predict assistance probability.

    Returns
    -------
    ndarray of shape (n_samples,)
        Assistance probabilities in [0, 1].
    """
    if model is None or not model.is_trained:
        n = len(X) if hasattr(X, "__len__") else 1
        return np.full(n, 0.5, dtype=np.float64)
    return model.predict_proba(X)


def save_model(model, path: str):
    """Save a trained model to disk using joblib.

    Parameters
    ----------
    model : AssistanceModel
        A trained AssistanceModel instance.
    path : str
        Path to save the model file.
    """
    if model is None:
        raise ValueError("Model cannot be None.")
    model.save(path)


def load_model(path: str):
    """Load a trained model from disk.

    Parameters
    ----------
    path : str
        Path to the model file (e.g. "assistance_model.joblib").

    Returns
    -------
    AssistanceModel
        Loaded model instance with trained weights.
    """
    return AssistanceModel.load(path)


def extract_feature_vector_from_care_log(text, accuracy, behavioral_features=None):
    """Extract feature vector from care log text and behavioral features.

    Convenience wrapper using feature_engineering.build_feature_vector.

    Parameters
    ----------
    text : str
        Care log text entry.
    accuracy : float
        Accuracy score from [0, 1].
    behavioral_features : dict, optional
        Behavioral features such as completion_rate, missed_rate, etc.

    Returns
    -------
    ndarray of shape (16,)
        Numeric feature vector ready for model input.
    """
    from ml.features.feature_engineering import build_feature_vector

    features = extract_features_from_log(text, accuracy)
    vec = build_feature_vector(features, behavioral_features)
    return vec


def extract_features_from_log(text, accuracy):
    """Extract basic features from care log text and accuracy.

    Parameters
    ----------
    text : str
        Care log text entry.
    accuracy : float
        Accuracy score from [0, 1].

    Returns
    -------
    dict
        Feature dict with tag_counts and accuracy.
    """
    import json
    from pathlib import Path

    base_dir = Path(__file__).parent.parent.parent
    with open(base_dir / "data" / "keywords.json", 'r') as f:
        keyword_map = {
            'agitation': ['angry', 'restless', 'yell', 'frustrated', 'shouting', 'violent', 'irritated', 'agitated', 'upset', 'anxious', 'fidgety'],
            'sleep_issue': ['awake', 'insomnia', 'night', 'sleepless', 'sleepy', 'nap', 'tired', 'exhausted', 'restless', 'drowsy', 'wakeful'],
            'nutrition': ['refused', 'hungry', 'eat', 'food', 'meal', 'water', 'thirsty', 'appetite', 'starving', 'dehydrated', 'nourish'],
        }

    text_lower = text.lower()
    tag_counts = {}
    for tag, words in keyword_map.items():
        count = sum(1 for word in words if word in text_lower)
        if count > 0:
            tag_counts[tag] = count

    features = {}
    features['tag_counts'] = tag_counts
    features['accuracy'] = accuracy
    features['word_count'] = len(text.split())

    return features


def compute_risk_signals_from_features(features_dict):
    """Compute risk signals from feature dict (cognitive score, diabetes, APOE).

    Note: This function computes cognitive-support risk signals only.
    It must NOT be used for clinical diagnosis.

    Parameters
    ----------
    features_dict : dict
        Feature dictionary from feature_engineering.

    Returns
    -------
    dict
        Risk signals including cognitive_score, diabetes_signal, apoe_risk.
    """
    from ml.features.feature_engineering import compute_risk_signals
    return compute_risk_signals(features_dict)