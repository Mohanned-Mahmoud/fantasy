import random
import string
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.models import User, FantasyTeam, MiniLeague, MiniLeagueMember

router = APIRouter(prefix="/api/minileagues", tags=["minileagues"])


def generate_join_code(length: int = 8) -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


class MiniLeagueCreate(BaseModel):
    name: str


class MiniLeagueRead(BaseModel):
    id: int
    name: str
    join_code: str
    created_by: int

    class Config:
        from_attributes = True


class MiniLeagueMemberEntry(BaseModel):
    rank: int
    manager_name: str
    team_name: str
    total_points: int


@router.post("/", response_model=MiniLeagueRead)
def create_league(
    data: MiniLeagueCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    code = generate_join_code()
    while session.exec(select(MiniLeague).where(MiniLeague.join_code == code)).first():
        code = generate_join_code()

    league = MiniLeague(name=data.name, join_code=code, created_by=current_user.id)
    session.add(league)
    session.commit()
    session.refresh(league)

    member = MiniLeagueMember(league_id=league.id, user_id=current_user.id)
    session.add(member)
    session.commit()

    return league


@router.post("/join")
def join_league(
    join_code: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    league = session.exec(
        select(MiniLeague).where(MiniLeague.join_code == join_code)
    ).first()
    if not league:
        raise HTTPException(status_code=404, detail="League not found with that code")

    existing = session.exec(
        select(MiniLeagueMember).where(
            (MiniLeagueMember.league_id == league.id)
            & (MiniLeagueMember.user_id == current_user.id)
        )
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already a member of this league")

    member = MiniLeagueMember(league_id=league.id, user_id=current_user.id)
    session.add(member)
    session.commit()
    return {"message": f"Joined league: {league.name}"}


@router.get("/my", response_model=List[MiniLeagueRead])
def my_leagues(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    memberships = session.exec(
        select(MiniLeagueMember).where(MiniLeagueMember.user_id == current_user.id)
    ).all()
    leagues = [session.get(MiniLeague, m.league_id) for m in memberships]
    return [l for l in leagues if l is not None]


@router.get("/{league_id}/standings", response_model=List[MiniLeagueMemberEntry])
def league_standings(
    league_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    memberships = session.exec(
        select(MiniLeagueMember).where(MiniLeagueMember.league_id == league_id)
    ).all()

    entries = []
    for m in memberships:
        user = session.get(User, m.user_id)
        team = session.exec(
            select(FantasyTeam).where(FantasyTeam.manager_id == m.user_id)
        ).first()
        if user and team:
            entries.append({
                "manager_name": user.username,
                "team_name": team.name,
                "total_points": team.total_points,
            })

    entries.sort(key=lambda x: x["total_points"], reverse=True)
    return [
        MiniLeagueMemberEntry(rank=i + 1, **e) for i, e in enumerate(entries)
    ]
