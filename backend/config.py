"""Centralized configuration using Pydantic Settings.

All environment variables are validated on startup with type safety.
Paths are computed relative to backend root directory.
"""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables and .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # --- Base Directory (computed, not from env) ---
    # All relative paths are resolved from here
    @property
    def BASE_DIR(self) -> Path:
        return Path(__file__).resolve().parent

    # --- Database ---
    DATABASE_URL: str = "sqlite:///./paperloom.db"

    # --- Storage Directories ---
    PROJECTS_DIR: str = "./projects"
    CACHE_DIR: str = "./cache"

    @property
    def projects_path(self) -> Path:
        """Resolved path to projects directory."""
        p = Path(self.PROJECTS_DIR)
        if not p.is_absolute():
            p = self.BASE_DIR / p
        return p.resolve()

    @property
    def cache_path(self) -> Path:
        """Resolved path to cache directory."""
        p = Path(self.CACHE_DIR)
        if not p.is_absolute():
            p = self.BASE_DIR / p
        return p.resolve()

    @property
    def chroma_path(self) -> Path:
        """Path to ChromaDB vector store."""
        return self.BASE_DIR / "chroma_db"

    @property
    def secrets_path(self) -> Path:
        """Path to secrets.json for AI settings."""
        return self.BASE_DIR / "secrets.json"

    # --- Zotero Configuration ---
    ZOTERO_USER_ID: str | None = None
    ZOTERO_API_KEY: str | None = None

    # --- CORS Configuration ---
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS_ORIGINS into a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    # --- Ollama Configuration ---
    OLLAMA_BASE_URL: str = "http://localhost:11434"

    # --- OpenAI (optional) ---
    OPENAI_API_KEY: str | None = None

    def ensure_directories(self) -> None:
        """Create required directories if they don't exist."""
        self.projects_path.mkdir(parents=True, exist_ok=True)
        self.cache_path.mkdir(parents=True, exist_ok=True)
        self.chroma_path.mkdir(parents=True, exist_ok=True)


# Global settings instance - created once on module import
settings = Settings()
