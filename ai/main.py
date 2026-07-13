from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import tempfile
import os
import shutil
import traceback   # ✅ ADDED

from analyzers.batting import analyze_batting
from analyzers.bowling import analyze_bowling

app = FastAPI(title="CricSense AI API", version="1.0.0")

# -------------------------
# ROOT ROUTE
# -------------------------
@app.get("/")
def root():
    return {"status": "CricSense AI running"}

# -------------------------
# CORS CONFIG
# -------------------------

CLIENT_URL = os.getenv("CLIENT_URL")

allow_origins = ["http://localhost:3000"]

if CLIENT_URL:
    allow_origins.append(CLIENT_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------
# ROUTES
# -------------------------

@app.get("/health")
def health():
    return {"status": "ok", "service": "CricSense AI"}


@app.post("/api/analyze")
async def analyze(video: UploadFile = File(...), mode: str = Form(...)):
    try:
        print("🔥 REQUEST RECEIVED")
        print("filename:", video.filename)
        print("mode:", mode)

        if mode not in ("bat", "bowl"):
            raise HTTPException(status_code=400, detail="mode must be 'bat' or 'bowl'")

        suffix = os.path.splitext(video.filename)[1] or ".mp4"

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(video.file, tmp)
            inp = tmp.name

        outp = inp.replace(suffix, "_analyzed.mp4")
        csv_path = inp.replace(suffix, "_data.csv")

        print("📁 FILE SAVED:", inp)

        # -------------------------
        # AI PROCESSING (LIKELY CRASH POINT)
        # -------------------------
        if mode == "bat":
            result = analyze_batting(inp, outp, csv_path)
        else:
            result = analyze_bowling(inp, outp, csv_path)

        print("✅ ANALYSIS DONE")

        return {
            "mode": mode,
            "summary": result.get("summary", ""),
            "alerts": result.get("alerts", []),
            "suggestions": result.get("suggestions", []),
            "metrics": result.get("rows", []),
            "frames": len(result.get("rows", [])),
            "video_path": outp,
            "csv_path": csv_path,
        }

    except Exception as e:
        print("❌ ERROR OCCURRED")
        print(traceback.format_exc())   # 🔥 SHOW REAL ERROR IN LOGS

        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if "inp" in locals() and os.path.exists(inp):
            os.remove(inp)


@app.get("/download/video")
def download_video(path: str):
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Not found")

    return FileResponse(
        path,
        media_type="video/mp4",
        filename="analyzed.mp4",
    )


@app.get("/download/csv")
def download_csv(path: str):
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Not found")

    return FileResponse(
        path,
        media_type="text/csv",
        filename="data.csv",
    )