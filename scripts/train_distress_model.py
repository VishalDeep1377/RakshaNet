"""
============================================================
RakshaNet — ML Distress Score Training Pipeline
============================================================
  Dataset : rakshanet/data/rakshanet_demo_distress_dataset.csv
  Target  : distress_label  (0 = safe, 1 = distress)
  Output  : rakshanet/lib/distress/mlModel.json
            (Logistic Regression weights + feature norms)

Strategy
--------
1. Train a Random Forest → get feature importances + OOB accuracy
2. Train a Logistic Regression (calibrated) → export weights to JSON
   (LR is trivially implement-able in TypeScript with no dependencies)
3. Blend factor: LR model will be weighted 40% alongside the existing
   rule-based engine (60%) in TypeScript.
============================================================
"""

import sys, json, os
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score, f1_score, precision_score, recall_score,
    roc_auc_score, confusion_matrix, classification_report
)
from sklearn.pipeline import Pipeline
from sklearn.calibration import CalibratedClassifierCV

# ── Paths ─────────────────────────────────────────────────────────
SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR     = os.path.dirname(SCRIPT_DIR)
CSV_PATH     = os.path.join(ROOT_DIR, "rakshanet", "data", "rakshanet_demo_distress_dataset.csv")
OUTPUT_PATH  = os.path.join(ROOT_DIR, "rakshanet", "lib", "distress", "mlModel.json")

print("=" * 60)
print("  RakshaNet — ML Distress Score Trainer")
print("=" * 60)

# ── 1. Load Data ──────────────────────────────────────────────────
print(f"\n[1/6] Loading dataset from:\n      {CSV_PATH}")
df = pd.read_csv(CSV_PATH)
print(f"      Rows: {len(df):,}  |  Columns: {len(df.columns)}")
print(f"      Distress class balance:")
vc = df["distress_label"].value_counts()
for label, count in vc.items():
    print(f"        label={label}: {count:,} rows ({count/len(df)*100:.1f}%)")

# ── 2. Feature Engineering ─────────────────────────────────────────
FEATURE_COLS = [
    # Audio features (most discriminative for screams/cries)
    "audio_rms",
    "audio_peak",
    "audio_zcr",
    "audio_spectral_centroid_hz",
    "audio_mfcc_mean",
    "audio_anomaly",
    # Motion features (falls, sudden grabs, struggles)
    "accel_magnitude_mean",
    "accel_std",
    "accel_max",
    "jerk_mean",
    "motion_anomaly",
    # Location/Route features
    "speed_kmh",
    "route_deviation_m",
    "distance_from_safe_zone_m",
    # Temporal context
    "hour_of_day",
    "night",
    "minutes_since_checkin",
    # Behavioural/History
    "incident_history",
    # User-initiated signals
    "user_trigger",
    "user_reported_unsafe",
]

TARGET_COL = "distress_label"

print(f"\n[2/6] Feature engineering")
print(f"      Using {len(FEATURE_COLS)} features")

X = df[FEATURE_COLS].copy()
y = df[TARGET_COL].copy()

# Derived interaction features to help the model
X["audio_motion_combined"] = X["audio_anomaly"] * X["motion_anomaly"]
X["rms_x_peak"]            = X["audio_rms"] * X["audio_peak"]
X["jerk_x_accel"]          = X["jerk_mean"] * X["accel_magnitude_mean"]
X["night_x_deviation"]     = X["night"] * X["route_deviation_m"]
X["checkin_late"]          = (X["minutes_since_checkin"] > 90).astype(int)

FINAL_FEATURES = FEATURE_COLS + [
    "audio_motion_combined", "rms_x_peak", "jerk_x_accel",
    "night_x_deviation", "checkin_late"
]
X = X[FINAL_FEATURES]

print(f"      Final feature count (with interactions): {len(FINAL_FEATURES)}")

# ── 3. Train / Test split ─────────────────────────────────────────
print(f"\n[3/6] Splitting: 80% train / 20% test (stratified)")
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
print(f"      Train: {len(X_train):,} | Test: {len(X_test):,}")

# ── 4. Random Forest (for feature importance + baseline) ──────────
print(f"\n[4/6] Training Random Forest (n_estimators=300, oob_score=True) ...")
rf = RandomForestClassifier(
    n_estimators=300,
    max_depth=None,
    min_samples_leaf=2,
    class_weight="balanced",
    oob_score=True,
    n_jobs=-1,
    random_state=42,
)
rf.fit(X_train, y_train)
rf_oob    = rf.oob_score_
rf_pred   = rf.predict(X_test)
rf_proba  = rf.predict_proba(X_test)[:, 1]
rf_acc    = accuracy_score(y_test, rf_pred)
rf_f1     = f1_score(y_test, rf_pred)
rf_prec   = precision_score(y_test, rf_pred)
rf_rec    = recall_score(y_test, rf_pred)
rf_auc    = roc_auc_score(y_test, rf_proba)

print(f"\n  ┌── Random Forest Results ──────────────────────────┐")
print(f"  │  OOB Score  : {rf_oob:.4f}")
print(f"  │  Accuracy   : {rf_acc:.4f}")
print(f"  │  Precision  : {rf_prec:.4f}")
print(f"  │  Recall     : {rf_rec:.4f}")
print(f"  │  F1 Score   : {rf_f1:.4f}")
print(f"  │  AUC-ROC    : {rf_auc:.4f}")
print(f"  └────────────────────────────────────────────────────┘")

