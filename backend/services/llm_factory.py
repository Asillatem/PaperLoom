"""LLM Factory for creating LLM clients using httpx."""

import json
import logging
from typing import Optional, AsyncIterator
import httpx

from config import settings
from schemas.ai_settings import AISettings

logger = logging.getLogger(__name__)

# Default settings
DEFAULT_SETTINGS = AISettings().model_dump()


def get_api_key(provider: str) -> str:
    """Get API key from config settings based on provider."""
    if provider == "openai":
        return settings.OPENAI_API_KEY or ""
    # Ollama doesn't need a real key
    return "ollama"


def load_ai_settings() -> dict:
    """Load AI settings from secrets.json."""
    if settings.secrets_path.exists():
        try:
            with open(settings.secrets_path, "r") as f:
                data = json.load(f)
                return {**DEFAULT_SETTINGS, **data.get("ai_settings", {})}
        except (json.JSONDecodeError, IOError):
            pass
    return DEFAULT_SETTINGS.copy()


def save_ai_settings(ai_settings: dict) -> None:
    """Save AI settings to secrets.json."""
    data = {}
    if settings.secrets_path.exists():
        try:
            with open(settings.secrets_path, "r") as f:
                data = json.load(f)
        except (json.JSONDecodeError, IOError):
            pass

    data["ai_settings"] = ai_settings

    with open(settings.secrets_path, "w") as f:
        json.dump(data, f, indent=2)


class SimpleLLM:
    """Simple LLM client using httpx for OpenAI-compatible APIs (Ollama, OpenAI)."""

    def __init__(
        self,
        model: str,
        base_url: str,
        api_key: str,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        system_prompt: str = "",
    ):
        self.model = model
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.system_prompt = system_prompt

    async def invoke(self, messages: list[dict]) -> str:
        """Send a chat completion request and return the response content."""
        # Prepend system prompt if set
        if self.system_prompt:
            messages = [{"role": "system", "content": self.system_prompt}] + messages

        try:
            async with httpx.AsyncClient(timeout=180.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": self.model,
                        "messages": messages,
                        "temperature": self.temperature,
                        "max_tokens": self.max_tokens,
                    },
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
        except httpx.HTTPStatusError as e:
            error_text = e.response.text[:500] if e.response else "No response body"
            raise RuntimeError(f"HTTP {e.response.status_code}: {error_text}")
        except httpx.ConnectError:
            raise RuntimeError(f"Cannot connect to {self.base_url}. Is Ollama running?")
        except KeyError as e:
            raise RuntimeError(f"Unexpected response format: missing key {e}")
        except Exception as e:
            raise RuntimeError(f"{type(e).__name__}: {str(e) or repr(e)}")

    async def stream(self, messages: list[dict]) -> AsyncIterator[str]:
        """Stream a chat completion response."""
        # Prepend system prompt if set
        if self.system_prompt:
            messages = [{"role": "system", "content": self.system_prompt}] + messages

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "messages": messages,
                    "temperature": self.temperature,
                    "max_tokens": self.max_tokens,
                    "stream": True,
                },
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str.strip() == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                            delta = data["choices"][0].get("delta", {})
                            content = delta.get("content", "")
                            if content:
                                yield content
                        except json.JSONDecodeError:
                            continue


def create_llm(ai_settings: Optional[dict] = None) -> SimpleLLM:
    """
    Create SimpleLLM instance.

    Works for both OpenAI and Ollama (via base_url).
    API keys are loaded from environment variables, not from settings.
    """
    if ai_settings is None:
        ai_settings = load_ai_settings()

    provider = ai_settings.get("provider", "ollama")
    model = ai_settings.get("model_name", "llama3.2")
    api_key = get_api_key(provider)

    logger.info(f"Creating LLM: provider={provider}, model={model}")

    return SimpleLLM(
        model=model,
        base_url=ai_settings.get("base_url", "http://localhost:11434/v1"),
        api_key=api_key,
        temperature=ai_settings.get("temperature", 0.7),
        max_tokens=min(ai_settings.get("context_window", 4096), 4096),
        system_prompt=ai_settings.get("system_prompt", ""),
    )


async def test_llm_connection() -> dict:
    """Test the LLM connection with a simple prompt."""
    try:
        llm = create_llm()
        response = await llm.invoke([{"role": "user", "content": "Say 'OK' if you can hear me."}])
        logger.info("LLM connection test successful")
        return {
            "status": "success",
            "response": response[:100] if response else "No response",
        }
    except httpx.ConnectError:
        logger.error("LLM connection test failed: Cannot connect to server")
        return {
            "status": "error",
            "message": "Cannot connect to LLM server. Is Ollama running?",
        }
    except httpx.HTTPStatusError as e:
        logger.error(f"LLM connection test failed: HTTP {e.response.status_code}")
        return {
            "status": "error",
            "message": f"HTTP error: {e.response.status_code}",
        }
    except Exception as e:
        logger.error(f"LLM connection test failed: {e}", exc_info=True)
        return {
            "status": "error",
            "message": str(e),
        }
