"""Enhanced routing endpoints with AI-powered capabilities."""

from __future__ import annotations

import json
import logging
from typing import List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.core.routing.advanced_config import normalize_weights, PROTOCOLS

from fastapi import APIRouter, HTTPException, Query

from app.core.routing.engine import route_text
from app.core.routing.models import PROTOCOL_CATALOG, Protocol, RouteRequest, RouteResult
from app.core.routing import (
    enhanced_route_message, enhanced_auto_route, get_user_state,
    submit_feedback, get_protocol_info, list_protocols as list_enhanced_protocols
)
from app.services import analytics

router = APIRouter(tags=["routing"])
logger = logging.getLogger(__name__)


def _limit_serialized_size(value: Any, limit: int, label: str) -> Any:
    try:
        size = len(json.dumps(value, ensure_ascii=False, allow_nan=False).encode("utf-8"))
    except (TypeError, ValueError):
        raise ValueError(f"{label} must contain valid JSON values") from None
    if size > limit:
        raise ValueError(f"{label} is too large")
    return value


# Enhanced request/response models
class EnhancedRouteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_text: str = Field(..., min_length=1, max_length=4000, description="User input text")
    user_context: Dict[str, Any] = Field(default_factory=dict, max_length=20, description="User context and preferences")
    history: List[Dict[str, Any]] = Field(default_factory=list, max_length=40, description="Previous routing history")
    weights: Dict[str, float] = Field(default_factory=dict, max_length=4, description="Routing weights override")

    @field_validator("user_context")
    @classmethod
    def bound_context(cls, value):
        return _limit_serialized_size(value, 8192, "user_context")

    @field_validator("history")
    @classmethod
    def bound_history(cls, value):
        return _limit_serialized_size(value, 16384, "history")

    @field_validator("weights")
    @classmethod
    def validate_weights(cls, value):
        return normalize_weights(value)


class FeedbackRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    protocol: str = Field(..., max_length=20, description="Protocol to provide feedback for")
    success: bool = Field(..., description="Whether the routing was successful")
    current_weights: Dict[str, float] = Field(default_factory=dict, max_length=4, description="Current routing weights")

    @field_validator("current_weights")
    @classmethod
    def validate_weights(cls, value):
        return normalize_weights(value)

    @field_validator("protocol")
    @classmethod
    def validate_protocol(cls, value):
        if value not in PROTOCOLS:
            raise ValueError("Unknown protocol")
        return value


class AutoRouteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_text: str = Field(..., min_length=1, max_length=4000)
    user_context: Dict[str, Any] = Field(default_factory=dict, max_length=20)

    @field_validator("user_context")
    @classmethod
    def bound_context(cls, value):
        return _limit_serialized_size(value, 8192, "user_context")



# Legacy route endpoint
@router.post("", response_model=RouteResult)
def route_turn(payload: RouteRequest) -> RouteResult:
    """Route a single user turn to a protocol, state and next action."""
    text = payload.user_text.strip()
    if not text:
        raise HTTPException(status_code=422, detail="userText must not be empty")

    result = route_text(text, payload.protocol)
    analytics.record_event(
        "route",
        {
            "protocol": result.protocol,
            "confidence": result.confidence,
            "emotionalState": result.emotional_state,
            "nextAction": result.next_action,
        },
    )
    return result

# Enhanced route endpoint
@router.post("/enhanced", response_model=Dict[str, Any])
def enhanced_route(payload: EnhancedRouteRequest) -> Dict[str, Any]:
    """Enhanced routing with AI-powered semantic analysis and multi-protocol support."""
    text = payload.user_text.strip()
    if not text:
        raise HTTPException(status_code=422, detail="userText must not be empty")

    result = enhanced_route_message(
        text,
        user_context=payload.user_context,
        history=payload.history,
        weights=payload.weights
    )
    
    analytics.record_event(
        "enhanced_route",
        {
            "protocol": result.protocol,
            "confidence": result.confidence,
            "detected_state": result.detected_state,
            "next_action": result.next_action,
            "reason": result.reason,
            "semantic_scores": result.semantic_scores,
            "keyword_scores": result.keyword_scores
        },
    )
    
    return result.model_dump()

# Auto-route convenience endpoint
@router.post("/auto")
def auto_route_endpoint(payload: AutoRouteRequest) -> Dict[str, Any]:
    """Auto-route convenience endpoint for simple requests."""
    user_text = payload.user_text.strip()
    user_context = payload.user_context
    
    if not user_text:
        raise HTTPException(status_code=422, detail="user_text must not be empty")
    
    return enhanced_auto_route(user_text, user_context)
# Feedback endpoint
@router.post("/feedback")
def submit_routing_feedback(payload: FeedbackRequest) -> Dict[str, Any]:
    """Submit feedback on routing accuracy to improve future decisions."""
    updated_weights = submit_feedback(
        protocol=payload.protocol,
        success=payload.success,
        current_weights=payload.current_weights
    )
    
    analytics.record_event(
        "routing_feedback",
        {
            "protocol": payload.protocol,
            "success": payload.success,
            "previous_weights": payload.current_weights,
            "updated_weights": updated_weights
        }
    )
    
    return {
        "status": "success",
        "message": "Feedback recorded and weights updated",
        "updated_weights": updated_weights
    }

# Protocol information endpoints
@router.get("/protocols", response_model=List[Protocol])
def list_protocols() -> List[Protocol]:
    """Return the full protocol catalogue, ordered by level."""
    return sorted(PROTOCOL_CATALOG, key=lambda protocol: protocol.level)

@router.get("/enhanced/protocols")
def list_enhanced_protocols_endpoint() -> List[Dict[str, Any]]:
    """List all available enhanced protocols with detailed information."""
    return list_enhanced_protocols()

@router.get("/enhanced/protocols/{protocol_code}")
def get_protocol_details(protocol_code: str) -> Dict[str, Any]:
    """Get detailed information about a specific protocol."""
    info = get_protocol_info(protocol_code.upper())
    if info["name"] == "Unknown Protocol":
        raise HTTPException(status_code=404, detail=f"Protocol '{protocol_code}' not found")
    return info

# System state endpoints
@router.get("/state")
def get_routing_state() -> Dict[str, Any]:
    """Get current routing system state and configuration."""
    return get_user_state()

@router.get("/stats")
def route_stats() -> dict:
    """Aggregate routing activity for the Lab and Dev dashboards."""
    return analytics.summary()

# Health check for enhanced routing
@router.get("/enhanced/health")
def enhanced_routing_health() -> Dict[str, Any]:
    """Health check for enhanced routing system."""
    try:
        # Test routing with a simple input
        test_result = enhanced_route_message("test")
        return {
            "status": "healthy",
            "version": "v5",
            "protocols": len(list_enhanced_protocols()),
            "test_route": {
                "protocol": test_result.protocol,
                "confidence": test_result.confidence
            }
        }
    except Exception:
        logger.exception("Enhanced routing health check failed")
        raise HTTPException(status_code=503, detail="Enhanced routing service is unavailable.") from None
