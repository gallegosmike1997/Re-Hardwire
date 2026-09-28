"""Routing engine: signal scoring, protocol selection, next-action planning."""

from .models import Protocol, RouteResult, SignalBundle
from .engine import (
    extract_signals,
    load_drive,
    select_level,
    read_emotional_state,
    plan_next_action,
    compute_confidence,
    build_tags,
    route_text,
    auto_route,
)

# Advanced routing system
from .advanced_main import route_message as enhanced_route_message
from .advanced_utils import (
    auto_route as enhanced_auto_route,
    get_user_state,
    submit_feedback,
    get_protocol_info,
    list_protocols
)

# Legacy compatibility
def enhanced_route_text(user_text: str, protocol: str | None = None) -> dict:
    """Compatibility wrapper for existing code"""
    result = enhanced_route_message(user_text)
    return {
        "protocol": result.protocol,
        "confidence": result.confidence,
        "tags": result.tags,
        "nextAction": result.next_action,
        "emotionalState": result.detected_state,
        "rationale": f"Enhanced routing: {result.reason} (confidence: {result.confidence:.2f})"
    }
