from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./fantasy5aside.db"
    SECRET_KEY: str = "change-me-in-production-please"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    BUDGET_LIMIT: float = 50.0

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
