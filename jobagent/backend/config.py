import json
import os
from pathlib import Path

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
SETTINGS_PATH = DATA_DIR / "app_settings.json"
PROFILE_PATH = DATA_DIR / "profile.json"


def load_settings() -> dict:
    with open(SETTINGS_PATH) as f:
        return json.load(f)


def save_settings(settings: dict):
    with open(SETTINGS_PATH, "w") as f:
        json.dump(settings, f, indent=2)


def load_profile() -> dict:
    with open(PROFILE_PATH) as f:
        return json.load(f)


def save_profile(profile: dict):
    with open(PROFILE_PATH, "w") as f:
        json.dump(profile, f, indent=2)


def get_llm_api_key() -> str | None:
    # Env var wins for development; otherwise the locally-stored key.
    env_key = os.environ.get("ANTHROPIC_API_KEY")
    if env_key:
        return env_key
    key = load_settings().get("llm_api_key")
    return key or None


def get_model() -> str:
    return load_settings().get("model", "claude-opus-4-8")


def get_gmail_paths() -> dict:
    """Resolve Gmail OAuth file paths from settings (expanded, may not exist)."""
    s = load_settings()
    client_secret = s.get("gmail_client_secret_path", "")
    token = s.get("gmail_token_path", str(DATA_DIR / "gmail_token.json"))
    return {
        "client_secret": os.path.expanduser(client_secret) if client_secret else "",
        "token": os.path.expanduser(token) if token else "",
    }
