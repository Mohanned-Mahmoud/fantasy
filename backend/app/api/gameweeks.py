from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_session
from app.core.security import get_current_user, get_current_admin
from app.models.models import Gameweek, MatchStat, Player, User
from app.services.points_engine import calculate_player_points, get_points_breakdown

router = APIRouter(prefix="/api/gameweeks", tags=["gameweeks"])


class GameweekCreate(BaseModel):
    number: int
    name: str
    deadline: datetime


class GameweekRead(BaseModel):
    id: int
    number: int
    name: str
    deadline: datetime
    is_active: bool
    is_finished: bool

    class Config:
        from_attributes = True


class MatchStatCreate(BaseModel):
    player_id: int
    goals: int = 0
    assists: int = 0
    clean_sheet: bool = False
    saves: int = 0
    yellow_cards: int = 0
    red_card: bool = False
    mvp: bool = False
    nutmegs: int = 0
    own_goals: int = 0
    minutes_played: int = 45


class MatchStatRead(BaseModel):
    id: int
    player_id: int
    goals: int
    assists: int
    clean_sheet: bool
    saves: int
    yellow_cards: int
    red_card: bool
    mvp: bool
    nutmegs: int
    own_goals: int
    minutes_played: int
    points: int

    class Config:
        from_attributes = True


@router.get("/", response_model=List[GameweekRead])
def list_gameweeks(session: Session = Depends(get_session)):
    return session.exec(select(Gameweek).order_by(Gameweek.number)).all()


@router.get("/active", response_model=Optional[GameweekRead])
def active_gameweek(session: Session = Depends(get_session)):
    gw = session.exec(select(Gameweek).where(Gameweek.is_active == True)).first()
    return gw


@router.post("/", response_model=GameweekRead)
def create_gameweek(
    gw_data: GameweekCreate,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin),
):
    gw = Gameweek(**gw_data.model_dump())
    session.add(gw)
    session.commit()
    session.refresh(gw)
    return gw


@router.put("/{gw_id}/activate")
def activate_gameweek(
    gw_id: int,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin),
):
    session.exec(select(Gameweek)).all()
    all_gws = session.exec(select(Gameweek)).all()
    for gw in all_gws:
        gw.is_active = False
        session.add(gw)
    target = session.get(Gameweek, gw_id)
    if not target:
        raise HTTPException(status_code=404, detail="Gameweek not found")
    target.is_active = True
    session.add(target)
    session.commit()
    return {"message": f"Gameweek {target.number} activated"}


@router.get("/{gw_id}/stats", response_model=List[MatchStatRead])
def get_gameweek_stats(
    gw_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    stats = session.exec(select(MatchStat).where(MatchStat.gameweek_id == gw_id)).all()
    return stats


@router.post("/{gw_id}/stats", response_model=MatchStatRead)
def add_match_stat(
    gw_id: int,
    stat_data: MatchStatCreate,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin),
):
    gw = session.get(Gameweek, gw_id)
    if not gw:
        raise HTTPException(status_code=404, detail="Gameweek not found")

    player = session.get(Player, stat_data.player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    existing = session.exec(
        select(MatchStat).where(
            (MatchStat.gameweek_id == gw_id) & (MatchStat.player_id == stat_data.player_id)
        )
    ).first()
    if existing:
        for key, value in stat_data.model_dump().items():
            setattr(existing, key, value)
        stat = existing
    else:
        stat = MatchStat(gameweek_id=gw_id, **stat_data.model_dump())

    pts = calculate_player_points(stat, player.position)
    stat.points = pts

    session.add(stat)
    session.commit()
    session.refresh(stat)

    player.total_points += pts
    session.add(player)
    session.commit()

    return stat


@router.get("/{gw_id}/stats/{player_id}/breakdown")
def get_points_breakdown_route(
    gw_id: int,
    player_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    stat = session.exec(
        select(MatchStat).where(
            (MatchStat.gameweek_id == gw_id) & (MatchStat.player_id == player_id)
        )
    ).first()
    if not stat:
        raise HTTPException(status_code=404, detail="Stat not found")
    player = session.get(Player, player_id)
    return get_points_breakdown(stat, player.position)
