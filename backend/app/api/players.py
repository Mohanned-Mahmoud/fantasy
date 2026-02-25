from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel

from app.core.database import get_session
from app.core.security import get_current_user, get_current_admin
from app.models.models import Player, User

router = APIRouter(prefix="/api/players", tags=["players"])

# 1. تعديل موديل الإنشاء ليستقبل رابط الصورة
class PlayerCreate(BaseModel):
    name: str
    position: str
    team_name: str
    price: float = 5.0
    image_url: Optional[str] = "/players/default.png" # القيمة الافتراضية لو مبعتش صورة

# 2. تعديل موديل القراءة ليعرض رابط الصورة في الفرونت إند
class PlayerRead(BaseModel):
    id: int
    name: str
    position: str
    team_name: str
    price: float
    total_points: int
    is_active: bool
    image_url: Optional[str] # أضفنا السطر ده هنا

    class Config:
        from_attributes = True

# 3. تعديل موديل التحديث للسماح بتغيير الصورة لاحقاً
class PlayerUpdate(BaseModel):
    name: Optional[str] = None
    position: Optional[str] = None
    team_name: Optional[str] = None
    price: Optional[float] = None
    is_active: Optional[bool] = None
    image_url: Optional[str] = None # أضفنا السطر ده هنا


@router.get("/", response_model=List[PlayerRead])
def list_players(
    position: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    query = select(Player).where(Player.is_active == True)
    if position:
        query = query.where(Player.position == position.upper())
    players = session.exec(query).all()
    return players


@router.post("/", response_model=PlayerRead)
def create_player(
    player_data: PlayerCreate,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin),
):
    player = Player(**player_data.model_dump())
    session.add(player)
    session.commit()
    session.refresh(player)
    return player


@router.put("/{player_id}", response_model=PlayerRead)
def update_player(
    player_id: int,
    player_data: PlayerUpdate,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin),
):
    player = session.get(Player, player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    for key, value in player_data.model_dump(exclude_none=True).items():
        setattr(player, key, value)
    session.add(player)
    session.commit()
    session.refresh(player)
    return player


@router.delete("/{player_id}")
def delete_player(
    player_id: int,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin),
):
    player = session.get(Player, player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    player.is_active = False
    session.add(player)
    session.commit()
    return {"message": "Player deactivated"}
