"""Stable, non-personal app capabilities for client discovery."""

from fastapi import APIRouter

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
            "historyBackendHasPerUserIsolation": False,
        },
    }