# Feature importances
importances = pd.Series(rf.feature_importances_, index=FINAL_FEATURES)
importances = importances.sort_values(ascending=False)
print(f"\n  Top-10 Feature Importances:")
for feat, imp in importances.head(10).items():
    bar = "█" * int(imp * 60)
    print(f"    {feat:35s}  {imp:.4f}  {bar}")

cm = confusion_matrix(y_test, rf_pred)
print(f"\n  Confusion Matrix (RF):")
print(f"    TN={cm[0,0]}, FP={cm[0,1]}, FN={cm[1,0]}, TP={cm[1,1]}")

# ── 5. Logistic Regression (for JSON export) ──────────────────────
print(f"\n[5/6] Training Logistic Regression (for TypeScript export) ...")

# Scale features — store scaler params for TS inference
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled  = scaler.transform(X_test)

lr = LogisticRegression(
    C=1.0,
    max_iter=2000,
    class_weight="balanced",
    solver="lbfgs",
    random_state=42,
)
lr.fit(X_train_scaled, y_train)

lr_pred  = lr.predict(X_test_scaled)
lr_proba = lr.predict_proba(X_test_scaled)[:, 1]
lr_acc   = accuracy_score(y_test, lr_pred)
lr_f1    = f1_score(y_test, lr_pred)
lr_prec  = precision_score(y_test, lr_pred)
lr_rec   = recall_score(y_test, lr_pred)
lr_auc   = roc_auc_score(y_test, lr_proba)

print(f"\n  ┌── Logistic Regression Results ────────────────────┐")
print(f"  │  Accuracy   : {lr_acc:.4f}")
print(f"  │  Precision  : {lr_prec:.4f}")
print(f"  │  Recall     : {lr_rec:.4f}")
print(f"  │  F1 Score   : {lr_f1:.4f}")
print(f"  │  AUC-ROC    : {lr_auc:.4f}")
print(f"  └────────────────────────────────────────────────────┘")
print(f"\n{classification_report(y_test, lr_pred, target_names=['Safe (0)','Distress (1)'])}")

cm2 = confusion_matrix(y_test, lr_pred)
print(f"  Confusion Matrix (LR):")
print(f"    TN={cm2[0,0]}, FP={cm2[0,1]}, FN={cm2[1,0]}, TP={cm2[1,1]}")

# Cross-validation for robustness check
cv_scores = cross_val_score(lr, X_train_scaled, y_train, cv=5, scoring="f1")
print(f"\n  5-Fold CV F1 Scores: {cv_scores.round(4)}")
print(f"  CV Mean F1: {cv_scores.mean():.4f} (±{cv_scores.std():.4f})")

# ── 6. Export JSON Model ──────────────────────────────────────────
print(f"\n[6/6] Exporting model to JSON ...")

# Collect RF feature importances (normalized 0–1)
feature_importance_dict = {
    feat: float(importances.get(feat, 0.0))
    for feat in FINAL_FEATURES
}

# Threshold for binary classification (find optimal via F1)
thresholds = np.arange(0.1, 0.9, 0.01)
best_thresh, best_f1 = 0.5, 0.0
for t in thresholds:
    preds = (lr_proba >= t).astype(int)
    f1 = f1_score(y_test, preds, zero_division=0)
    if f1 > best_f1:
        best_f1 = f1
        best_thresh = float(t)

print(f"  Optimal classification threshold: {best_thresh:.2f}  (F1={best_f1:.4f})")

model_json = {
    "metadata": {
        "version": "1.0.0",
        "trained_at": pd.Timestamp.now().isoformat(),
        "dataset_rows": int(len(df)),
        "model_type": "LogisticRegression",
        "blend_weight": 0.40,
        "description": (
            "ML distress scorer for RakshaNet. "
            "Output probability 0-1 blended at 40% with rule-based engine (60%)."
        ),
        "performance": {
            "rf_oob_score":   round(float(rf_oob), 4),
            "rf_accuracy":    round(float(rf_acc), 4),
            "rf_f1":          round(float(rf_f1), 4),
            "rf_auc":         round(float(rf_auc), 4),
            "lr_accuracy":    round(float(lr_acc), 4),
            "lr_f1":          round(float(lr_f1), 4),
            "lr_auc":         round(float(lr_auc), 4),
            "cv_f1_mean":     round(float(cv_scores.mean()), 4),
            "cv_f1_std":      round(float(cv_scores.std()), 4),
        },
    },
    "features": FINAL_FEATURES,
    "feature_importances": feature_importance_dict,
    "scaler": {
        "mean": scaler.mean_.tolist(),
        "std":  scaler.scale_.tolist(),
    },
    "logistic_regression": {
        "intercept": float(lr.intercept_[0]),
        "coef":      lr.coef_[0].tolist(),
        "threshold": best_thresh,
    },
    # Human-readable top-5 rules derived from RF feature importance
    # These serve as a fallback quick-check if LR output is borderline
    "top5_features": importances.head(5).index.tolist(),
    "top5_importances": importances.head(5).tolist(),
}

os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
with open(OUTPUT_PATH, "w") as f:
    json.dump(model_json, f, indent=2)

print(f"\n  ✅ Model saved to:\n     {OUTPUT_PATH}")
print(f"\n{'=' * 60}")
print(f"  TRAINING COMPLETE")
print(f"  RF Accuracy : {rf_acc:.2%}  |  F1 : {rf_f1:.4f}  |  AUC : {rf_auc:.4f}")
print(f"  LR Accuracy : {lr_acc:.2%}  |  F1 : {lr_f1:.4f}  |  AUC : {lr_auc:.4f}")
print(f"{'=' * 60}\n")
