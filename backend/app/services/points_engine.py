"""
Fantasy 5-a-side Points Engine
Calculates fantasy points based on real match events.
"""
from app.models.models import MatchStat

POINTS_CONFIG = {
    "GK": {
        "goal": 6,            # إعجاز
        "assist": 3,
        "clean_sheet": 5,     
        "save_per_3": 1,      
        "defensive_error": -1,
        "own_goal": -2,
        "played": 1,          # نقطة الحضور رجعت
        "mvp": 3,
        "nutmeg": 2,          
        "penalty_scored": 3,
        "penalty_saved": 5,
        "penalty_miss": -2,
    },
    "DEF": {
        "goal": 5,            # الجول بـ 5 عشان نشجعه يزيد
        "assist": 3,
        "clean_sheet": 3,
        "save_per_3": 0,
        "defensive_error": -1,
        "own_goal": -2,
        "played": 1,
        "mvp": 3,
        "nutmeg": 2,          
        "penalty_scored": 3,
        "penalty_saved": 5,   
        "penalty_miss": -2,
    },
    "MID": {
        "goal": 5,            # زي المدافع
        "assist": 3,
        "clean_sheet": 2,     
        "save_per_3": 0,
        "defensive_error": -1,
        "own_goal": -2,
        "played": 1,
        "mvp": 3,
        "nutmeg": 2,
        "penalty_scored": 3,
        "penalty_saved": 5,
        "penalty_miss": -2,
    },
    "ATT": {
        "goal": 4,            # رجعناه لـ 4 نقط عشان ياخد حقه لما يتألق ⚽
        "assist": 3,
        "clean_sheet": 1,     # ولسه بياخد نقطة لما الفرقة تقفل ورا 🛡️
        "save_per_3": 0,
        "defensive_error": -1,
        "own_goal": -2,
        "played": 1,
        "mvp": 3,
        "nutmeg": 2,
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

    # 1. نقطة الحضور (مجرد ما يشم النجيله)
    if (stat.minutes_played or 0) > 0:
        points += config["played"]

    # 2. الأجوان العادية (كل مركز بتسعيرته)
    points += (stat.goals or 0) * config["goal"]
    
    # 3. أهداف ضربات الجزاء (نقاط ثابتة أقل من الجول العادي)
    points += getattr(stat, "penalties_scored", 0) * config["penalty_scored"]

    # 4. الأسيست (صنايعي الأجوان)
    points += (stat.assists or 0) * config["assist"]

    # 5. الكلين شيت (تقفيل ورا بمية ونور)
    if (stat.clean_sheet or 0) > 0:
        points += stat.clean_sheet * config["clean_sheet"]

    # 6. التصديات (شغل الحراس - نقطة لكل 3)
    save_points = ((stat.saves or 0) // 3) * config["save_per_3"]
    points += save_points
    
    # 7. صد ضربات الجزاء (بونص عالي لو مش حارس)
    points += getattr(stat, "penalties_saved", 0) * config["penalty_saved"]

    # 8. الخصومات والسوالب (أخطاء، أجوان عكسية، ضياع جزاء)
    points += (stat.defensive_errors or 0) * config["defensive_error"]
    points += (stat.own_goals or 0) * config["own_goal"]
    points += getattr(stat, "penalties_missed", 0) * config["penalty_miss"]

    # 9. روقان الخماسي (نجم الماتش والكباري)
    if stat.mvp:
        points += config["mvp"]
    points += (stat.nutmegs or 0) * config["nutmeg"]

    # أقل حاجة ممكن يوصلها اللعيب لو اليوم كان كارثي هي -10
    return max(points, -10)


def calculate_gameweek_team_points(
    player_stats: list[dict],
    captain_id: int,
    transfer_penalty: int = 0,
) -> int:
    total = 0
    for item in player_stats:
        player_id = item["player_id"]
        pts = calculate_player_points(item["stat"], item["position"])
        if player_id == captain_id:
            pts *= 2
        total += pts
    return total - transfer_penalty


def get_points_breakdown(stat: MatchStat, position: str) -> dict:
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
    if (saves // 3) > 0 and config["save_per_3"] > 0:
        breakdown[f"Saves ({saves}x)"] = (saves // 3) * config["save_per_3"]
        
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