from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
print("DATABASE_URL seen by app:", os.getenv("DATABASE_URL"))

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
