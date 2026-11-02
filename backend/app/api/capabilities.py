"""Stable, non-personal app capabilities for client discovery."""

from fastapi import APIRouter

from app.core.config import settings

router = APIRouter()


@router.get("/capabilities")
def capabilities() -> dict:
    """Describe supported features and data boundaries without user data."""
    return {
        "apiVersion": "v1",
        "app": "Re-Hardwire",
        "features": {
            "guidedPractices": {"availableOffline": True, "packVersion": "1.0.0"},
            "supportPlan": {"availableOffline": True, "storage": "browser-local"},
            "coachChat": {"requiresNetwork": True},
            "clinicalConversationReview": {
                "available": False,
                "sharingEnabled": False,
                "reason": "No clinical review service is configured.",
            },
        },
        "privacy": {
            "chatRequestSentToReplyService": True,
            "automaticClinicalReviewSharing": False,
            "historyBackendHasPerUserIsolation": True,
            "deviceSessionRequired": True,
            "profileStorage": "local-json-per-device-subject",
        },
        "llm": {
            "providers": [
                provider.strip().lower()
                for provider in settings.llm_provider_options
                if provider.strip().lower() in {"local", "openai", "ollama", "gemma"}
                and (provider.strip().lower() != "openai" or bool(settings.llm_api_key))
            ],
            "defaultProvider": settings.llm_provider,
            "defaultModel": settings.llm_model,
        },
    }
