from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
import os
import time
from rag_service import rag_service
from tts_service import tts_service

app = FastAPI()

# Configure CORS
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    subject: str | None = None

class TTSRequest(BaseModel):
    text: str

class ChatResponse(BaseModel):
    response: str
    sentiment: str = "neutral"

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Asistente Pedagogico API is running"}

@app.on_event("startup")
async def startup_event():
    # Ingest PDFs on startup
    data_dir = os.path.join(os.path.dirname(__file__), "data")
    rag_service.ingest_pdfs(data_dir)

from fastapi.responses import StreamingResponse

# ... (existing code)

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    # Simulate processing delay related to AI
    # time.sleep(1) # Removed artificial delay as RAG takes time
    
    user_msg = request.message
    subject = request.subject
    
    # Use RAG Service to get answer
    response_text = rag_service.get_answer(user_msg)

    return ChatResponse(response=response_text)

@app.post("/api/chat/stream")
async def chat_stream_endpoint(request: ChatRequest):
    user_msg = request.message
    
    return StreamingResponse(
        rag_service.stream_answer(user_msg), 
        media_type="text/plain"
    )

@app.post("/api/tts")
def tts_endpoint(request: TTSRequest):
    audio_buffer = tts_service.generate_audio(request.text)
    if not audio_buffer:
        raise HTTPException(status_code=500, detail="TTS Generation failed")
    
    return StreamingResponse(audio_buffer, media_type="audio/mpeg")

    return StreamingResponse(audio_buffer, media_type="audio/mpeg")

# Serve React App (Static Files)
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Mount the 'assets' folder from the build
# We assume the 'dist' folder is mounted at /app/dist inside the container
static_dir = "/app/dist"

if os.path.exists(static_dir):
    # Mount assets (JS, CSS, Images)
    app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="assets")

    # Catch-all route for React Routing (SPA)
    # This must be the LAST route defined
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        # Allow API requests to pass through (if they weren't caught above)
        if full_path.startswith("api"):
             raise HTTPException(status_code=404, detail="API endpoint not found")
        
        # Determine file path
        file_path = os.path.join(static_dir, full_path)
        
        # If file exists (e.g. favicon.ico), serve it. Otherwise serve index.html
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        
        return FileResponse(os.path.join(static_dir, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
