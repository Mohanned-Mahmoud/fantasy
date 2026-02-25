import os
import random
from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from pydantic import BaseModel, EmailStr

# --- إعدادات Firebase ---
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth

# التحقق مما إذا كان Firebase Admin قد تم تهيئته مسبقاً لمنع حدوث خطأ عند إعادة تشغيل السيرفر
if not firebase_admin._apps:
    # يفضل وضع مسار ملف الـ JSON الخاص بـ Firebase Service Account هنا
    # يمكنك تحميله من إعدادات Firebase Console -> Service Accounts
    cert_path = os.environ.get("FIREBASE_CERT_PATH", "firebase-adminsdk.json")
    try:
        if os.path.exists(cert_path):
            cred = credentials.Certificate(cert_path)
            firebase_admin.initialize_app(cred)
        else:
            firebase_admin.initialize_app()
    except Exception as e:
        print(f"Warning: Firebase initialization issue (Ignore if not using Google Login yet): {e}")
# ------------------------

from app.core.database import get_session
from app.core.config import settings
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user,
)
from app.models.models import User, FantasyTeam

router = APIRouter(prefix="/api/auth", tags=["auth"])


class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    team_name: str = "My Fantasy Team"


class UserRead(BaseModel):
    id: int
    username: str
    email: str
    is_admin: bool

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserRead

# موديل لاستقبال توكن Firebase من الفرونت إند
class FirebaseToken(BaseModel):
    token: str


@router.post("/register", response_model=Token)
def register(user_data: UserCreate, session: Session = Depends(get_session)):
    existing = session.exec(
        select(User).where(
            (User.username == user_data.username) | (User.email == user_data.email)
        )
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered",
        )

    user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    team = FantasyTeam(
        manager_id=user.id,
        name=user_data.team_name,
        budget_remaining=settings.BUDGET_LIMIT,
    )
    session.add(team)
    session.commit()

    token = create_access_token({"sub": str(user.id)})
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserRead.model_validate(user),
    )


@router.post("/token", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    user = session.exec(
        select(User).where(User.username == form_data.username)
    ).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    token = create_access_token({"sub": str(user.id)})
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserRead.model_validate(user),
    )


# --- Endpoint تسجيل الدخول باستخدام Firebase (Google) ---
@router.post("/firebase", response_model=Token)
def login_with_firebase(
    token_data: FirebaseToken,
    session: Session = Depends(get_session)
):
    try:
        # 1. التحقق من صحة التوكن عن طريق مكتبة Firebase
        decoded_token = firebase_auth.verify_id_token(token_data.token)
        email = decoded_token.get("email")
        
        if not email:
            raise HTTPException(status_code=400, detail="Email not found in Firebase token")

        # 2. البحث عن المستخدم في قاعدة البيانات
        user = session.exec(select(User).where(User.email == email)).first()

        # 3. إذا كان المستخدم غير موجود (تسجيل دخول لأول مرة)
        if not user:
            base_username = email.split('@')[0]
            username = base_username
            
            # التأكد من أن الـ Username غير مكرر
            existing_user = session.exec(select(User).where(User.username == username)).first()
            if existing_user:
                username = f"{base_username}{random.randint(100, 9999)}"

            # إنشاء حساب المستخدم الجديد
            user = User(
                username=username,
                email=email,
                hashed_password=get_password_hash(""), # باسوورد فارغ لأن الدخول بحساب جوجل
            )
            session.add(user)
            session.commit()
            session.refresh(user)

            # إنشاء فريق الفانتازي الخاص به
            team = FantasyTeam(
                manager_id=user.id,
                name=f"{username}'s Team",
                budget_remaining=settings.BUDGET_LIMIT,
            )
            session.add(team)
            session.commit()

        # 4. إنشاء التوكن الخاص بالموقع
        token = create_access_token({"sub": str(user.id)})
        
        return Token(
            access_token=token,
            token_type="bearer",
            user=UserRead.model_validate(user),
        )

    except Exception as e:
        print(f"Firebase Auth Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Firebase Token",
        )
# --------------------------------------------------------


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)):
    return current_user
    