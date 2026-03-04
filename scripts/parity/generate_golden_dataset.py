#!/usr/bin/env python3
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "scripts" / "parity" / "artifacts" / "golden_frames.json"
OUT.parent.mkdir(parents=True, exist_ok=True)


def make_frame(seed: int, width: int = 96, height: int = 72):
    total = width * height
    pixels = [((i * (seed * 7 + 11) + seed * 13) % 255) for i in range(total)]
    return {
        "id": f"frame-{seed:03d}",
        "width": width,
        "height": height,
        "format": "Gray8",
        "bytes": pixels,
    }


def main():
    frames = [make_frame(i) for i in range(1, 21)]
    payload = {
        "version": 1,
        "source": "synthetic-deterministic",
        "frames": frames,
    }
    OUT.write_text(json.dumps(payload, indent=2))
    print(f"golden dataset written: {OUT}")
    print(f"frames: {len(frames)}")


if __name__ == "__main__":
    main()
