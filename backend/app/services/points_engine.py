"""
Fantasy 5-a-side Points Engine
Calculates fantasy points based on real match events.
"""
from app.models.models import MatchStat, Player


POINTS_CONFIG = {
    "GK": {
        "goal": 5,            
        "assist": 3,
        "clean_sheet": 3,     
        "save_per_2": 1,      # نقطة لكل تصديين (زي الفرونت)
        "defensive_error": -1,
        "own_goal": -2,
        "played": 0,          # لغينا نقطة الحضور عشان تتطابق مع الفرونت
        "mvp": 3,
        "nutmeg": 1,          
        "penalty_scored": 3,
        "penalty_saved": 5,
        "penalty_miss": -2,
    },
    "DEF": {
        "goal": 5,            
        "assist": 3,
        "clean_sheet": 3,
        "save_per_2": 0,
        "defensive_error": -1,
        "own_goal": -2,
        "played": 0,
        "mvp": 3,
        "nutmeg": 1,          
        "penalty_scored": 3,
        "penalty_saved": 5,   
        "penalty_miss": -2,
    },
    "MID": {
        "goal": 4,            
        "assist": 3,
        "clean_sheet": 1,     
        "save_per_2": 0,
        "defensive_error": -1,
        "own_goal": -2,
        "played": 0,
        "mvp": 3,
        "nutmeg": 1,
        "penalty_scored": 3,
        "penalty_saved": 5,
        "penalty_miss": -2,
    },
    "ATT": {
        "goal": 3,            
        "assist": 3,
        "clean_sheet": 0,     
        "save_per_2": 0,
        "defensive_error": -1,
        "own_goal": -2,
        "played": 0,
        "mvp": 3,
        "nutmeg": 1,
        "penalty_scored": 3,
        "penalty_saved": 5,
        "penalty_miss": -2,
    },
}


def calculate_player_points(stat: MatchStat, position: str) -> int:
    """
    Calculate fantasy points for a player based on their match stats.
    """
    pos = position.upper() if position else "ATT"
    config = POINTS_CONFIG.get(pos, POINTS_CONFIG["ATT"])
    points = 0

    if (stat.minutes_played or 0) > 0:
        points += config["played"]

    points += (stat.goals or 0) * config["goal"]
    points += getattr(stat, "penalties_scored", 0) * config["penalty_scored"]
    points += (stat.assists or 0) * config["assist"]

    if (stat.clean_sheet or 0) > 0:
        points += stat.clean_sheet * config["clean_sheet"]

    save_points = ((stat.saves or 0) // 2) * config["save_per_2"]
    points += save_points
    
    points += getattr(stat, "penalties_saved", 0) * config["penalty_saved"]

    points += (stat.defensive_errors or 0) * config["defensive_error"]
    points += (stat.own_goals or 0) * config["own_goal"]
    points += getattr(stat, "penalties_missed", 0) * config["penalty_miss"]

    if stat.mvp:
        points += config["mvp"]
        
    points += (stat.nutmegs or 0) * config["nutmeg"]

    return points


def calculate_gameweek_team_points(
    player_stats: list[dict],
    captain_id: int,
    transfer_penalty: int = 0,
) -> int:
    """
    Calculate total fantasy points for a team in a gameweek.
    Doubles captain points. Applies transfer penalty.

    player_stats: list of dicts with keys: player_id, position, stat (MatchStat)
    """
    total = 0
    for item in player_stats:
        player_id = item["player_id"]
        pts = calculate_player_points(item["stat"], item["position"])
        if player_id == captain_id:
            pts *= 2
        total += pts
    return total - transfer_penalty


def get_points_breakdown(stat: MatchStat, position: str) -> dict:
    """
    Returns a detailed breakdown of how points were earned.
    """
    pos = position.upper() if position else "ATT"
    config = POINTS_CONFIG.get(pos, POINTS_CONFIG["ATT"])
    breakdown = {}

    if (stat.minutes_played or 0) > 0 and config["played"] > 0:
        breakdown["Appearance"] = config["played"]

    if (stat.goals or 0) > 0:
        breakdown[f"Goals ({stat.goals}x)"] = stat.goals * config["goal"]
        
    pen_scored = getattr(stat, "penalties_scored", 0)
    if pen_scored > 0:
        breakdown[f"Penalties Scored ({pen_scored}x)"] = pen_scored * config["penalty_scored"]
        
    if (stat.assists or 0) > 0:
        breakdown[f"Assists ({stat.assists}x)"] = stat.assists * config["assist"]
        
    if (stat.clean_sheet or 0) > 0 and config["clean_sheet"] > 0:
        breakdown[f"Clean Sheet ({stat.clean_sheet}x)"] = stat.clean_sheet * config["clean_sheet"]
        
    saves = stat.saves or 0
    if (saves // 2) > 0 and config["save_per_2"] > 0:
        breakdown[f"Saves ({saves}x)"] = (saves // 2) * config["save_per_2"]
        
    pen_saved = getattr(stat, "penalties_saved", 0)
    if pen_saved > 0:
        breakdown[f"Penalty Saves ({pen_saved}x)"] = pen_saved * config["penalty_saved"]
        
    if (stat.defensive_errors or 0) > 0:
        breakdown[f"Defensive Error ({stat.defensive_errors}x)"] = stat.defensive_errors * config["defensive_error"]
        
    if (stat.own_goals or 0) > 0:
        breakdown[f"Own Goals ({stat.own_goals}x)"] = stat.own_goals * config["own_goal"]
        
    pen_missed = getattr(stat, "penalties_missed", 0)
    if pen_missed > 0:
        breakdown[f"Penalty Missed ({pen_missed}x)"] = pen_missed * config["penalty_miss"]
        
    if stat.mvp:
        breakdown["MVP Award"] = config["mvp"]
        
    if (stat.nutmegs or 0) > 0 and config["nutmeg"] > 0:
        breakdown[f"Nutmegs/Skills ({stat.nutmegs}x)"] = stat.nutmegs * config["nutmeg"]

    breakdown["Total"] = sum(breakdown.values())
    return breakdown