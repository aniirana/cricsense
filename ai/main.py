from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import tempfile
import os
import shutil

import mediapipe as mp

print("=" * 50)
print("MediaPipe module:", mp)
print("MediaPipe file:", getattr(mp, "__file__", None))
print("MediaPipe version:", getattr(mp, "__version__", None))
print("Has solutions:", hasattr(mp, "solutions"))
print("=" * 50)

from analyzers.batting import analyze_batting
from analyzers.bowling import analyze_bowling

app = FastAPI(title="CricSense AI API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        os.getenv("CLIENT_URL", "http://localhost:3000")
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok", "service": "CricSense AI"}

@app.post("/analyze")
async def analyze(video: UploadFile = File(...), mode: str = Form(...)):
    if mode not in ("bat", "bowl"):
        raise HTTPException(400, "mode must be 'bat' or 'bowl'")

    suffix = os.path.splitext(video.filename)[1] or ".mp4"

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(video.file, tmp)
        inp = tmp.name

    outp = inp.replace(suffix, "_analyzed.mp4")
    csv_path = inp.replace(suffix, "_data.csv")

    try:
        if mode == "bat":
            result = analyze_batting(inp, outp, csv_path)
        else:
            result = analyze_bowling(inp, outp, csv_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(inp):
            os.unlink(inp)

    return {
        "mode": mode,
        "summary": result["summary"],
        "alerts": result["alerts"],
        "suggestions": result["suggestions"],
        "metrics": result["rows"],
        "frames": len(result["rows"]),
        "video_path": outp,
        "csv_path": csv_path,
    }


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