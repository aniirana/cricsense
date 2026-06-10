#!/bin/bash
export PATH="/opt/homebrew/bin:$PATH"
# CricSense — Start all services
# Usage: bash start.sh

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "🏏 Starting CricSense..."
echo ""

# 1. AI service
echo "▶  Starting AI service (port 8000)..."
cd "$ROOT/ai"
conda run -n cricsense uvicorn main:app --host 0.0.0.0 --port 8000 &
AI_PID=$!

sleep 2

# 2. Backend
echo "▶  Starting Backend (port 4000)..."
cd "$ROOT/backend"
npm run dev &
BACK_PID=$!

sleep 2

# 3. Frontend
echo "▶  Starting Frontend (port 3000)..."
cd "$ROOT/frontend"
npm run dev &
FRONT_PID=$!

echo ""
echo "✅ All services started!"
echo "   Frontend  →  http://localhost:3000"
echo "   Backend   →  http://localhost:4000"
echo "   AI API    →  http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop all."

trap "kill $AI_PID $BACK_PID $FRONT_PID 2>/dev/null; echo 'Stopped.'" EXIT
wait
