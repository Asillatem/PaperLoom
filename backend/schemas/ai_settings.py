"""AI Settings schema for LLM configuration."""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal


class AISettings(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    """Configuration for AI/LLM features."""

    provider: Literal["ollama", "openai"] = "ollama"
    model_name: str = "llama3.2"
    base_url: str = "http://localhost:11434/v1"
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    context_window: int = Field(default=4096, ge=1024, le=128000)
    system_prompt: str = Field(
        default="You are a research assistant helping analyze academic documents. "
        "When answering questions, reference the provided excerpts using [1], [2], etc. "
        "Be precise and cite your sources."
    )
    graph_depth: int = Field(default=1, ge=0, le=2)
    # Note: API keys are loaded from environment variables (OPENAI_API_KEY)


class AISettingsResponse(AISettings):
    """Response model for AI settings."""

    # Indicates if OpenAI API key is configured in environment
    openai_key_configured: bool = False

    @classmethod
    def from_settings(cls, settings: dict) -> "AISettingsResponse":
        """Create response from settings dict."""
        import os
        data = settings.copy()
        # Remove api_key if it exists in old settings
        data.pop("api_key", None)
        # Check if OpenAI key is configured in environment
        data["openai_key_configured"] = bool(os.environ.get("OPENAI_API_KEY"))
        return cls(**data)
