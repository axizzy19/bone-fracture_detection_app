#!/bin/bash
cd /app/backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
cd /app/frontend/build
python3 -m http.server 3000
