from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_session
from app.core.security import get_current_user, get_current_admin
# تم تعديل الاستيرادات لتتطابق مع models.py الخاص بك
from app.models.models import Gameweek, MatchStat, Player, User, FantasyTeam, FantasyTeamGameweek
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
    clean_sheet: int = 0
    saves: int = 0
    defensive_errors: int = 0
    mvp: bool = False
    nutmegs: int = 0
    own_goals: int = 0
    minutes_played: int = 120
    penalties_scored: int = 0   # ضفنا ده
    penalties_saved: int = 0    # وضفنا ده
    penalties_missed: int = 0


class MatchStatRead(BaseModel):
    id: int
    player_id: int
    goals: int
    assists: int
    clean_sheet: int
    saves: int
    defensive_errors: int
    mvp: bool
    nutmegs: int
    own_goals: int
    minutes_played: int
    points: int
    penalties_scored: int  # ضفنا ده
    penalties_saved: int   # وضفنا ده
    penalties_missed: int  # وضفنا ده

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


@router.put("/{gameweek_id}/activate")
def activate_gameweek(
    gameweek_id: int,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin),
):
    # 1. إيقاف تفعيل كل الجولات السابقة
    active_gws = session.exec(select(Gameweek).where(Gameweek.is_active == True)).all()
    for gw in active_gws:
        gw.is_active = False
        session.add(gw)
        
    # 2. تفعيل الجولة الجديدة
    target_gw = session.get(Gameweek, gameweek_id)
    if not target_gw:
        raise HTTPException(status_code=404, detail="Gameweek not found")
        
    target_gw.is_active = True
    session.add(target_gw)
    
    # 3. الحل السحري (Rollover): نسخ التشكيلات للفرق في الجولة الجديدة
    fantasy_teams = session.exec(select(FantasyTeam)).all()
    for ft in fantasy_teams:
        existing_ftg = session.exec(
            select(FantasyTeamGameweek).where(
                FantasyTeamGameweek.fantasy_team_id == ft.id,
                FantasyTeamGameweek.gameweek_id == gameweek_id
            )
        ).first()
        
        if not existing_ftg:
            # البحث عن أحدث تشكيلة للفريق من الجولات السابقة
            latest_ftg = session.exec(
                select(FantasyTeamGameweek)
                .where(FantasyTeamGameweek.fantasy_team_id == ft.id)
                .order_by(FantasyTeamGameweek.gameweek_id.desc())
            ).first()
            
            if latest_ftg:
                new_ftg = FantasyTeamGameweek(
                    fantasy_team_id=ft.id,
                    gameweek_id=gameweek_id,
                    player1_id=latest_ftg.player1_id,
                    player2_id=latest_ftg.player2_id,
                    player3_id=latest_ftg.player3_id,
                    player4_id=latest_ftg.player4_id,
                    player5_id=latest_ftg.player5_id,
                    captain_id=latest_ftg.captain_id,
                    transfers_made=0,
                    transfer_penalty=0,
                    gameweek_points=0
                )
                session.add(new_ftg)

    session.commit()
    return {"message": "Gameweek activated and teams rolled over"}


@router.post("/{gameweek_id}/calculate-points")
def calculate_gw_points(
    gameweek_id: int,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin),
):
    # إحضار كل إحصائيات اللاعبين في الجولة المعنية
    stats = session.exec(select(MatchStat).where(MatchStat.gameweek_id == gameweek_id)).all()
    # تحويلها لـ Dictionary للوصول السريع لنقاط اللاعب (باستخدام حقل points)
    player_pts = {s.player_id: s.points for s in stats}

    # إحضار كل التشكيلات اللي اتسجلت في الجولة دي
    ftgs = session.exec(select(FantasyTeamGameweek).where(FantasyTeamGameweek.gameweek_id == gameweek_id)).all()
    for ftg in ftgs:
        old_gw_pts = ftg.gameweek_points or 0
        
        pts = 0
        players = [ftg.player1_id, ftg.player2_id, ftg.player3_id, ftg.player4_id, ftg.player5_id]
        
        for pid in players:
            if pid:
                pts += player_pts.get(pid, 0)
                # مضاعفة نقاط الكابتن
                if pid == ftg.captain_id:
                    pts += player_pts.get(pid, 0)
        
        # خصم نقاط التغييرات بالسالب
        final_gw_pts = pts - (ftg.transfer_penalty or 0)
        ftg.gameweek_points = final_gw_pts
        session.add(ftg)

        # إضافة النقاط لمجموع نقاط الفريق الكلية (FantasyTeam)
        ft = session.get(FantasyTeam, ftg.fantasy_team_id)
        if ft:
            ft.total_points = (ft.total_points or 0) - old_gw_pts + final_gw_pts
            session.add(ft)

    # إغلاق الجولة
    gw = session.get(Gameweek, gameweek_id)
    if gw:
        gw.is_active = False
        gw.is_finished = True
        session.add(gw)

    session.commit()
    return {"message": "Points calculated for all users!"}


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
    
    old_points = existing.points if existing else 0

    if existing:
        for key, value in stat_data.model_dump().items():
            setattr(existing, key, value)
        stat = existing
    else:
        stat = MatchStat(gameweek_id=gw_id, **stat_data.model_dump())

    pts = calculate_player_points(stat, player.position)
    stat.points = pts

    session.add(stat)
    
    # تصليح بسيط عشان لو عدلت الإحصائية مايجمعش النقط مرتين للاعب
    player.total_points = (player.total_points - old_points) + pts
    session.add(player)
    
    session.commit()
    session.refresh(stat)

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