from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func
from typing import List
from app.core.database import get_session
from app.models.models import SystemSettings, Player, FantasyTeamGameweek, Gameweek, MatchStat, User

router = APIRouter(prefix="/stats", tags=["Stats"])

# 1. جلب وتحديث الإعدادات
@router.get("/settings")
def get_settings(session: Session = Depends(get_session)):
    settings = session.get(SystemSettings, 1)
    if not settings:
        settings = SystemSettings(id=1, show_dashboard_stats=False)
        session.add(settings)
        session.commit()
        session.refresh(settings)
    return settings

@router.put("/settings")
def update_settings(show_stats: bool, session: Session = Depends(get_session)):
    settings = session.get(SystemSettings, 1)
    if not settings:
        settings = SystemSettings(id=1, show_dashboard_stats=show_stats)
        session.add(settings)
    else:
        settings.show_dashboard_stats = show_stats
    session.commit()
    return {"status": "success"}

# 2. جلب إحصائيات الداش بورد
@router.get("/dashboard-highlights")
def get_dashboard_highlights(session: Session = Depends(get_session)):
    settings = session.get(SystemSettings, 1)
    if not settings or not settings.show_dashboard_stats:
        return {"show": False, "top_owned": [], "top_scorers": []}

    # جلب الجولة الحالية أو آخر جولة
    active_gw = session.exec(select(Gameweek).where(Gameweek.is_active == True)).first()
    last_finished_gw = session.exec(select(Gameweek).where(Gameweek.is_finished == True).order_by(Gameweek.number.desc())).first()
    
    gw_for_ownership = active_gw or last_finished_gw
    
    top_owned = []
    if gw_for_ownership:
        # حساب نسبة الامتلاك (بشكل مبسط عن طريق عد تكرار اللاعب في التشكيلات)
        teams_in_gw = session.exec(select(FantasyTeamGameweek).where(FantasyTeamGameweek.gameweek_id == gw_for_ownership.id)).all()
        player_counts = {}
        for team in teams_in_gw:
            players = [team.player1_id, team.player2_id, team.player3_id, team.player4_id, team.player5_id]
            for pid in players:
                if pid:
                    player_counts[pid] = player_counts.get(pid, 0) + 1
        
        # ترتيب وتجهيز التوب 3
        sorted_owned = sorted(player_counts.items(), key=lambda x: x[1], reverse=True)[:3]
        total_teams = max(len(teams_in_gw), 1)
        for pid, count in sorted_owned:
            player = session.get(Player, pid)
            if player:
                top_owned.append({
                    "player": player,
                    "ownership_percent": round((count / total_teams) * 100)
                })

    top_scorers = []
    if last_finished_gw:
        # أكثر لاعبين جابوا نقط الجولة اللي فاتت
        stats = session.exec(
            select(MatchStat)
            .where(MatchStat.gameweek_id == last_finished_gw.id)
            .order_by(MatchStat.points.desc())
            .limit(3)
        ).all()
        
        for stat in stats:
            player = session.get(Player, stat.player_id)
            if player:
                top_scorers.append({
                    "player": player,
                    "points": stat.points
                })

    return {
        "show": True,
        "top_owned": top_owned,
        "top_scorers": top_scorers,
        "last_gw_name": last_finished_gw.name if last_finished_gw else ""
    }