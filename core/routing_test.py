"""
routing_test.py - Offline Test Harness for Re-Hardwire Routing V5

This module tests:
- SBERT embeddings
- crisis + somatic keyword detection
- semantic routing
- visual somatic embedding integration
- weighted aggregation logic
- auto_route and semantic_route wrappers
- Streamlit session-state compatibility

Run:
    python routing_test.py
"""

from __future__ import annotations
import time
import numpy as np
from PIL import Image

# Import from your project
from core.routing import (
    get_embeddings,
    semantic_route,
    auto_route,
    route_message,
    keyword_score,
    semantic_scores,
)
from core.visual_somatic import somatic_visual_embedding


# ------------------------------------------------------------
# Utility
# ------------------------------------------------------------
def print_header(title: str):
    print("\n" + "=" * 70)
    print(title)
    print("=" * 70)


# ------------------------------------------------------------
# Test 1 — SBERT Embeddings
# ------------------------------------------------------------
def test_sbert_embeddings():
    print_header("TEST 1 — SBERT Embeddings")

    texts = ["hello world", "I feel overwhelmed", "my chest is tight"]
    embs = get_embeddings(texts)

    for t, e in zip(texts, embs):
        print(f"Text: {t}")
        print(f"Embedding shape: {e.shape}, norm: {np.linalg.norm(e):.4f}")


# ------------------------------------------------------------
# Test 2 — Crisis + Somatic Keyword Detection
# ------------------------------------------------------------
def test_keyword_detection():
    print_header("TEST 2 — Crisis + Somatic Keyword Detection")

    crisis_text = "I want to kill myself tonight"
    somatic_text = "my chest is tight and I can't breathe"

    print("Crisis keyword score:", keyword_score(crisis_text, "CRISIS"))
    print("Somatic keyword score:", keyword_score(somatic_text, "SOMATIC"))


# ------------------------------------------------------------
# Test 3 — Semantic Routing
# ------------------------------------------------------------
def test_semantic_routing():
    print_header("TEST 3 — Semantic Routing")

    text = "I keep having negative thoughts about the future"
    proto, score = semantic_route(text)

    print("Input:", text)
    print("Semantic route:", proto)
    print("Score:", score)


# ------------------------------------------------------------
# Test 4 — Visual Somatic Embedding
# ------------------------------------------------------------
def test_visual_embedding():
    print_header("TEST 4 — Visual Somatic Embedding")

    # Create a synthetic image (solid color)
    img = Image.new("RGB", (256, 256), color=(120, 40, 40))
    emb = somatic_visual_embedding(img)

    print("Visual embedding shape:", emb.shape)
    print("Visual embedding mean:", float(emb.mean()))
    print("Visual embedding norm:", float(emb.norm()))


# ------------------------------------------------------------
# Test 5 — Full Auto Route (Text Only)
# ------------------------------------------------------------
def test_auto_route_text_only():
    print_header("TEST 5 — Auto Route (Text Only)")

    text = "My emotions are overwhelming and I need skills"
    result = auto_route(text)

    print("Input:", text)
    print("Protocol:", result["protocol"])
    print("Reason:", result["reason"])
    print("Score:", result["score"])
    print("Semantic scores:", result["details"]["semantic_scores"])


# ------------------------------------------------------------
# Test 6 — Auto Route with Visual Fusion
# ------------------------------------------------------------
def test_auto_route_with_visual():
    print_header("TEST 6 — Auto Route (Text + Visual Fusion)")

    text = "I feel my heart racing and I can't breathe"

    # Synthetic somatic visual
    img = Image.new("RGB", (256, 256), color=(200, 80, 80))

    result = auto_route(text, visual=img)

    print("Input:", text)
    print("Protocol:", result["protocol"])
    print("Reason:", result["reason"])
    print("Score:", result["score"])
    print("Visual score:", result["details"]["visual_score"])
    print("Semantic scores:", result["details"]["semantic_scores"])


# ------------------------------------------------------------
# Test 7 — Crisis Override
# ------------------------------------------------------------
def test_crisis_override():
    print_header("TEST 7 — Crisis Override")

    text = "I want to end it all tonight"
    result = auto_route(text)

    print("Input:", text)
    print("Protocol:", result["protocol"])
    print("Reason:", result["reason"])
    print("Score:", result["score"])
    print("Matched crisis keywords:", result["details"].get("matched_keywords"))


# ------------------------------------------------------------
# Test 8 — Somatic Override
# ------------------------------------------------------------
def test_somatic_override():
    print_header("TEST 8 — Somatic Override")

    text = "my chest is tight and I'm trembling"
    result = auto_route(text)

    print("Input:", text)
    print("Protocol:", result["protocol"])
    print("Reason:", result["reason"])
    print("Score:", result["score"])
    print("Matched somatic keywords:", result["details"].get("matched_keywords"))


# ------------------------------------------------------------
# Main
# ------------------------------------------------------------
if __name__ == "__main__":
    print_header("Re-Hardwire Routing V5 — Test Suite Starting")

    test_sbert_embeddings()
    test_keyword_detection()
    test_semantic_routing()
    test_visual_embedding()
    test_auto_route_text_only()
    test_auto_route_with_visual()
    test_crisis_override()
    test_somatic_override()

    print_header("All tests completed.")
