from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

import time
from sqlalchemy.exc import OperationalError

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@postgres:5432/asistente_db")

def connect_with_retry():
    engine = create_engine(DATABASE_URL)
    retries = 10
    delay = 2
    
    for i in range(retries):
        try:
            # Try to establish a connection to verify DB is reachable
            with engine.connect() as connection:
                print("Database connection successful!")
                return engine
        except OperationalError as e:
            print(f"Database connection failed (Attempt {i+1}/{retries}). Retrying in {delay}s...")
            if i == retries - 1:
                print("Max retries reached. Raising error.")
                raise e
            time.sleep(delay)
            # Cap the delay at 10 seconds to avoid overly long waits
            delay = min(delay * 2, 10)
            
    return engine

engine = connect_with_retry()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
