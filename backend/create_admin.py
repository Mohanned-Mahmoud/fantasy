"""
Run this script to create an admin user.
Usage: cd backend && python create_admin.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from sqlmodel import Session
from app.core.database import create_db_and_tables, engine
from app.core.security import get_password_hash
from app.models.models import User, FantasyTeam


def create_admin(username: str, email: str, password: str):
    create_db_and_tables()
    with Session(engine) as session:
        existing = session.query(User).filter(User.username == username).first()
        if existing:
            print(f"User '{username}' already exists. Setting as admin...")
            existing.is_admin = True
            session.add(existing)
            session.commit()
            print(f"User '{username}' is now an admin.")
            return

        user = User(
            username=username,
            email=email,
            hashed_password=get_password_hash(password),
            is_admin=True,
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        team = FantasyTeam(
            manager_id=user.id,
            name=f"{username}'s Team",
            budget_remaining=50.0,
        )
        session.add(team)
        session.commit()
        print(f"Admin user '{username}' created successfully!")


if __name__ == "__main__":
    print("=== Fantasy 5-a-side Admin Setup ===")
    username = input("Admin username: ").strip()
    email = input("Admin email: ").strip()
    password = input("Admin password: ").strip()
    create_admin(username, email, password)
