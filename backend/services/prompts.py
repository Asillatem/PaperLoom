"""Prompt template service for loading and formatting prompts from YAML."""

import logging
from pathlib import Path
from typing import Any

import yaml

logger = logging.getLogger(__name__)

PROMPTS_PATH = Path(__file__).parent.parent / "prompts.yaml"

# Cache for loaded prompts
_prompts_cache: dict[str, Any] = {}


def load_prompts() -> dict[str, Any]:
    """Load prompts from YAML file."""
    global _prompts_cache

    if not PROMPTS_PATH.exists():
        logger.warning(f"Prompts file not found: {PROMPTS_PATH}")
        return {}

    try:
        with open(PROMPTS_PATH, "r", encoding="utf-8") as f:
            _prompts_cache = yaml.safe_load(f) or {}
        logger.info(f"Loaded prompts from {PROMPTS_PATH}")
    except Exception as e:
        logger.error(f"Error loading prompts: {e}", exc_info=True)
        _prompts_cache = {}

    return _prompts_cache


def get_prompt(key: str, **kwargs) -> str:
    """
    Get a prompt by key and format it with provided variables.

    Supports nested keys via dot notation (e.g., 'synthesis.summary').

    Args:
        key: Prompt key, can use dot notation for nested access
        **kwargs: Variables to substitute in the template

    Returns:
        Formatted prompt string, or error message if not found
    """
    if not _prompts_cache:
        load_prompts()

    # Navigate nested keys (e.g., "synthesis.summary")
    keys = key.split(".")
    value = _prompts_cache

    for k in keys:
        if isinstance(value, dict):
            value = value.get(k)
        else:
            value = None
            break

        if value is None:
            logger.warning(f"Prompt key not found: {key}")
            return f"[Error: Prompt '{key}' not found]"

    if not isinstance(value, str):
        logger.warning(f"Prompt value is not a string: {key}")
        return f"[Error: Prompt '{key}' is not a string]"

    # Format the string with provided variables
    try:
        return value.format(**kwargs)
    except KeyError as e:
        # Return template as-is if missing variable
        logger.warning(f"Missing variable in prompt '{key}': {e}")
        return value


def reload_prompts() -> None:
    """Force reload prompts from disk (useful for hot-reloading during development)."""
    global _prompts_cache
    _prompts_cache = {}
    load_prompts()


# Load prompts on module import
load_prompts()
