import json
import os
import threading
from typing import Dict, Any, List

STATE_FILE = "backend_state.json"
_lock = threading.Lock()

DEFAULT_STATE = {
    "routing_weights": {"semantic": 0.5, "keyword": 0.3, "recency": 0.1, "user_pref": 0.1},
    "protocol_performance": {
        "CRISIS": {"wins": 0, "calls": 0},
        "SOMATIC": {"wins": 0, "calls": 0},
        "CBT": {"wins": 0, "calls": 0},
        "DBT": {"wins": 0, "calls": 0},
        "ACT": {"wins": 0, "calls": 0},
    },
    "message_history": [],
    "active_state": "CBT",
    "auto_routing": True,
    "detected_protocol": "CBT",
}

def load_state() -> Dict[str, Any]:
    with _lock:
        if os.path.exists(STATE_FILE):
            try:
                with open(STATE_FILE, "r") as f:
                    data = json.load(f)
                for key, value in DEFAULT_STATE.items():
                    if key not in data:
                        data[key] = value
                return data
            except (json.JSONDecodeError, IOError):
                return DEFAULT_STATE.copy()
        return DEFAULT_STATE.copy()

def save_state(state: Dict[str, Any]):
    with _lock:
        tmp = f"{STATE_FILE}.tmp"
        with open(tmp, "w") as f:
            json.dump(state, f, indent=2)
        os.replace(tmp, STATE_FILE)

def get_routing_weights() -> Dict[str, float]:
    return load_state()["routing_weights"]

def update_weights(weights: Dict[str, float]):
    state = load_state()
    state["routing_weights"] = weights
    save_state(state)

def record_message(text, protocol, reason, score, details):
    import time
    state = load_state()
    state["message_history"].append({"text": text, "protocol": protocol, "reason": reason, "score": score, "details": details, "ts": time.time()})
    if len(state["message_history"]) > 500:
        state["message_history"] = state["message_history"][-500:]
    state["detected_protocol"] = protocol
    save_state(state)

def update_weights_on_feedback(protocol, success):
    state = load_state()
    perf = state["protocol_performance"]
    if protocol in perf:
        perf[protocol]["calls"] += 1
        if success:
            perf[protocol]["wins"] += 1
    save_state(state)