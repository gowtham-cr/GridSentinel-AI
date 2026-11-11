"""
Model Persistence and Artifact Store for Scikit-learn Cybersecurity Models.
Saves and loads genuine scikit-learn pipelines with actual computed evaluation metrics.
"""

from datetime import datetime, timezone
import json
import os
from pathlib import Path
from typing import Optional, Dict, Any
import joblib
from app.core.config import settings
from app.core.logging import logger
from app.cybersecurity.schemas import ModelMetrics


class ModelStore:
    """Manages saving, loading, and auditing of Scikit-learn detection models."""

    def __init__(self, storage_dir: Optional[str] = None):
        self.storage_dir = Path(storage_dir or settings.MODEL_STORAGE_DIR)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.pipeline_file = self.storage_dir / "gridsentinel_ml_pipeline.joblib"
        self.metadata_file = self.storage_dir / "model_metadata.json"

    def save_model(
        self,
        pipeline: Any,
        metrics: Dict[str, Any],
    ) -> str:
        """Saves pipeline and metadata to disk."""
        joblib.dump(pipeline, self.pipeline_file)
        
        metadata = {
            "model_type": metrics.get("model_type", "IsolationForest+RandomForest"),
            "trained_at": datetime.now(timezone.utc).isoformat(),
            "num_training_samples": metrics.get("num_training_samples", 0),
            "num_test_samples": metrics.get("num_test_samples", 0),
            "accuracy": round(float(metrics.get("accuracy", 0.0)), 4),
            "f1_score": round(float(metrics.get("f1_score", 0.0)), 4),
            "features_used": metrics.get("features_used", []),
            "model_file_path": str(self.pipeline_file),
        }
        
        with open(self.metadata_file, "w") as f:
            json.dump(metadata, f, indent=2)

        logger.info(f"Saved trained Scikit-learn pipeline to {self.pipeline_file}")
        return str(self.pipeline_file)

    def load_model(self) -> Optional[Any]:
        """Loads saved Scikit-learn pipeline from disk."""
        if not self.pipeline_file.exists():
            return None
        try:
            pipeline = joblib.load(self.pipeline_file)
            logger.info(f"Loaded existing Scikit-learn pipeline from {self.pipeline_file}")
            return pipeline
        except Exception as e:
            logger.error(f"Failed to load model file: {e}")
            return None

    def get_metrics(self) -> Optional[ModelMetrics]:
        """Retrieves verified evaluation metrics from disk."""
        if not self.metadata_file.exists():
            return None
        try:
            with open(self.metadata_file, "r") as f:
                data = json.load(f)
            return ModelMetrics(**data)
        except Exception as e:
            logger.error(f"Failed to load model metadata: {e}")
            return None

