from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from app.core.database import create_db_and_tables
from app.api import auth, players, gameweeks, teams, leaderboard, minileagues

app = FastAPI(
    title="Fantasy 5-a-side API",
    description="Backend API for Fantasy 5-a-side Football",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(players.router)
app.include_router(gameweeks.router)
app.include_router(teams.router)
app.include_router(leaderboard.router)
app.include_router(minileagues.router)


@app.on_event("startup")
def startup():
    create_db_and_tables()


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "Fantasy 5-a-side API"}
@app.get("/")
def read_root():
    return {"status": "ok", "message": "Backend is running!"}
