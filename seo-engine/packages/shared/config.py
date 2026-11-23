from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    mock_mode: bool = True
    database_url: str = "postgresql+asyncpg://seo:seo@db:5432/seo"
    redis_url: str = "redis://redis:6379/0"
    monthly_budget_usd: float = 800.0
    ff_serp: bool = False
    ff_content: bool = False
    ff_qc: bool = False
    ff_publish: bool = False
    ff_index: bool = False
    ff_link: bool = False
    ff_ctr: bool = False
    ff_gbp: bool = False
    ff_report: bool = False
    dataforseo_login: str | None = None
    dataforseo_password: str | None = None
    openai_api_key: str | None = None
    llm_model_cheap: str = "gpt-4.1-mini"
    llm_model_premium: str = "gpt-4.1"
@lru_cache
def get_settings() -> Settings:
    return Settings()
settings = get_settings()
