import os
from sqlmodel import SQLModel, create_engine, Session
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is missing from .env file!")

# التعديل السحري هنا
engine = create_engine(
    DATABASE_URL,
    # 1. بنجبره يستخدم SSL عشان Neon بيشترط ده للاتصال السحابي
    connect_args={"sslmode": "require"}, 
    # 2. بيتأكد إن الاتصال "صاحي" قبل ما يبعت أي Query (بيحل مشكلة الـ closed unexpectedly)
    pool_pre_ping=True, 
    # 3. بيجدد الاتصال كل 5 دقائق عشان Vercel ما يقطعوش
    pool_recycle=300 
)

def get_session():
    with Session(engine) as session:
        yield session

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)    