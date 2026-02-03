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

    return StreamingResponse(audio_buffer, media_type="audio/mpeg")

# @app.get("/")
# def read_root():
#     return {"status": "ok", "message": "Asistente Pedagogico API is running"}

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
