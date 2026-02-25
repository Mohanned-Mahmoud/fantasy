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
        "yellow_card": -1,
        "red_card": -3,
        "own_goal": -2,
        "played": 1,
        "mvp": 3,
        "nutmeg": 1,
    },
    "DEF": {
        "goal": 5,
        "assist": 3,
        "clean_sheet": 3,
        "save_per_3": 0,
        "yellow_card": -1,
        "red_card": -3,
        "own_goal": -2,
        "played": 1,
        "mvp": 3,
        "nutmeg": 1,
    },
    "ATT": {
        "goal": 4,
        "assist": 3,
        "clean_sheet": 0,
        "save_per_3": 0,
        "yellow_card": -1,
        "red_card": -3,
        "own_goal": -2,
        "played": 1,
        "mvp": 3,
        "nutmeg": 1,
    },
    "MID": {
        "goal": 5,
        "assist": 3,
        "clean_sheet": 1,
        "save_per_3": 0,
        "yellow_card": -1,
        "red_card": -3,
        "own_goal": -2,
        "played": 1,
        "mvp": 3,
        "nutmeg": 1,
    },
}


def calculate_player_points(stat: MatchStat, position: str) -> int:
    """
    Calculate fantasy points for a player based on their match stats.
    """
    config = POINTS_CONFIG.get(position.upper(), POINTS_CONFIG["ATT"])
    points = 0

    if stat.minutes_played > 0:
        points += config["played"]

    points += stat.goals * config["goal"]
    points += stat.assists * config["assist"]

    if stat.clean_sheet and stat.minutes_played >= 45:
        points += config["clean_sheet"]

    save_points = (stat.saves // 3) * config["save_per_3"]
    points += save_points

    points += stat.yellow_cards * config["yellow_card"]

    if stat.red_card:
        points += config["red_card"]

    points += stat.own_goals * config["own_goal"]

    if stat.mvp:
        points += config["mvp"]

    points += stat.nutmegs * config["nutmeg"]

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
        position = item["position"]
        stat = item["stat"]

        pts = calculate_player_points(stat, position)

        if player_id == captain_id:
            pts *= 2

        total += pts

    total -= transfer_penalty

    return total


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

    if stat.assists > 0:
        breakdown[f"Assists ({stat.assists}x)"] = stat.assists * config["assist"]

    if stat.clean_sheet and stat.minutes_played >= 45:
        breakdown["Clean Sheet"] = config["clean_sheet"]

    if stat.saves >= 3:
        save_pts = (stat.saves // 3) * config["save_per_3"]
        if save_pts:
            breakdown[f"Saves ({stat.saves})"] = save_pts

    if stat.yellow_cards > 0:
        breakdown[f"Yellow Card ({stat.yellow_cards}x)"] = stat.yellow_cards * config["yellow_card"]

    if stat.red_card:
        breakdown["Red Card"] = config["red_card"]

    if stat.own_goals > 0:
        breakdown[f"Own Goals ({stat.own_goals}x)"] = stat.own_goals * config["own_goal"]

    if stat.mvp:
        breakdown["MVP Award"] = config["mvp"]

    if stat.nutmegs > 0:
        breakdown[f"Nutmegs/Skills ({stat.nutmegs}x)"] = stat.nutmegs * config["nutmeg"]

    breakdown["Total"] = sum(breakdown.values())
    return breakdown
