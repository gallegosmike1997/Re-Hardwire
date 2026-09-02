"""
Re-Hardwire FastAPI Backend
Exposes REST API endpoints for the Next.js frontend.
"""

import os
import sys
import time
import json
import logging
from typing import Optional
from contextlib import asynccontextmanager

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import backend.patch_routing

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

logging.getLogger("transformers").setLevel(logging.ERROR)
os.environ["TRANSFORMERS_VERBOSITY"] = "error"

for noisy in [
    "transformers.models.deepseek_vl_hybrid",
    "transformers.models.kimi_k25",
    "transformers.models.paddleocr_vl",
]:
    logging.getLogger(noisy).setLevel(logging.ERROR)

from core.routing import get_user_state, auto_route, submit_feedback
from core.storage import load_saved_history, save_history_to_disk, load_saved_profile, save_profile_to_disk
from core.prompts import build_system_prompt, load_system_prompt_master
from core.llm import stream_llm_response

HISTORY_FILE = "chat_history.json"
USER_PROFILE_FILE = "user_profile.json"
PROMPTS_FILE = "prompts.txt"

@asynccontextmanager
async def lifespan(app: FastAPI):
    if not os.path.exists(HISTORY_FILE):
        save_history_to_disk(HISTORY_FILE, [])
    if not os.path.exists(USER_PROFILE_FILE):
        save_profile_to_disk(USER_PROFILE_FILE, {"name": "", "thoughts": [], "feelings": [], "goals": "", "hobbies": []})
    if not os.path.exists(PROMPTS_FILE):
        with open(PROMPTS_FILE, "w") as pf:
            pf.write("system: supportive, safety-first assistant\n")
    print("Re-Hardwire backend initialized.")
    yield

