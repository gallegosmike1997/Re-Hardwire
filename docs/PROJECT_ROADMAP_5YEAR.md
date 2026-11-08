# Re‑Hardwire – 5‑Year Roadmap (Weeks 1‑260)

## Overall Goal & Scope
Re‑Hardwire is a **mobile‑first, offline‑first self‑help platform** that provides guided practice libraries, a coach‑chat feature (optionally driven by a local or cloud LLM), and per‑device profile/history storage.  

The **core promise** is that a user can download the app once (via Capacitor‑wrapped Android/iOS or a browser) and use the guided practices **without any network connection**.  When a backend is configured, the app adds:

* **Device‑scoped, anonymous HMAC sessions** – no external identity provider, no persistent user accounts.  
* **Optional coach‑chat** – local scripted replies, or a swap‑able LLM provider (Ollama, OpenAI, Gemini, etc.).  
* **Per‑subject data isolation** – all profile, wins, support‑plan and chat‑transcript data lives under a directory named by the `RE_HARDWIRE_SUBJECT_ID`.  

The **long‑term vision** is to graduate from a prototype‑grade JSON‑file store to a **managed, encrypted, per‑tenant database** that satisfies clinical‑review, HIPAA‑type compliance, and multi‑tenant deployment requirements.  Until that migration is complete, the app remains **offline‑first by default** and **production‑only with explicit opt‑in** (see the production‑readiness checklist below).

---

## 5‑Year Milestone Timeline  

| Year | Focus (Weeks) | Key Deliverables | Success Criteria |
|------|---------------|------------------|------------------|
| **Y1** (Weeks 1‑52) | **Foundation & Offline‑First** | • Stabilise the current offline‑first architecture (service‑worker, Capacitor build). <br>• Lock‑in the `APP_ENV` / production‑guard logic (AUTH_SECRET + RE_HARDWIRE_SUBJECT_ID). <br>• Add automated test suite for session creation, rate‑limiting, and production‑startup restrictions. <br>• Publish the **clinical‑content policy** and **security & privacy** docs. | • All existing CI checks pass on `main`. <br>• `git status` clean, no untracked generation folders. <br>• Manual offline test: app launches, practices play, coach chat falls back to scripted mode. |
| **Y2** (Weeks 53‑104) | **LLM Provider Swap & Token Streaming** | • Plug‑in architecture for multiple LLM providers (Ollama, OpenAI, Gemini). <br>• Implement token‑streaming from backend to frontend; update UI to display partial replies. <br>• Add “prepare‑for‑offline” verification for chat‑content. <br>• Preliminary **token‑usage analytics** (opt‑in, aggregated). | • Frontend type‑check + production build succeeds with at least one remote provider. <br>• End‑to‑end test that a streamed reply arrives within the frontend timeout. |
| **Y3** (Weeks 105‑156) | **Per‑User Tenant Isolation** | • Replace the JSON‑file prototype store with a **SQLite‑or‑Postgres** back‑end that is scoped by `subject_id`. <br>• Migrate all profile/history/session data to the new store (scripts provided). <br>• Add **role‑based CORS** and **token‑refresh** flow. <br>• Begin **clinical‑review** of the chat‑flow with an external reviewer. | • No data leakage between different `subject_id`s in integration tests. <br>• CI passes a new “tenant‑isolation” test suite. |
| **Y4** (Weeks 157‑208) | **Compliance, Clinical Validation & Scale** | • Achieve **HIPAA‑style** data‑handling documentation and a **privacy‑by‑design** audit. <br>• Conduct a **small‑scale clinical pilot** (≈30 users) to validate efficacy of guided practices + coach‑chat. <br>• Implement **usage‑metrics** that are scrubbed of PHI and stored per‑tenant. <br>• Publish a **published privacy policy** and **clinical‑validation** white‑paper. | • External audit sign‑off on data‑handling sections. <br>• Pilot report shows statistically‑significant improvement in user‑reported stress scores. |
| **Y5** (Weeks 209‑260) | **Ecosystem & Platform Expansion** | • **Cross‑platform SDK** (React Native, Flutter) that re‑uses the same offline‑first protocol layer. <br>• **Integration hooks** for Apple Health, Google Fit, Samsung Health (via standardized APIs). <br>• **Developer portal** with API keys, sandbox/test‑tenant generation, and webhook endpoints for third‑party actions. <br>• **Version 5.0** release: stable offline‑first core + optional cloud‑sync for enrolled users. | • SDK compiles on iOS, Android, and web without errors. <br>• At least two external partners integrate the SDK into their own wellness apps. |

