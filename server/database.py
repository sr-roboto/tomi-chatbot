from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

import time
from sqlalchemy.exc import OperationalError

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@postgres:5432/asistente_db")

def connect_with_retry():
    retries = 5
    delay = 2
    for i in range(retries):
        try:
            return create_engine(DATABASE_URL)
        except OperationalError as e:
            if i == retries - 1:
                raise e
            print(f"Database connection failed, retrying in {delay}s...")
            time.sleep(delay)
            delay *= 2

engine = connect_with_retry()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
