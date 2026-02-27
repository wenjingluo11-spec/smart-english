from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./smart_english.db"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    cors_origins: list[str] = ["http://localhost:8090", "http://127.0.0.1:8090"]

    # TTS 配置
    tts_default_voice: str = "en-US-JennyNeural"
    tts_default_rate: str = "+0%"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