### Rolling‑Update Philosophy
Every quarter the roadmap’s next 12‑week slice is replanned based on:

* emerging clinical evidence,  
* technology shifts (new sensor APIs, model releases),  
* user‑feedback from beta circles, and  
* compliance‑gate progress.

This keeps the project **continuously aligned** with real‑world constraints while never compromising the offline‑first guarantee.

---

## 2️⃣  Reconcile the Production‑Startup Behaviour  

### a) What the code actually does  

| File | Behaviour |
|------|------------|
| `backend/app/core/config.py` *(will be created)* | Loads environment variables via Pydantic `BaseSettings`. Key fields: `APP_ENV` (`development` | `production`), `AUTH_SECRET` (optional), `RE_HARDWIRE_SUBJECT_ID` (optional). |
| `backend/app/main.py` (lines 21‑42) | **Production guard** – if `settings.app_env in {"prod","production"}`: <br>1. Requires `settings.auth_secret` → raises `RuntimeError` if missing. <br>2. Requires `settings.subject_id` → raises `RuntimeError` if missing. <br>3. When both are present, the app **activates per‑user storage** under `users_dir/<subject_id>/` and **disables** the shared top‑level data directory for new writes. |
| `backend/app/rate_limit.py` | In‑memory 60‑req/min guard per client IP (prototype only). |
| `backend/.env.example` | Shows three possible provider blocks (`local`, `ollama`, `openai`) but **does not** set `APP_ENV=production` by default. |

### b) What the documentation currently says  

| Doc | Statement (as of the repository state) |
|-----|----------------------------------------|
| **README.md** (line 78) | “The backend **refuses to start when `APP_ENV=production`** is set.” |
| **SECURITY_AND_PRIVACY.md** (line 13) | “The FastAPI backend **now enforces per‑device authorization** … It **refuses to start with `APP_ENV=production`** or `APP_ENV=prod\); use the default development mode only on a trusted machine.” |
| **MIGRATION.md** (line 76) | “The backend refuses to start when `APP_ENV=production` is set.” |
| **API.md** (line 13) | Describes **device‑scoped sessions** and token‑based auth, but does **not** mention the production‑startup guard. |
| **RELEASE_AND_DEPLOYMENT.md** (line 56‑57) | Describes the backend as a **local prototype with shared JSON storage** and notes that it “refuses to start when `APP_ENV=production` is set.” |

### c) The Inconsistency  

*The README, SECURITY_AND_PRIVACY.md and MIGRATION.md claim that **any** `APP_ENV=production` causes an immediate abort.*  
*Yet the **current** `main.py` (lines 25‑36) **allows** production start **if** `AUTH_SECRET` **and** `RE_HARDWIRE_SUBJECT_ID` are set. The guard was added **after** the static docs were written, but the docs were never updated to reflect the new behaviour.*

### d) Verification that production config cannot accidentally enable prototype storage  

1. **Guard order** – The code first checks `app_env`. If it is `"prod"` or `"production"` **and** either secret is missing, it raises **before** any directory creation.  
2. **Directory selection** – `settings.ensure_dirs()` (called in the lifespan) creates `users_dir/<subject_id>/` **only** when `subject_id` is truthy. If `subject_id` is absent, the guard above already aborted start‑up, so the prototype `backend/data/` folder is never used.  
3. **CORS wildcard rejection** – Even when the guard passes, a wildcard `CORS_ORIGINS` (`"*"`) causes a `RuntimeError` (line 41‑42), preventing a loosely‑configured production deployment.  

**Conclusion:** *A production‑mode launch is **only** possible when the administrator explicitly sets both `AUTH_SECRET` **and** `RE_HARDWIRE_SUBJECT_ID`. In that case the app deliberately switches to per‑subject isolated storage, not the shared prototype JSON files.*

### e) Authoritative Production‑Readiness Checklist  

| # | Item | Why it matters | How to verify |
|---|------|----------------|--------------|
| 1 | `APP_ENV` set to **`production`** (or `"prod"`)** only on a dedicated dev‑ops host** | Prevents accidental public exposure. | `echo $APP_ENV` must be `"production"` **and** the server must not be reachable from the internet. |
| 2 | `AUTH_SECRET` **present and non‑empty** (random ≥ 32‑char value) | Enables HMAC‑based session signing; without it the app will not start. | `echo $AUTH_SECRET` returns a value; `python -c "from app.core.config import settings; print(bool(settings.auth_secret))"` → `True`. |
| 3 | `RE_HARDWIRE_SUBJECT_ID` **set** (any opaque string, e.g., a UUID) | Drives per‑user data isolation; without it production start‑up aborts. | `echo $RE_HARDWIRE_SUBJECT_ID` returns a value. |
| 4 | `CORS_ORIGINS` **does NOT contain `"\*"`**; list only trusted origins (e.g., `https://myapp.pages.dev`, `http://localhost:3000`). | Stops browser‑side request forgery. | Verify the list in `.env` or the runtime config. |
| 5 | **Data‑directory permissions** – `users_dir/` owned by the service account, `chmod 750`. | Prevents other users/processes from reading/writing another tenant’s data. | `ls -ld users_dir` shows correct owner/group/permissions. |
| 6 | **No prototype `backend/data/` writes** – ensure `ensure_dirs()` creates `users_dir/<subject_id>/` and **does not** fall back to `backend/data/`. | Guarantees per‑tenant isolation. | Run the app with `APP_ENV=production` and `subject_id=test123`; inspect that `users_dir/test123/` exists while `backend/data/` remains empty (or is not written to). |
| 7 | **Rate‑limit & body‑size middleware** – 1 MiB cap, 60 req/min per IP. | Reduces abuse in a publicly reachable instance. | Use `curl -X POST -H "Content-Length: 2000000" …` → should get `413`. |
| 8 | **Health‑check endpoint** returns `{"status":"online"}` and no secret data. | Quick liveness probe for orchestration systems. | `GET /health` → JSON as expected. |
| 9 | **Automated test suite** (see below) passes on CI for both “production‑with‑secrets” and “production‑without‑secrets” scenarios. | Guards future regressions. | CI pipeline green. |
|10| **Backup / disaster‑recovery** plan for the `users_dir` (periodic snapshots). | Protects against data loss if the store is later moved to a DB. | Documented procedure, tested restore. |

