from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    is_admin: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    fantasy_team: Optional["FantasyTeam"] = Relationship(back_populates="manager")
    mini_league_memberships: List["MiniLeagueMember"] = Relationship(back_populates="user")


class Player(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    position: str
    team_name: str
    price: float = Field(default=5.0)
    total_points: int = Field(default=0)
    is_active: bool = Field(default=True)

    match_stats: List["MatchStat"] = Relationship(back_populates="player")


class Gameweek(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    number: int = Field(unique=True)
    name: str
    deadline: datetime
    is_active: bool = Field(default=False)
    is_finished: bool = Field(default=False)

    match_stats: List["MatchStat"] = Relationship(back_populates="gameweek")
    fantasy_team_gameweeks: List["FantasyTeamGameweek"] = Relationship(back_populates="gameweek")


class MatchStat(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    gameweek_id: int = Field(foreign_key="gameweek.id")
    player_id: int = Field(foreign_key="player.id")

    goals: int = Field(default=0)
    assists: int = Field(default=0)
    clean_sheet: int = Field(default=0) # اتغيرت لرقم بدل bool
    saves: int = Field(default=0)
    defensive_errors: int = Field(default=0)
    mvp: bool = Field(default=False)
    nutmegs: int = Field(default=0)
    own_goals: int = Field(default=0)
    minutes_played: int = Field(default=0)
    points: int = Field(default=0)

    player: Optional[Player] = Relationship(back_populates="match_stats")
    gameweek: Optional[Gameweek] = Relationship(back_populates="match_stats")


class FantasyTeam(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    manager_id: int = Field(foreign_key="user.id", unique=True)
    name: str
    budget_remaining: float = Field(default=50.0)
    total_points: int = Field(default=0)
    free_transfers: int = Field(default=1)

    manager: Optional[User] = Relationship(back_populates="fantasy_team")
    gameweeks: List["FantasyTeamGameweek"] = Relationship(back_populates="fantasy_team")


class FantasyTeamGameweek(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    fantasy_team_id: int = Field(foreign_key="fantasyteam.id")
    gameweek_id: int = Field(foreign_key="gameweek.id")

    player1_id: Optional[int] = Field(default=None, foreign_key="player.id")
    player2_id: Optional[int] = Field(default=None, foreign_key="player.id")
    player3_id: Optional[int] = Field(default=None, foreign_key="player.id")
    player4_id: Optional[int] = Field(default=None, foreign_key="player.id")
    player5_id: Optional[int] = Field(default=None, foreign_key="player.id")
    captain_id: Optional[int] = Field(default=None, foreign_key="player.id")
    transfers_made: int = Field(default=0)
    transfer_penalty: int = Field(default=0)
    gameweek_points: int = Field(default=0)

    fantasy_team: Optional[FantasyTeam] = Relationship(back_populates="gameweeks")
    gameweek: Optional[Gameweek] = Relationship(back_populates="fantasy_team_gameweeks")


class MiniLeague(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    join_code: str = Field(unique=True, index=True)
    created_by: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    members: List["MiniLeagueMember"] = Relationship(back_populates="league")


class MiniLeagueMember(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    league_id: int = Field(foreign_key="minileague.id")
    user_id: int = Field(foreign_key="user.id")
    joined_at: datetime = Field(default_factory=datetime.utcnow)

    league: Optional[MiniLeague] = Relationship(back_populates="members")
    user: Optional[User] = Relationship(back_populates="mini_league_memberships")
