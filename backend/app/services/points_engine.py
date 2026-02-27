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
        "save_per_3": 2,
        "defensive_error": -1,
        "own_goal": -2,
        "played": 1,
        "mvp": 3,
        "nutmeg": 2,          
        "penalty_scored": 7,
        "penalty_saved": 5,   
        "penalty_miss": -2,
    },
    "MID": {
        "goal": 5,            # زي المدافع
        "assist": 3,
        "clean_sheet": 2,     
        "save_per_3": 2,
        "defensive_error": -1,
        "own_goal": -2,
        "played": 1,
        "mvp": 3,
        "nutmeg": 2,
        "penalty_scored": 6,
        "penalty_saved": 5,
        "penalty_miss": -2,
    },
    "ATT": {
        "goal": 4,            # رجعناه لـ 4 نقط عشان ياخد حقه لما يتألق ⚽
        "assist": 3,
        "clean_sheet": 1,     # ولسه بياخد نقطة لما الفرقة تقفل ورا 🛡️
        "save_per_3": 2,
        "defensive_error": -1,
        "own_goal": -2,
        "played": 1,
        "mvp": 3,
        "nutmeg": 2,
        "penalty_scored": 4,
        "penalty_saved": 5,
        "penalty_miss": -2,
    },
}

def normalize_position(position: str) -> str:
    """
    بيحول أي اسم مركز للاختصار المعتمد في POINTS_CONFIG
    """
    if not position:
        return "ATT"
    
    pos = position.upper().strip()
    
    if pos.startswith("G"):  # Goalkeeper, GK, G
        return "GK"
    elif pos.startswith("D"):  # Defender, DEF, D
        return "DEF"
    elif pos.startswith("M"):  # Midfielder, MID, M
        return "MID"
    else:                    # Attacker, Forward, ATT, F, A
        return "ATT"

def calculate_player_points(stat: MatchStat, position: str) -> int:
    """
    Calculate fantasy points for a player based on their match stats.
    """
    pos = normalize_position(position)
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
    
    # 🌟 إضافة نقط عدد الماتشات اللي كسبها (كل ماتش بـ 2 نقطة)
    matches_won = getattr(stat, "matches_won", 0)
    points += matches_won * config.get("win_bonus", 2)

    mvp_rank = getattr(stat, "mvp_rank", 0)
    if mvp_rank == 1: points += 3
    elif mvp_rank == 2: points += 2
    elif mvp_rank == 3: points += 1
        
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
    pos = normalize_position(position)
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
    
    # 🌟 توضيح عدد الماتشات اللي كسبها في تفصيلة الإحصائيات
    matches_won = getattr(stat, "matches_won", 0)
    if matches_won > 0 and config.get("win_bonus", 0) > 0:
        breakdown[f"🎉 Matches Won ({matches_won}x)"] = matches_won * config.get("win_bonus", 2) # ✅ الصح
        
    mvp_rank = getattr(stat, "mvp_rank", 0)
    if mvp_rank == 1: breakdown["🥇 MVP (1st Place)"] = 3
    elif mvp_rank == 2: breakdown["🥈 MVP (2nd Place)"] = 2
    elif mvp_rank == 3: breakdown["🥉 MVP (3rd Place)"] = 1
        
    if (stat.nutmegs or 0) > 0 and config["nutmeg"] > 0:
        breakdown[f"Nutmegs/Skills ({stat.nutmegs}x)"] = stat.nutmegs * config["nutmeg"]

    breakdown["Total"] = sum(breakdown.values())
    return breakdown

def calculate_bps(stat, position: str) -> int:
    """
    نظام تقييم الأداء العام (BPS) لتحديد الـ MVP بشكل مستقل عن نقاط الفانتسي.
    """
    pos = position.upper() if position else "ATT"
    bps = 0

    # 1. دقائق اللعب (بونص صغير على التواجد)
    if (stat.minutes_played or 0) > 0:
        bps += 5

    # 2. الأهداف (تقييم عالي جداً)
    bps += (stat.goals or 0) * 24

    # 3. الأسيست
    bps += (stat.assists or 0) * 15

    # 4. الكلين شيت (بيدي تقييم دفاعي محترم للحارس والمدافع)
    if (stat.clean_sheet or 0) > 0:
        if pos in ["GK", "DEF"]:
            bps += 12
        elif pos == "MID":
            bps += 8

    # 5. التصديات (كل تصدي بيدي تقييم للحارس، مش كل 3 تصديات زي الفانتسي)
    bps += (stat.saves or 0) * 4 

    # 6. المهارات (الكباري)
    bps += (stat.nutmegs or 0) * 10

    # 7. ضربات الجزاء
    bps += getattr(stat, "penalties_scored", 0) * 12
    bps += getattr(stat, "penalties_saved", 0) * 18
    bps += getattr(stat, "penalties_missed", 0) * -10

    # 8. الكوارث (خصم قاسي من التقييم)
    bps += (stat.defensive_errors or 0) * -10
    bps += (stat.own_goals or 0) * -15

    return bps


def calculate_earned_badges(stat) -> str:
    b = []
    
    # باجات الأساطير
    if getattr(stat, "goals", 0) >= 5: b.append("sniper")
    if getattr(stat, "assists", 0) >= 4: b.append("maestro")
    if getattr(stat, "saves", 0) >= 10: b.append("wall")
    if getattr(stat, "penalties_saved", 0) >= 1: b.append("octopus")
    if getattr(stat, "clean_sheet", 0) >= 2: b.append("minister")
    if getattr(stat, "mvp_rank", 0) == 1: b.append("goat")
    if getattr(stat, "nutmegs", 0) >= 2: b.append("ankle")
    if getattr(stat, "matches_won", 0) >= 4: b.append("lucky")
    
    # باجات التحفيل
    if getattr(stat, "own_goals", 0) > 0: b.append("agent")
    if getattr(stat, "penalties_missed", 0) > 0: b.append("freeze")
    if getattr(stat, "defensive_errors", 0) >= 2: b.append("disaster")
    
    return ",".join(b)