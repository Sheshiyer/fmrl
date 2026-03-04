#!/usr/bin/env python3
import json
from pathlib import Path
import numpy as np

from backend.core.metrics.basic import BasicMetrics
from backend.core.metrics.color import ColorMetrics
from backend.core.metrics.geometric import GeometricMetrics
from backend.core.metrics.nonlinear import NonlinearMetrics
from backend.core.metrics.symmetry import SymmetryMetrics
from backend.core.scores.energy import EnergyScoreCalculator
from backend.core.scores.coherence import CoherenceScoreCalculator

ROOT = Path(__file__).resolve().parents[2]
ARTIFACT_DIR = ROOT / "scripts" / "parity" / "artifacts"
DATASET = ARTIFACT_DIR / "golden_frames.json"
OUT = ARTIFACT_DIR / "python_metrics.json"


def frame_to_img(frame):
    width = frame["width"]
    height = frame["height"]
    arr = np.array(frame["bytes"], dtype=np.uint8).reshape((height, width))
    return np.stack([arr, arr, arr], axis=-1)


def main():
    payload = json.loads(DATASET.read_text())
    basic = BasicMetrics()
    color = ColorMetrics()
    geometric = GeometricMetrics()
    nonlinear = NonlinearMetrics()
    symmetry = SymmetryMetrics()
    energy_calc = EnergyScoreCalculator()
    coherence_calc = CoherenceScoreCalculator()

    outputs = []
    for frame in payload["frames"]:
        img = frame_to_img(frame)
        basic_m = basic.calculate(img)
        color_m = color.calculate(img)
        geo_m = geometric.calculate(img)
        nonlin_m = nonlinear.calculate(img)
        sym_m = symmetry.calculate(img)
        merged = {**basic_m, **color_m, **geo_m, **nonlin_m, **sym_m}
        outputs.append({
            "id": frame["id"],
            "basic": {
                "intensity_mean": basic_m.get("avgIntensity", 0) / 255.0,
                "intensity_std_dev": basic_m.get("intensityStdDev", 0) / 255.0,
                "dynamic_range": max(0.0, min(1.0, (basic_m.get("maxIntensity", 0) - basic_m.get("minIntensity", 0)) / 255.0)),
            },
            "color": {
                "channel_balance": float(max(0.0, min(1.0, color_m.get("channelBalance", 0.5)))),
                "saturation_mean": float(max(0.0, min(1.0, color_m.get("saturationMean", 0.5)))),
                "chroma_energy": float(max(0.0, min(1.0, color_m.get("colorEntropy", 0.5) / 7.0))),
            },
            "geometric": {
                "horizontal_symmetry": float(max(0.0, min(1.0, geo_m.get("horizontalSymmetry", 0.5)))),
                "vertical_symmetry": float(max(0.0, min(1.0, geo_m.get("verticalSymmetry", 0.5)))),
            },
            "nonlinear": {
                "fractal_dimension": float(nonlin_m.get("fractalDimension", 1.5)),
                "hurst_exponent": float(nonlin_m.get("hurstExponent", 0.5)),
            },
            "advanced_symmetry": {
                "body_symmetry": float(max(0.0, min(1.0, sym_m.get("bodySymmetry", 0.5)))),
            },
            "scores": {
                "energy_score": int(energy_calc.calculate(merged)),
                "coherence_score": int(coherence_calc.calculate(merged)),
            },
        })

    OUT.write_text(json.dumps({"outputs": outputs}, indent=2))
    print(f"python metrics written: {OUT}")


if __name__ == "__main__":
    main()
