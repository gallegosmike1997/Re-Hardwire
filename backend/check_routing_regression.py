"""Standalone regression checks; run with HF_HUB_OFFLINE=1 from the backend."""

from app.core.routing.advanced_main import route_message
from app.core.routing.advanced_config import SEMANTIC_DECISIVE_THRESHOLD


def main():
    failures = []
    for text in ("test", "I want to die", "hello"):
        try:
            result = route_message(text)
            print(
                f"{text!r}: protocol={result.protocol}, "
                f"confidence={result.confidence:.4f}, reason={result.reason}",
                flush=True,
            )
            assert 0.0 <= result.confidence <= 1.0, "confidence outside [0, 1]"
            if text == "I want to die":
                assert result.protocol == "CRISIS", "explicit crisis wording missed"
                assert result.confidence >= SEMANTIC_DECISIVE_THRESHOLD, "crisis below threshold"
            else:
                assert result.protocol != "CRISIS", "neutral input classified as crisis"
                assert result.confidence < SEMANTIC_DECISIVE_THRESHOLD, "neutral input above threshold"
        except Exception as exc:
            failures.append(f"{text!r}: {type(exc).__name__}: {exc}")
    if failures:
        raise AssertionError("Routing regression failures:\n" + "\n".join(failures))
    print("All three routing regression checks passed.")


if __name__ == "__main__":
    main()
