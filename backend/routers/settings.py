"""Settings router for AI configuration."""

import httpx
from fastapi import APIRouter

from schemas.ai_settings import AISettings, AISettingsResponse
from services.llm_factory import load_ai_settings, save_ai_settings, test_llm_connection, get_api_key

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/ai", response_model=AISettingsResponse)
async def get_ai_settings():
    """Get current AI settings (API key masked)."""
    settings = load_ai_settings()
    return AISettingsResponse.from_settings(settings)


@router.put("/ai")
async def update_ai_settings(settings: AISettings):
    """Update AI settings."""
    new_settings = settings.model_dump()
    # Remove openai_key_configured as it's computed, not stored
    new_settings.pop("openai_key_configured", None)
    save_ai_settings(new_settings)
    return {"status": "success"}


@router.post("/ai/test")
async def test_connection():
    """Test LLM connection with current settings."""
    return await test_llm_connection()


@router.get("/ai/models")
async def get_available_models():
    """Fetch available models from the current provider."""
    settings = load_ai_settings()
    provider = settings.get("provider", "ollama")
    base_url = settings.get("base_url", "http://localhost:11434/v1")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            if provider == "ollama":
                # Ollama uses /api/tags endpoint
                ollama_base = base_url.replace("/v1", "")
                response = await client.get(f"{ollama_base}/api/tags")
                if response.status_code == 200:
                    data = response.json()
                    models = [m["name"] for m in data.get("models", [])]
                    return {"status": "success", "models": models}
                else:
                    return {"status": "error", "message": f"Ollama returned {response.status_code}", "models": []}
            else:
                # OpenAI uses /models endpoint
                api_key = get_api_key("openai")
                if not api_key:
                    return {"status": "error", "message": "OpenAI API key not configured", "models": []}

                response = await client.get(
                    f"{base_url}/models",
                    headers={"Authorization": f"Bearer {api_key}"}
                )
                if response.status_code == 200:
                    data = response.json()
                    # Filter to chat models only
                    models = [m["id"] for m in data.get("data", [])
                              if "gpt" in m["id"] or "o1" in m["id"] or "o3" in m["id"]]
                    models.sort()
                    return {"status": "success", "models": models}
                else:
                    return {"status": "error", "message": f"OpenAI returned {response.status_code}", "models": []}
    except httpx.ConnectError:
        return {"status": "error", "message": f"Cannot connect to {provider}", "models": []}
    except Exception as e:
        return {"status": "error", "message": str(e), "models": []}
