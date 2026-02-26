"""
Fantasy 5-a-side Points Engine
Calculates fantasy points based on real match events.
"""
from app.models.models import MatchStat, Player


POINTS_CONFIG = {
    "GK": {
        "goal": 6,
        "assist": 3,
        "clean_sheet": 5,
        "save_per_3": 1,
        "defensive_error": -1,
        "own_goal": -2,
        "played": 1,
        "mvp": 3,
        "nutmeg": 1,
        "penalty_scored": 3,      # جول ضربة جزاء
        "penalty_saved": 5,       # صد ضربة جزاء
        "penalty_miss": -2,       # ضياع ضربة جزاء
    },
    "DEF": {
        "goal": 5,
        "assist": 3,
        "clean_sheet": 3,
        "save_per_3": 0,
        "defensive_error": -1,
        "own_goal": -2,
        "played": 1,
        "mvp": 3,
        "nutmeg": 1,
        "penalty_scored": 3,
        "penalty_saved": 7,
        "penalty_miss": -2,
    },
    "MID": {
        "goal": 5,
        "assist": 3,
        "clean_sheet": 1,
        "save_per_3": 0,
        "defensive_error": -1,
        "own_goal": -2,
        "played": 1,
        "mvp": 3,
        "nutmeg": 1,
        "penalty_scored": 3,
        "penalty_saved": 7,
        "penalty_miss": -2,
    },
    "ATT": {
        "goal": 4,
        "assist": 3,
        "clean_sheet": 0,
        "save_per_3": 0,
        "defensive_error": -1,
        "own_goal": -2,
        "played": 1,
        "mvp": 3,
        "nutmeg": 1,
        "penalty_scored": 3,
        "penalty_saved": 7,
        "penalty_miss": -2,
    },
}


def calculate_player_points(stat: MatchStat, position: str) -> int:
    """
    Calculate fantasy points for a player based on their match stats.
    """
    pos = position.upper()
    config = POINTS_CONFIG.get(pos, POINTS_CONFIG["ATT"])
    points = 0

    # ١. نقطة الحضور (مجرد ما يشم النجيله)
    if stat.minutes_played > 0:
        points += config["played"]

    # ٢. الأجوان العادية (كل مركز بتسعيرته)
    points += stat.goals * config["goal"]
    
    # ٣. أهداف ضربات الجزاء (نقاط ثابتة أقل من الجول العادي)
    points += getattr(stat, "penalties_scored", 0) * config["penalty_scored"]

    # ٤. الأسيست (صنايعي الأجوان)
    points += stat.assists * config["assist"]

    # ٥. الكلين شيت (تقفيل ورا بمية ونور)
    if stat.clean_sheet > 0:
        points += stat.clean_sheet * config["clean_sheet"]

    # ٦. التصديات (شغل الحراس - نقطة لكل ٣)
    save_points = (stat.saves // 3) * config["save_per_3"]
    points += save_points
    
    # ٧. صد ضربات الجزاء (بونص عالي لو مش حارس)
    points += getattr(stat, "penalties_saved", 0) * config["penalty_saved"]

    # ٨. الخصومات والسوالب (أخطاء، أجوان عكسية، ضياع جزاء)
    points += stat.defensive_errors * config["defensive_error"]
    points += stat.own_goals * config["own_goal"]
    points += getattr(stat, "penalties_missed", 0) * config["penalty_miss"]

    # ٩. روقان الخماسي (نجم الماتش والكباري)
    if stat.mvp:
        points += config["mvp"]
    points += stat.nutmegs * config["nutmeg"]

    # أقل حاجة ممكن يوصلها اللعيب لو اليوم كان كارثي هي -10
    return max(points, -10)

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
    config = POINTS_CONFIG.get(position.upper(), POINTS_CONFIG["ATT"])
    breakdown = {}

    if stat.minutes_played > 0:
        breakdown["Appearance"] = config["played"]

    if stat.goals > 0:
        breakdown[f"Goals ({stat.goals}x)"] = stat.goals * config["goal"]
    if getattr(stat, "penalties_scored", 0) > 0:
        breakdown[f"Penalties Scored ({stat.penalties_scored}x)"] = stat.penalties_scored * config["penalty_scored"]
    if stat.assists > 0:
        breakdown[f"Assists ({stat.assists}x)"] = stat.assists * config["assist"]
    if stat.clean_sheet > 0:
        breakdown[f"Clean Sheet ({stat.clean_sheet}x)"] = stat.clean_sheet * config["clean_sheet"]
    if (stat.saves // 3) > 0 and config["save_per_3"] > 0:
        breakdown[f"Saves ({stat.saves}x)"] = (stat.saves // 3) * config["save_per_3"]
    if getattr(stat, "penalties_saved", 0) > 0:
        breakdown[f"Penalty Saves ({stat.penalties_saved}x)"] = stat.penalties_saved * config["penalty_saved"]
    if stat.defensive_errors > 0:
        breakdown[f"Defensive Error ({stat.defensive_errors}x)"] = stat.defensive_errors * config["defensive_error"]
    if stat.own_goals > 0:
        breakdown[f"Own Goals ({stat.own_goals}x)"] = stat.own_goals * config["own_goal"]
    if getattr(stat, "penalties_missed", 0) > 0:
        breakdown[f"Penalty Missed ({stat.penalties_missed}x)"] = stat.penalties_missed * config["penalty_miss"]
    if stat.mvp:
        breakdown["MVP Award"] = config["mvp"]
    if stat.nutmegs > 0:
        breakdown[f"Nutmegs/Skills ({stat.nutmegs}x)"] = stat.nutmegs * config["nutmeg"]

    breakdown["Total"] = sum(breakdown.values())
    return breakdown