app = FastAPI(title="Re-Hardwire API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class ChatRequest(BaseModel):
    message: str
    auto_routing: bool = True
    active_state: Optional[str] = None

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    thoughts: Optional[list] = None
    feelings: Optional[list] = None
    goals: Optional[str] = None
    hobbies: Optional[list] = None

class WeightsUpdateRequest(BaseModel):
    semantic: Optional[float] = None
    keyword: Optional[float] = None
    recency: Optional[float] = None
    user_pref: Optional[float] = None

class RouteTestRequest(BaseModel):
    text: str

class FeedbackRequest(BaseModel):
    message_index: Optional[int] = None
    success: bool = True

class TTSRequest(BaseModel):
    text: str


@app.post("/api/chat")
async def chat(request: ChatRequest):
    user_text = request.message.strip()
    if not user_text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    async def generate():
        routing_result = auto_route(user_text, user_context={})
        detected_state = routing_result.get("protocol", "CBT")
        system_prompt_master = load_system_prompt_master(PROMPTS_FILE)
        profile = load_saved_profile(USER_PROFILE_FILE)
        loc_permission = profile.get("loc_permission", False)
        system_prompt = build_system_prompt(
            base_prompt=system_prompt_master,
            profile=profile,
            detected_state=detected_state,
            loc_permission=loc_permission,
        )
        history = load_saved_history(HISTORY_FILE)
        formatted_messages = [{"role": "system", "content": system_prompt}]
        formatted_messages.append({"role": "user", "content": user_text})
        formatted_messages.extend([
            {"role": m["role"], "content": m["content"]}
            for m in history[-50:]
        ])
        yield f"data: {json.dumps({"type": "routing", "data": routing_result})}\n\n"
        full_response = ""
        try:
            response_stream = stream_llm_response(formatted_messages)
            for chunk in response_stream:
                full_response += chunk
                yield f"data: {json.dumps({"type": "token", "data": chunk})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({"type": "error", "data": str(e)})}\n\n"
            return
        history.append({"role": "user", "content": user_text, "ts": time.time()})
        history.append({
            "role": "assistant",
            "content": full_response,
            "ts": time.time(),
            "routing_details": {
                "protocol": routing_result.get("protocol"),
                "reason": routing_result.get("reason"),
                "score": routing_result.get("score"),
            },
        })
        save_history_to_disk(HISTORY_FILE, history)
        yield f"data: {json.dumps({"type": "done", "data": {"protocol": routing_result.get("protocol")}})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


@app.get("/api/chat/simple")
async def chat_simple(message: str, auto_routing: bool = True):
    user_text = message.strip()
    if not user_text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    routing_result = auto_route(user_text, user_context={})
    detected_state = routing_result.get("protocol", "CBT")
    system_prompt_master = load_system_prompt_master(PROMPTS_FILE)
    profile = load_saved_profile(USER_PROFILE_FILE)
    loc_permission = profile.get("loc_permission", False)
    system_prompt = build_system_prompt(
        base_prompt=system_prompt_master,
        profile=profile,
        detected_state=detected_state,
        loc_permission=loc_permission,
    )
    history = load_saved_history(HISTORY_FILE)
    formatted_messages = [{"role": "system", "content": system_prompt}]
    formatted_messages.append({"role": "user", "content": user_text})
    formatted_messages.extend([
        {"role": m["role"], "content": m["content"]}
        for m in history[-50:]
    ])
    full_response = "".join(stream_llm_response(formatted_messages))
    history.append({"role": "user", "content": user_text, "ts": time.time()})
    history.append({
        "role": "assistant",
        "content": full_response,
        "ts": time.time(),
        "routing_details": {
            "protocol": routing_result.get("protocol"),
            "reason": routing_result.get("reason"),
            "score": routing_result.get("score"),
        },
    })
    save_history_to_disk(HISTORY_FILE, history)
    return {"response": full_response, "routing": routing_result}


@app.get("/api/history")
async def get_history():
    history = load_saved_history(HISTORY_FILE)
    return {"history": history}


@app.delete("/api/history")
async def clear_history():
    save_history_to_disk(HISTORY_FILE, [])
    return {"status": "ok", "message": "History cleared"}


@app.get("/api/profile")
async def get_profile():
    profile = load_saved_profile(USER_PROFILE_FILE)
    return {"profile": profile}


@app.put("/api/profile")
async def update_profile(request: ProfileUpdateRequest):
    profile = load_saved_profile(USER_PROFILE_FILE)
    if request.name is not None:
        profile["name"] = request.name
    if request.thoughts is not None:
        profile["thoughts"] = request.thoughts
    if request.feelings is not None:
        profile["feelings"] = request.feelings
    if request.goals is not None:
        profile["goals"] = request.goals
    if request.hobbies is not None:
        profile["hobbies"] = request.hobbies
    save_profile_to_disk(USER_PROFILE_FILE, profile)
    return {"status": "ok", "profile": profile}


@app.post("/api/route")
async def test_route(request: RouteTestRequest):
    result = auto_route(request.text, user_context={})
    return result


@app.get("/api/state")
async def get_state():
    state = get_user_state()
    return state


@app.post("/api/feedback")
async def feedback(request: FeedbackRequest):
    result = submit_feedback(message_index=request.message_index, success=request.success)
    return result


@app.get("/api/weights")
async def get_weights():
    state = get_user_state()
    return {"weights": state.get("routing_weights", {})}


@app.put("/api/weights")
async def update_weights(request: WeightsUpdateRequest):
    profile = load_saved_profile(USER_PROFILE_FILE)
    weights = profile.get("routing_weights", {"semantic": 0.5, "keyword": 0.3, "recency": 0.1, "user_pref": 0.1})
    if request.semantic is not None:
        weights["semantic"] = request.semantic
    if request.keyword is not None:
        weights["keyword"] = request.keyword
    if request.recency is not None:
        weights["recency"] = request.recency
    if request.user_pref is not None:
        weights["user_pref"] = request.user_pref
    total = sum(weights.values())
    if total > 0:
        weights = {k: v / total for k, v in weights.items()}
    profile["routing_weights"] = weights
    save_profile_to_disk(USER_PROFILE_FILE, profile)
    return {"status": "ok", "weights": weights}


@app.post("/api/tts")
async def text_to_speech(request: TTSRequest):
    try:
        from audio.tts import TTSEngine
        engine = TTSEngine()
        wav_path = engine.synthesize(request.text)
        return {"status": "ok", "audio_path": wav_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS error: {str(e)}")


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "Re-Hardwire API"}


@app.get("/")
async def root():
    return {"name": "Re-Hardwire API", "version": "1.0.0", "docs": "/docs"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
