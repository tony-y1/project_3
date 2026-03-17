from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_ENV: str = "development"
    SECRET_KEY: str = "change-me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Database (환경별로 .env에서 분리)
    DATABASE_URL: str = "sqlite+aiosqlite:///./malbeot.db"
    USE_REDIS: bool = False  # 로컬은 False, EC2는 True
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # OpenAI
    OPENAI_API_KEY: str = ""

    # Google Cloud STT/TTS (나 담당)
    GOOGLE_APPLICATION_CREDENTIALS: str = "./credentials/google-service-account.json"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
