"""
Advanced Routing Models and Core Functions
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

from functools import lru_cache
from .advanced_config import (
    PROTOCOLS, KEYWORD_MAP, SEMANTIC_EXAMPLES, get_model
)

# ============================================================
# DATA MODELS
# ============================================================

class RouteResult(BaseModel):
    """Enhanced routing result with AI-powered analysis"""
    protocol: str = Field(..., description="Selected protocol")
    confidence: float = Field(..., description="Confidence score 0-1")
    reason: str = Field(..., description="Reason for selection")
    semantic_scores: Dict[str, float] = Field(default_factory=dict)
    keyword_scores: Dict[str, float] = Field(default_factory=dict)
    final_scores: Dict[str, float] = Field(default_factory=dict)
    detected_state: Optional[str] = Field(None, description="Detected emotional state")
    next_action: Optional[str] = Field(None, description="Recommended next action")
    tags: List[str] = Field(default_factory=list)
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())

class RoutingHistory(BaseModel):
    """History of routing decisions"""
    messages: List[Dict[str, Any]] = Field(default_factory=list)
    protocol_performance: Dict[str, Dict[str, int]] = Field(default_factory=dict)

# ============================================================
# CORE ROUTING FUNCTIONS
# ============================================================

def _get_embedding(text: str):
    """Encode user text without retaining sensitive messages in a global cache."""
    return get_model().encode(text, normalize_embeddings=True)


@lru_cache(maxsize=len(PROTOCOLS))
def _example_embeddings(protocol: str):
    """Cache only the fixed, public protocol examples."""
    return [_get_embedding(ex) for ex in SEMANTIC_EXAMPLES.get(protocol, [])]

def semantic_scores(text: str) -> Dict[str, float]:
    """Compute semantic similarity scores for each protocol"""
    if not text.strip():
        return {p: 0.0 for p in PROTOCOLS}
    
    text_embed = _get_embedding(text)
    scores = {}
    
    for protocol in PROTOCOLS:
        example_embeds = _example_embeddings(protocol)
        if not example_embeds:
            scores[protocol] = 0.0
            continue

        similarities = [float(text_embed @ ex_emb) for ex_emb in example_embeds]
        # Embeddings are already unit-normalized: retain absolute similarity.
        # Dividing by the winning score turns weak matches into false certainty.
        scores[protocol] = max(0.0, min(1.0, sum(similarities) / len(similarities)))

    return scores

def keyword_scores(text: str) -> Dict[str, float]:
    """Compute keyword matching scores"""
    text_lower = text.lower()
    scores = {}
    
    for protocol, keywords in KEYWORD_MAP.items():
        hits = sum(1 for kw in keywords if kw in text_lower)
        # Soft cap at 3 hits
        scores[protocol] = min(hits / 3.0, 1.0)
    
    return scores

def recency_scores(history: List[Dict[str, Any]]) -> Dict[str, float]:
    """Compute scores based on recent protocol usage"""
    if not history:
        return {p: 0.0 for p in PROTOCOLS}
    
    # Only consider last 10 messages
    recent = history[-10:]
    counts = {p: 0 for p in PROTOCOLS}
    
    for msg in recent:
        protocol = msg.get("protocol")
        if protocol in counts:
            counts[protocol] += 1
    
    total = sum(counts.values())
    if total == 0:
        return {p: 0.0 for p in PROTOCOLS}
    
    return {p: counts[p] / total for p in PROTOCOLS}

def user_pref_score(user_context: Optional[Dict[str, Any]], protocol: str) -> float:
    """Compute score based on user preferences"""
    if not user_context:
        return 0.0
    
    preferred = user_context.get("preferred_protocol")
    if preferred == protocol:
        return 1.0
    
    # Check if protocol matches active state
    active_state = user_context.get("active_state")
    if active_state == protocol:
        return 0.8
    
    return 0.0