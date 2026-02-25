from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from pydantic import BaseModel

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.models import User, FantasyTeam

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])


class LeaderboardEntry(BaseModel):
    rank: int
    manager_name: str
    team_name: str
    total_points: int

    class Config:
        from_attributes = True


@router.get("/global", response_model=List[LeaderboardEntry])
def global_leaderboard(
    limit: int = 50,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    teams = session.exec(
        select(FantasyTeam).order_by(FantasyTeam.total_points.desc()).limit(limit)
    ).all()

    result = []
    for rank, team in enumerate(teams, start=1):
        manager = session.get(User, team.manager_id)
        result.append(
            LeaderboardEntry(
                rank=rank,
                manager_name=manager.username if manager else "Unknown",
                team_name=team.name,
                total_points=team.total_points,
            )
        )
    return result
