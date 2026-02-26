from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from datetime import datetime # التعديل: استيراد مكتبة الوقت

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.models import (
    User, FantasyTeam, FantasyTeamGameweek, Gameweek, Player, MatchStat,SystemSettings
)
from app.services.points_engine import calculate_gameweek_team_points

router = APIRouter(prefix="/api/teams", tags=["teams"])


class SquadSelection(BaseModel):
    player_ids: List[int]
    captain_id: int
    gameweek_id: int


class TeamRead(BaseModel):
    id: int
    name: str
    budget_remaining: float
    total_points: int
    free_transfers: int

    class Config:
        from_attributes = True


class TeamGameweekRead(BaseModel):
    id: int
    gameweek_id: int
    player1_id: Optional[int]
    player2_id: Optional[int]
    player3_id: Optional[int]
    player4_id: Optional[int]
    player5_id: Optional[int]
    captain_id: Optional[int]
    transfers_made: int
    transfer_penalty: int
    gameweek_points: int

    class Config:
        from_attributes = True


@router.get("/my", response_model=TeamRead)
def my_team(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    team = session.exec(
        select(FantasyTeam).where(FantasyTeam.manager_id == current_user.id)
    ).first()
    if not team:
        raise HTTPException(status_code=404, detail="Fantasy team not found")
    return team


@router.get("/my/gameweek/{gw_id}", response_model=Optional[TeamGameweekRead])
def my_team_gameweek(
    gw_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    team = session.exec(
        select(FantasyTeam).where(FantasyTeam.manager_id == current_user.id)
    ).first()
    if not team:
        raise HTTPException(status_code=404, detail="Fantasy team not found")

    tgw = session.exec(
        select(FantasyTeamGameweek).where(
            (FantasyTeamGameweek.fantasy_team_id == team.id)
            & (FantasyTeamGameweek.gameweek_id == gw_id)
        )
    ).first()
    return tgw


@router.post("/my/select")
def select_squad(
    selection: SquadSelection,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    # ========== فحص قفل التغييرات من الأدمن ==========
    settings = session.get(SystemSettings, 1)
    if settings and not settings.allow_transfers:
        raise HTTPException(
            status_code=403,
            detail="Transfers and team modifications are currently LOCKED by the admin."
        )
    # =================================================
    if len(selection.player_ids) != 5:
        raise HTTPException(status_code=400, detail="Must select exactly 5 players")

    if selection.captain_id not in selection.player_ids:
        raise HTTPException(status_code=400, detail="Captain must be in your squad")

    players = [session.get(Player, pid) for pid in selection.player_ids]
    if any(p is None for p in players):
        raise HTTPException(status_code=404, detail="One or more players not found")

    positions = [p.position for p in players]
    gk_count = positions.count("GK")
    def_count = positions.count("DEF")
    mid_count = positions.count("MID")
    att_count = positions.count("ATT")

    # ========== الشروط الجديدة للمراكز ==========
    if gk_count != 1:
        raise HTTPException(status_code=400, detail="Squad must have exactly 1 GK")
    if not (1 <= def_count <= 3):
        raise HTTPException(status_code=400, detail="You need 1 to 3 Defenders (DEF)")
    if not (1 <= mid_count <= 3):
        raise HTTPException(status_code=400, detail="You need 1 to 3 Midfielders (MID)")
    if not (1 <= att_count <= 3):
        raise HTTPException(status_code=400, detail="You need 1 to 3 Attackers (ATT)")
    # ============================================

    total_cost = sum(p.price for p in players)
    team = session.exec(
        select(FantasyTeam).where(FantasyTeam.manager_id == current_user.id)
    ).first()

    if not team:
        raise HTTPException(status_code=404, detail="Fantasy team not found")

    if total_cost > 50.0:
        raise HTTPException(
            status_code=400,
            detail=f"Total cost {total_cost:.1f}M exceeds budget of 50M"
        )

    gw = session.get(Gameweek, selection.gameweek_id)
    if not gw:
        raise HTTPException(status_code=404, detail="Gameweek not found")

    # ========== التعديل الجديد: منع التعديل بعد الديدلاين ==========
    if datetime.utcnow() > gw.deadline:
        raise HTTPException(
            status_code=403, 
            detail="The deadline has passed! You cannot make changes to your squad for this Gameweek."
        )
    # ===============================================================

    existing_tgw = session.exec(
        select(FantasyTeamGameweek).where(
            (FantasyTeamGameweek.fantasy_team_id == team.id)
            & (FantasyTeamGameweek.gameweek_id == selection.gameweek_id)
        )
    ).first()

    transfers_made = 0
    transfer_penalty = 0

    if existing_tgw:
        old_ids = {
            existing_tgw.player1_id,
            existing_tgw.player2_id,
            existing_tgw.player3_id,
            existing_tgw.player4_id,
            existing_tgw.player5_id,
        }
        new_ids = set(selection.player_ids)
        transfers_made = len(new_ids - old_ids)
        free_used = min(transfers_made, team.free_transfers)
        extra = max(0, transfers_made - free_used)
        transfer_penalty = extra * 4
        tgw = existing_tgw
    else:
        tgw = FantasyTeamGameweek(
            fantasy_team_id=team.id,
            gameweek_id=selection.gameweek_id,
        )

    tgw.player1_id = selection.player_ids[0]
    tgw.player2_id = selection.player_ids[1]
    tgw.player3_id = selection.player_ids[2]
    tgw.player4_id = selection.player_ids[3]
    tgw.player5_id = selection.player_ids[4]
    tgw.captain_id = selection.captain_id
    tgw.transfers_made = transfers_made
    tgw.transfer_penalty = transfer_penalty

    team.budget_remaining = 50.0 - total_cost
    if transfers_made > 0:
        team.free_transfers = max(0, team.free_transfers - transfers_made)

    session.add(tgw)
    session.add(team)
    session.commit()
    session.refresh(tgw)

    return {
        "message": "Squad saved successfully",
        "transfers_made": transfers_made,
        "transfer_penalty": transfer_penalty,
        "budget_remaining": team.budget_remaining,
    }


@router.get("/my/history", response_model=List[TeamGameweekRead])
def team_history(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    team = session.exec(
        select(FantasyTeam).where(FantasyTeam.manager_id == current_user.id)
    ).first()
    if not team:
        return []

    return session.exec(
        select(FantasyTeamGameweek).where(FantasyTeamGameweek.fantasy_team_id == team.id)
    ).all()