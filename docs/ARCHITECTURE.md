# Architecture

CricSense is split into three independent services that communicate over HTTP. Each can be developed, tested and deployed separately.

![Architecture diagram](architecture.svg)

---

## 1. Frontend — Next.js

Renders the UI and talks only to the backend, never directly to the AI service.

- **Pages** — landing page, login/register, dashboard (list of past analyses), analyze (upload form), results (per-analysis view)
- **Components** — `MetricCard` (color-coded summary tiles), `MotionCharts` (Recharts line graphs with ideal-range bands), `BenchmarkReport` (table of metric vs. ideal range)
- **Auth state** — JWT stored in `localStorage`, attached to every request via an Axios interceptor in `lib/api.js`
- **Polling** — the results page polls `GET /api/analysis/:id` every 3s while `status === "processing"`, so the user doesn't need to refresh manually

## 2. Backend — Node.js / Express

The backend is the single source of truth for users and analysis records. It never runs computer vision itself — it delegates that to the AI service and stores the result.

- **`routes/auth.js`** — register, login, issue JWT (bcrypt-hashed passwords via the `User` model's `pre('save')` hook)
- **`routes/analysis.js`** — accepts a multipart video upload, creates an `Analysis` document with `status: "processing"`, then asynchronously forwards the file to the AI service. When the AI service responds, the document is updated to `status: "done"` with the summary, frame data and output paths
- **`middleware/auth.js`** — verifies the JWT on every protected route and attaches `req.user`
- **Models** — `User` (name, email, hashed password, role) and `Analysis` (user ref, mode, status, summary, frames, video/csv URLs)

The upload endpoint responds immediately with an `analysisId` rather than waiting for processing to finish — this keeps the HTTP request short and lets the frontend poll for completion instead of holding a long-lived connection open.

## 3. AI service — Python / FastAPI

A stateless microservice with one real job: take a video and a mode (`bat` or `bowl`), return metrics.

- **`main.py`** — single `/analyze` endpoint. Saves the uploaded file to a temp path, dispatches to the matching analyzer, returns JSON with the summary, a frame preview, and paths to the annotated video and CSV
- **`analyzers/__init__.py`** — shared utilities: landmark extraction (`get_lm`), angle math (`calc_angle`), benchmark lookup, and all OpenCV drawing helpers (skeleton, weight bar, info panel, CoM trail)
- **`analyzers/batting.py`** / **`analyzers/bowling.py`** — mode-specific metric functions and the main per-frame processing loop, which:
  1. Reads a frame with OpenCV
  2. Converts BGR → RGB for MediaPipe
  3. Runs `mp_pose.Pose.process()` to get 33 landmarks
  4. Computes the metrics for that frame
  5. Draws the overlay back onto the BGR frame
  6. Writes the frame to the output video
  7. Appends the frame's metrics to an in-memory list

At the end the list becomes a CSV and a summary dict (averages, percentages) that gets returned to the backend.

---

## Why three services instead of one

- **Separation of concerns** — the AI service has heavy, slow-changing dependencies (MediaPipe, OpenCV) that don't belong in a Node process. Keeping it separate means the backend stays light and fast to deploy.
- **Independent scaling** — video processing is CPU-bound and slow; the backend and frontend are not. They can be scaled differently.
- **Language fit** — pose estimation libraries are Python-native. Trying to do this in Node would mean fighting the ecosystem.
- **Easier local development** — each service can be started, restarted and debugged independently without restarting the whole stack.

---

## Data flow for a single analysis request

1. User uploads a video on the **Analyze** page.
2. Frontend sends `POST /api/analysis/upload` (multipart) with a JWT.
3. Backend creates an `Analysis` document (`status: processing`), responds with its ID immediately.
4. Backend asynchronously forwards the video to the AI service's `POST /analyze`.
5. AI service runs MediaPipe pose detection frame by frame, computes metrics, writes an annotated video and CSV, and returns a JSON summary.
6. Backend updates the `Analysis` document (`status: done`, summary, frames, video/csv paths).
7. Frontend, which has been polling `GET /api/analysis/:id`, sees the status change and renders the results dashboard.
