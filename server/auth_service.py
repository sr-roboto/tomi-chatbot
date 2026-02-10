import os
import time
from typing import Dict, Optional
from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
from models import User
from pydantic import BaseModel

# Configuration
SECRET_KEY = "tu_clave_secreta_super_segura" # En produccion usar .env
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 1 week

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

class Token(BaseModel):
    access_token: str
    token_type: str

class AuthService:
    def verify_password(self, plain_password, hashed_password):
        return pwd_context.verify(plain_password, hashed_password)

    def get_password_hash(self, password):
        return pwd_context.hash(password)

    def get_user(self, db: Session, username_or_email: str):
        # Check by username
        user = db.query(User).filter(User.username == username_or_email).first()
        if user:
            return user
        # Check by email
        user = db.query(User).filter(User.email == username_or_email).first()
        return user

    def create_user(self, db: Session, username: str, email: str, password: str):
        hashed_pw = self.get_password_hash(password)
        new_user = User(
            username=username,
            email=email,
            password_hash=hashed_pw
        )
        try:
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            return new_user
        except Exception as e:
            db.rollback()
            print(f"Error creating user: {e}")
            return None

    def create_access_token(self, data: dict):
        to_encode = data.copy()
        expire = time.time() + (ACCESS_TOKEN_EXPIRE_MINUTES * 60)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

auth_service = AuthService()

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = auth_service.get_user(db, username)
    if user is None:
        raise credentials_exception
    return user
