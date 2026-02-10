from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
import os
import time
from sqlalchemy.orm import Session
from database import engine, get_db, Base
import models
from rag_service import rag_service
from tts_service import tts_service
from community_service import community_service

# Create Tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# Configure CORS
# origins = [
#     "http://localhost:5173",
#     "http://localhost:3000",
#     "https://asistente-pedagogico.netlify.app",
#     "https://window-identifies-insured-richardson.trycloudflare.com",
# ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    return {"status": "ok", "message": "Asistente Pedagogico API is running with PostgreSQL"}

@app.on_event("startup")
async def startup_event():
    # Ingest PDFs on startup
    data_dir = os.path.join(os.path.dirname(__file__), "data")
    rag_service.ingest_pdfs(data_dir)

from fastapi.responses import StreamingResponse

# ... (existing code)

from auth_service import get_current_user, User

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest, current_user: User = Depends(get_current_user)):
    # Simulate processing delay related to AI
    # time.sleep(1) # Removed artificial delay as RAG takes time
    
    user_msg = request.message
    subject = request.subject
    
    # Use RAG Service to get answer
    response_text = rag_service.get_answer(user_msg)

    return ChatResponse(response=response_text)

@app.post("/api/chat/stream")
async def chat_stream_endpoint(request: ChatRequest, current_user: User = Depends(get_current_user)):
    user_msg = request.message
    
    return StreamingResponse(
        rag_service.stream_answer(user_msg), 
        media_type="text/plain"
    )

from auth_service import auth_service, get_current_user, Token
from models import User
from fastapi.security import OAuth2PasswordRequestForm
from fastapi import Depends, status

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

@app.post("/api/auth/register", response_model=Token)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    # Check if username exists
    if auth_service.get_user(db, user.username):
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    # Check if email exists
    if auth_service.get_user(db, user.email):
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    new_user = auth_service.create_user(db, user.username, user.email, user.password)
    if not new_user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )
    access_token = auth_service.create_access_token(data={"sub": new_user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # form_data.username can be username OR email
    user = auth_service.get_user(db, form_data.username)
    if not user or not auth_service.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth_service.create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

class PostCreate(BaseModel):
    content: str

@app.get("/api/community/posts")
def get_posts(db: Session = Depends(get_db)):
    return community_service.get_posts(db)

@app.post("/api/community/posts")
def create_post(post: PostCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Use the authenticated user's ID
    return community_service.create_post(db, current_user.id, post.content)

@app.post("/api/community/posts/{post_id}/like")
def like_post(post_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    updated_post = community_service.like_post(db, post_id)
    if not updated_post:
        raise HTTPException(status_code=404, detail="Post not found")
    return updated_post

@app.post("/api/tts")
def tts_endpoint(request: TTSRequest):
    audio_buffer = tts_service.generate_audio(request.text)
    if not audio_buffer:
        raise HTTPException(status_code=500, detail="TTS Generation failed")
    
    return StreamingResponse(audio_buffer, media_type="audio/mpeg")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
