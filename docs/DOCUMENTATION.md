# Documentation — How CricSense Works

This document explains the computer vision pipeline, the formulas behind every metric, and the benchmark system.

---

## 1. Pose Detection Pipeline

Every uploaded video is processed frame by frame:

| Step | What happens |
|---|---|
| 1. Read frame | OpenCV (`cv2.VideoCapture`) reads the next frame as a BGR array |
| 2. Convert to RGB | MediaPipe expects RGB, not BGR — `cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)` |
| 3. Pose detection | `mp_pose.Pose().process()` returns 33 landmarks, each with `x`, `y` (normalized 0–1) and a `visibility` confidence score |
| 4. Compute metrics | Normalized coordinates are converted to pixels (`x_px = x * frame_width`), then passed through the angle/offset formulas below |
| 5. Draw overlays | Skeleton lines, the weight-transfer bar and the metric panel are drawn back onto the original BGR frame |
| 6. Write frame | The annotated frame is written to the output video via `cv2.VideoWriter` |
| 7. Store row | The frame's metric values are appended to a list — this becomes the CSV at the end |

A landmark is only used if `visibility > 0.4`, which filters out occluded or off-screen body parts before they produce noisy angle readings.

---

## 2. Angle Calculation

All joint angles (knee bend, arm angle, hip rotation) use the same vector dot-product formula, computed at the joint:

```python
v1 = [hip_x - knee_x,   hip_y - knee_y]    # vector: knee → hip
v2 = [ankle_x - knee_x, ankle_y - knee_y]  # vector: knee → ankle
angle = degrees(arccos(dot(v1, v2) / (|v1| * |v2|)))
```

A fully straight joint reads close to **180°**. A sharply bent joint reads **90°–120°**.

---

## 3. Batting Metrics

| Metric | Formula | Ideal range |
|---|---|---|
| **Weight transfer** | `offset = hip_mid_x - ankle_mid_x`. `offset > +25px` → RIGHT LEG, `< -25px` → LEFT LEG, else BALANCED | -40px to +40px |
| **Knee bend (R/L)** | Angle at the knee using hip–knee–ankle landmarks | 120°–160° |
| **Hip rotation** | `arctan2(\|Δy_hips\|, \|Δx_hips\|)` — angle of the hip line from horizontal | 10°–35° |
| **Center of mass** | Weighted average of shoulders (×1.0), hips (×1.5), knees (×0.8), using each landmark's visibility as an additional weight | — (tracked as a trail, no fixed range) |

---

## 4. Bowling Metrics

| Metric | Formula | Ideal range |
|---|---|---|
| **Bowling arm angle** | Angle at the elbow using shoulder–elbow–wrist landmarks | 140°–180° |
| **Hip-shoulder separation** | `\|hip_angle - shoulder_angle\|`, where each is the arctan2 angle of that body line from horizontal | 15°–45° |
| **Front knee (bracing leg)** | Angle at the front knee using hip–knee–ankle landmarks | 150°–180° |
| **Weight transfer** | Same formula as batting, applied through the run-up and delivery stride | -40px to +40px |
| **Trunk lean** | `arctan2(\|Δx (nose vs hip midpoint)\|, \|Δy\|)`. Classified FORWARD if `Δx > 15px`, BACK if `Δx < -15px`, else UPRIGHT | 10°–40° forward |

Hip-shoulder separation is considered the single most important pace-bowling metric: a larger angle means the hips have rotated ahead of the shoulders, storing rotational energy that's released through the delivery.

---

## 5. Benchmark System

Every numeric metric is scored against a three-tier status:

- 🟢 **Ideal** — within the ideal range
- 🟡 **Acceptable** — outside ideal but within a tolerance buffer (typically ±15–25% of the range width)
- 🔴 **Alert** — outside both the ideal range and the buffer

```python
def bench_status(value, ideal_min, ideal_max, buffer):
    if ideal_min <= value <= ideal_max:
        return "ok"
    if (ideal_min - buffer) <= value <= (ideal_max + buffer):
        return "warn"
    return "bad"
```

This status drives:
- The color of each metric's text on the annotated video frame
- The badge on each summary card in the dashboard (`✓ ideal` / `⚠ check` / `✗ alert`)
- The row color in the Benchmark Report table
- The shaded ideal-range band on every motion graph

---

## 6. Output Artifacts

Each analysis produces:

1. **Annotated video** (`.mp4`) — original footage with skeleton overlay, weight-transfer bar and live metric panel burned in
2. **CSV** — one row per frame with every computed metric, for import into Excel/Pandas/R
3. **Summary JSON** — per-analysis averages and percentages, stored on the `Analysis` document and used to render the dashboard

---

## 7. Recording Guidelines

For reliable landmark detection:

- **Camera angle** — side-on, perpendicular to the batter/bowler
- **Camera height** — roughly level with the subject's hips
- **Resolution** — 720p or higher
- **Frame rate** — 30fps minimum; 60fps+ preferred for batting, where the shot happens fast
- **Lighting** — even, avoid strong backlighting that silhouettes the subject
