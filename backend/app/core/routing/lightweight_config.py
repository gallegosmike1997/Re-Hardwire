"""
Re-Hardwire Advanced Routing V5 — Lightweight Version without Torch
Port from Re-Hardwire repository with enhanced AI capabilities
"""

from __future__ import annotations
import time
import logging
import json
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime

import numpy as np
from pydantic import BaseModel, Field

# ============================================================
# LIGHTWEIGHT EMBEDDING SYSTEM (no torch required initially)
# ============================================================

_EMBED_CACHE: Dict[str, np.ndarray] = {}
logger = logging.getLogger("routing_v5_lightweight")
logger.setLevel(logging.INFO)

# Simple text vectorizer (can be replaced with sentence-transformers later)
def _simple_text_vector(text: str) -> np.ndarray:
    """Simple text vectorizer - returns a basic vector representation"""
    # Simple bag-of-words style vector (for demonstration)
    # In production, replace with sentence-transformers
    words = text.lower().split()
    unique_words = list(set(words))
    vector = np.zeros(100)  # Fixed size vector
    
    for i, word in enumerate(unique_words[:100]):
        # Simple hash-based position
        pos = hash(word) % 100
        vector[pos] = 1.0
    
    # Normalize
    norm = np.linalg.norm(vector)
    if norm > 0:
        vector = vector / norm
    
    return vector

def _get_embedding(text: str) -> np.ndarray:
    """Get or compute embedding with caching"""
    if text in _EMBED_CACHE:
        return _EMBED_CACHE[text]
    
    # Try to use sentence-transformers if available
    try:
        from sentence_transformers import SentenceTransformer
        _sbert = SentenceTransformer("all-MiniLM-L6-v2")
        embedding = _sbert.encode(text, normalize_embeddings=True)
        logger.info("Using sentence-transformers for embeddings")
    except ImportError:
        # Fallback to simple vectorizer
        embedding = _simple_text_vector(text)
        logger.info("Using lightweight vectorizer (install sentence-transformers for better accuracy)")
    
    _EMBED_CACHE[text] = embedding
    return embedding

# ============================================================
# PROTOCOL DEFINITIONS
# ============================================================

DEFAULT_PROTOCOL = "CBT"
PROTOCOLS = ["CRISIS", "SOMATIC", "CBT", "DBT", "ACT"]

CRISIS_KEYWORDS = [
    "suicide", "kill myself", "end it", "can't go on", "hurt myself",
    "self harm", "overdose", "want to die", "die by suicide", "no reason to live"
]

SOMATIC_KEYWORDS = [
    "tight chest", "panic", "heart racing", "breathing", "dizzy",
    "nausea", "sweating", "trembling", "grounding", "body"
]

CBT_KEYWORDS = [
    "thought", "thinking", "overthinking", "rumination", "catastrophiz",
    "belief", "distortion", "cognitive", "reframe"
]

DBT_KEYWORDS = [
    "emotion", "regulation", "distress", "cope", "skills", "mindfulness",
    "wise mind", "interpersonal", "validation"
]

ACT_KEYWORDS = [
    "values", "acceptance", "present", "avoidance", "commitment",
    "defusion", "psychological flexibility"
]

KEYWORD_MAP = {
    "CRISIS": CRISIS_KEYWORDS,
    "SOMATIC": SOMATIC_KEYWORDS,
    "CBT": CBT_KEYWORDS,
    "DBT": DBT_KEYWORDS,
    "ACT": ACT_KEYWORDS,
}

SEMANTIC_EXAMPLES = {
    "CRISIS": [
        "I want to hurt myself",
        "I can't go on",
        "I feel like ending my life",
        "I'm thinking about suicide",
    ],
    "SOMATIC": [
        "My chest feels tight and I'm panicking",
        "I feel my heart racing and I can't breathe",
        "I need grounding techniques for panic",
    ],
    "CBT": [
        "I keep having negative thoughts about the future",
        "I think in extremes and catastrophize",
        "I want to challenge my unhelpful beliefs",
    ],
    "DBT": [
        "My emotions are overwhelming and I need skills",
        "I need distress tolerance strategies",
        "I want to practice mindfulness to regulate emotion",
    ],
    "ACT": [
        "I want to live according to my values",
        "I'm avoiding feelings and need acceptance",
        "I want to commit to actions aligned with values",
    ],
}

DEFAULT_WEIGHTS = {
    "semantic": 0.4,
    "keyword": 0.4,
    "recency": 0.1,
    "user_pref": 0.1,
}

SEMANTIC_DECISIVE_THRESHOLD = 0.45