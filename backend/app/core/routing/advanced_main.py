"""
Main Routing Functions
"""

from typing import Dict, Any, List, Optional
from datetime import datetime

from .advanced_config import (
    DEFAULT_PROTOCOL, PROTOCOLS, normalize_weights,
    SEMANTIC_DECISIVE_THRESHOLD
)
from .advanced_core import (
    RouteResult, semantic_scores, keyword_scores,
    recency_scores, user_pref_score
)

# ============================================================
# MAIN ROUTING FUNCTION
# ============================================================

def route_message(
    user_text: str,
    user_context: Optional[Dict[str, Any]] = None,
    history: Optional[List[Dict[str, Any]]] = None,
    weights: Optional[Dict[str, float]] = None
) -> RouteResult:
    """
    Enhanced routing with SBERT semantic analysis and multi-factor scoring
    """
    if not user_text.strip():
        raise ValueError("user_text must not be empty")
    history = history or []
    weights = normalize_weights(weights)
    
    # Compute individual scores
    sem_scores = semantic_scores(user_text)
    kw_scores = keyword_scores(user_text)
    rec_scores = recency_scores(history)
    pref_scores = {p: user_pref_score(user_context, p) for p in PROTOCOLS}
    
    # Check for crisis detection (override)
    if sem_scores.get("CRISIS", 0) >= SEMANTIC_DECISIVE_THRESHOLD:
        return RouteResult(
            protocol="CRISIS",
            confidence=float(sem_scores["CRISIS"]),
            reason="semantic_crisis",
            semantic_scores=sem_scores,
            keyword_scores=kw_scores,
            final_scores={p: 1.0 if p == "CRISIS" else 0.0 for p in PROTOCOLS},
            detected_state="CRISIS",
            next_action="seek_immediate_help",
            tags=["crisis", "urgent", "semantic_match"]
        )
    
    # Combine scores with weights
    final_scores = {}
    for protocol in PROTOCOLS:
        score = (
            weights["semantic"] * sem_scores.get(protocol, 0) +
            weights["keyword"] * kw_scores.get(protocol, 0) +
            weights["recency"] * rec_scores.get(protocol, 0) +
            weights["user_pref"] * pref_scores.get(protocol, 0)
        )
        final_scores[protocol] = score
    
    # CRISIS requires the evidence threshold above; preferences/history must
    # not promote a weak semantic match into a crisis determination.
    final_scores["CRISIS"] = 0.0
    candidates = [p for p in PROTOCOLS if p != "CRISIS"]
    chosen_protocol = max(candidates, key=final_scores.get)
    chosen_score = final_scores[chosen_protocol]
    
    # Fallback for low confidence
    if chosen_score < 0.05:
        chosen_protocol = DEFAULT_PROTOCOL
        chosen_score = 0.0
        reason = "low_confidence_fallback"
    else:
        reason = "weighted_aggregation"
    
    # Determine emotional state based on protocol
    emotional_state_map = {
        "CRISIS": "crisis",
        "SOMATIC": "activated",
        "CBT": "overthinking",
        "DBT": "emotional",
        "ACT": "values_driven"
    }
    
    detected_state = emotional_state_map.get(chosen_protocol, "neutral")
    
    # Determine next action
    next_action_map = {
        "CRISIS": "seek_immediate_help",
        "SOMATIC": "grounding_techniques",
        "CBT": "cognitive_reframing",
        "DBT": "emotion_regulation",
        "ACT": "values_clarification"
    }
    
    next_action = next_action_map.get(chosen_protocol, "continue_conversation")
    
    # Generate tags
    tags = [chosen_protocol.lower(), detected_state]
    if chosen_score > 0.7:
        tags.append("high_confidence")
    if sem_scores.get(chosen_protocol, 0) > 0.6:
        tags.append("semantic_strong")
    
    return RouteResult(
        protocol=chosen_protocol,
        confidence=float(chosen_score),
        reason=reason,
        semantic_scores=sem_scores,
        keyword_scores=kw_scores,
        final_scores=final_scores,
        detected_state=detected_state,
        next_action=next_action,
        tags=tags
    )