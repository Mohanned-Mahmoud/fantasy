import os
from sqlmodel import SQLModel, create_engine, Session
from dotenv import load_dotenv

# السطر ده هو اللي بيدور على ملف .env ويقرا اللي جواه
load_dotenv()

# هنا بيسحب اللينك من الـ env، ولو ملقاهوش هيضرب إيرور عشان ينبهك
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is missing from .env file!")

engine = create_engine(DATABASE_URL)

def get_session():
    with Session(engine) as session:
        yield session

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)