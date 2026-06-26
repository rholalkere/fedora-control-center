import os
from typing import List, Union
from pydantic import AnyHttpUrl, BeforeValidator, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing_extensions import Annotated

def assemble_cors_origins(v: Union[str, List[str]]) -> List[str]:
    if isinstance(v, str) and not v.startswith("["):
        return [i.strip() for i in v.split(",")]
    elif isinstance(v, (list, str)):
        return v
    raise ValueError(v)

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_ignore_empty=True, extra="ignore"
    )

    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Fedora Control Center"
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecretkey_change_me_in_production")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # CORS Origins
    BACKEND_CORS_ORIGINS: Annotated[
        List[str], BeforeValidator(assemble_cors_origins)
    ] = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:3000"]

    # Database
    SQLALCHEMY_DATABASE_URI: str = "sqlite:///./fedora_control_center.db"

    # Ollama settings
    OLLAMA_API_URL: str = "http://localhost:11434"

    @field_validator("SQLALCHEMY_DATABASE_URI")
    @classmethod
    def assemble_db_connection(cls, v: str) -> str:
        if v.startswith("sqlite"):
            # Ensure SQLite path is correct
            return v
        return v

settings = Settings()