> **Single source of truth** – This checklist lives in `docs/PRODUCTION_READINESS_CHECKLIST.md` (generated below) and is the only artifact that CI validates.

### f) Automated Tests for Production‑Start‑up Restrictions  

Add a new test file `backend/tests/test_production_startup.py`:

```python
# backend/tests/test_production_startup.py
import os, subprocess, sys, json, textwrap
import pytest

# Helper: run the uvicorn main module with given env vars
def run_main(env_vars):
    env = os.environ.copy()
    env.update(env_vars)
    # import the FastAPI app to trigger the guard at module‑load time
    # we use subprocess to actually start the server; the guard raises RuntimeError
    # which we capture via stderr.
    proc = subprocess.run(
        [sys.executable, "-m", "uvicorn", "app.main:app",
         "--host", "127.0.0.1", "--port", "8000"],
        env=env,
        capture_output=True,
        text=True,
        timeout=10,
    )
    return proc

@pytest.mark.production
def test_production_startup_without_auth_secret_fails():
    """Production mode must refuse to start if AUTH_SECRET is missing."""
    env = {
        "APP_ENV": "production",
        "RE_HARDWIRE_SUBJECT_ID": "user‑12345",   # present, but no secret
    }
    proc = run_main(env)
    assert proc.returncode != 0, "Expected non‑zero exit when AUTH_SECRET missing"
    assert "AUTH_SECRET" in proc.stderr, f"Expected AUTH_SECRET error, got: {proc.stderr}"

@pytest.mark.production
def test_production_startup_without_subject_id_fails():
    """Production mode must refuse to start if RE_HARDWIRE_SUBJECT_ID is missing."""
    env = {
        "APP_ENV": "production",
        "AUTH_SECRET": "super‑secret‑32‑chars‑here",
    }
    proc = run_main(env)
    assert proc.returncode != 0, "Expected non‑zero exit when SUBJECT_ID missing"
    assert "RE_HARDWIRE_SUBJECT_ID" in proc.stderr, f"Expected SUBJECT_ID error, got: {proc.stderr}"

@pytest.mark.production
def test_production_startup_succeeds_when_both_set():
    """When both required vars are present, the app should start successfully."""
    env = {
        "APP_ENV": "production",
        "AUTH_SECRET": "super‑secret‑32‑chars‑here",
        "RE_HARDWIRE_SUBJECT_ID": "user‑12345",
    }
    proc = run_main(env)
    # A successful start gives exit code 0 (uvicorn runs until Ctrl‑C);
    # we just check that it didn’t abort with the above errors.
    assert proc.returncode == 0, f"Unexpected exit code {proc.returncode}: {proc.stderr}"
    # Optional: check that the health endpoint is reachable later, but that requires a running server.
