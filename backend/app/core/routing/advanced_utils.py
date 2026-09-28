"""
API and Utility Functions
"""

from typing import Dict, Any, List, Optional
from datetime import datetime

from .advanced_config import PROTOCOLS, DEFAULT_WEIGHTS, SEMANTIC_DECISIVE_THRESHOLD, normalize_weights
from .advanced_core import RouteResult
from .advanced_main import route_message

def auto_route(user_text: str, user_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Convenience wrapper for API compatibility"""
    result = route_message(user_text, user_context)
    return result.model_dump()

def get_user_state() -> Dict[str, Any]:
    """Get current routing state"""
    return {
        "protocols": PROTOCOLS,
        "default_weights": DEFAULT_WEIGHTS,
        "semantic_threshold": SEMANTIC_DECISIVE_THRESHOLD,
        "timestamp": datetime.now().isoformat()
    }

# ============================================================
# FEEDBACK AND LEARNING
# ============================================================

def submit_feedback(
    protocol: str,
    success: bool,
    current_weights: Dict[str, float]
) -> Dict[str, float]:
    """
    Adjust routing weights based on feedback
    Returns updated weights
    """
    if protocol not in PROTOCOLS:
        raise ValueError("Unknown protocol")
    weights = normalize_weights(current_weights)
    
    if success:
        # Increase weight of successful factors slightly
        weights["semantic"] = min(weights["semantic"] + 0.05, 0.7)
        weights["keyword"] = min(weights["keyword"] + 0.02, 0.4)
    else:
        # Decrease weight of factors that led to wrong choice
        weights["semantic"] = max(weights["semantic"] - 0.03, 0.3)
        weights["keyword"] = max(weights["keyword"] - 0.01, 0.2)
        # Increase recency/user_pref for context awareness
        weights["recency"] = min(weights["recency"] + 0.02, 0.2)
        weights["user_pref"] = min(weights["user_pref"] + 0.02, 0.2)
    
    # Normalize to sum to 1.0
    total = sum(weights.values())
    if total > 0:
        weights = {k: v / total for k, v in weights.items()}
    
    return weights

# ============================================================
# PROTOCOL UTILITIES
# ============================================================

def get_protocol_info(protocol: str) -> Dict[str, Any]:
    """Get detailed information about a protocol"""
    from .advanced_config import (
        CRISIS_KEYWORDS, SOMATIC_KEYWORDS, 
        CBT_KEYWORDS, DBT_KEYWORDS, ACT_KEYWORDS
    )
    
    protocol_map = {
        "CRISIS": {
            "name": "Crisis Intervention",
            "description": "Immediate support for self-harm or suicide risk",
            "focus": "Safety and immediate intervention",
            "keywords": CRISIS_KEYWORDS,
            "recommended_actions": ["Call 988", "Go to emergency room", "Contact trusted person"]
        },
        "SOMATIC": {
            "name": "Somatic Protocol",
            "description": "Body-focused interventions for panic and anxiety",
            "focus": "Physical sensations and grounding",
            "keywords": SOMATIC_KEYWORDS,
            "recommended_actions": ["Breathing exercises", "Grounding techniques", "Body scan"]
        },
        "CBT": {
            "name": "Cognitive Behavioral Therapy",
            "description": "Thought-focused interventions for cognitive distortions",
            "focus": "Thought patterns and reframing",
            "keywords": CBT_KEYWORDS,
            "recommended_actions": ["Thought records", "Cognitive restructuring", "Behavioral experiments"]
        },
        "DBT": {
            "name": "Dialectical Behavior Therapy",
            "description": "Emotion regulation and distress tolerance",
            "focus": "Emotional regulation and interpersonal skills",
            "keywords": DBT_KEYWORDS,
            "recommended_actions": ["Mindfulness", "Distress tolerance", "Emotion regulation"]
        },
        "ACT": {
            "name": "Acceptance and Commitment Therapy",
            "description": "Values-based living and psychological flexibility",
            "focus": "Values, acceptance, and committed action",
            "keywords": ACT_KEYWORDS,
            "recommended_actions": ["Values clarification", "Acceptance exercises", "Committed action"]
        }
    }
    
    return protocol_map.get(protocol, {
        "name": "Unknown Protocol",
        "description": "Protocol not found",
        "focus": "General support",
        "keywords": [],
        "recommended_actions": ["Continue conversation", "Practice self-care"]
    })

def list_protocols() -> List[Dict[str, Any]]:
    """List all available protocols with basic info"""
    protocols = []
    for protocol in PROTOCOLS:
        info = get_protocol_info(protocol)
        protocols.append({
            "code": protocol,
            "name": info["name"],
            "description": info["description"],
            "focus": info["focus"]
        })
    return protocols