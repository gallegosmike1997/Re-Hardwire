"""Small JSON-file helpers shared by the storage modules.

Writes go through a temporary file and an atomic replace so a crash mid-write
cannot leave a half-serialised store behind. A module-level lock keeps
concurrent FastAPI requests from interleaving read/modify/write cycles.
"""
from __future__ import annotations

import json
import os
import threading
from pathlib import Path
from typing import Any, Iterable

_LOCK = threading.RLock()


def read_json(path: Path, default: Any) -> Any:
    """Read ``path`` as JSON, returning a copy-safe ``default`` on any problem."""
    with _LOCK:
        if not path.exists():
            return default
        try:
            with path.open("r", encoding="utf-8") as handle:
                return json.load(handle)
        except (json.JSONDecodeError, OSError):
            return default


def write_json(path: Path, payload: Any) -> None:
    """Atomically serialise ``payload`` to ``path``."""
    with _LOCK:
        path.parent.mkdir(parents=True, exist_ok=True)
        temp = path.with_suffix(path.suffix + ".tmp")
        with temp.open("w", encoding="utf-8") as handle:
            json.dump(payload, handle, indent=2, ensure_ascii=False)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp, path)


def replace_list(path: Path, records: Iterable[Any]) -> None:
    """Overwrite a list-shaped store."""
    write_json(path, list(records))


def new_id(prefix: str, existing: Iterable[str] = ()) -> str:
    """Generate a short, collision-resistant identifier."""
    import uuid

    existing_set = set(existing)
    while True:
        candidate = f"{prefix}_{uuid.uuid4().hex[:12]}"
        if candidate not in existing_set:
            return candidate