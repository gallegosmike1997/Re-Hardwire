# Production‑Readiness Checklist (authoritative)

| # | Item | Required Value / State | Verification |
|---|------|-----------------------|--------------|
| 1 | `APP_ENV` | Must be exactly `"production"` (or `"prod"`). | `echo $APP_ENV` |
| 2 | `AUTH_SECRET` | Non‑empty string, ≥ 32 random characters. | `echo $AUTH_SECRET` ; `python -c "from app.core.config import settings; assert settings.auth_secret"` |
| 3 | `RE_HARDWIRE_SUBJECT_ID` | Any opaque identifier (UUID recommended). | `echo $RE_HARDWIRE_SUBJECT_ID` |
| 4 | `CORS_ORIGINS` | Whitelist of trusted origins only; **no** `"*"`. | Inspect `.env` or runtime config. |
| 5 | Data‑directory permissions | `users_dir/` owned by service account, `chmod 750`. | `ls -ld users_dir` |
| 6 | No fallback to prototype `backend/data/` | `ensure_dirs()` must create `users_dir/<subject_id>/`. | Run app with `APP_ENV=production` + `subject_id=…`; verify `backend/data/` untouched. |
| 7 | Rate‑limit & body‑size middleware active | 60 req/min per IP, 1 MiB max body. | `curl` tests returning `429` / `413`. |
| 8 | Health‑check endpoint clean | `GET /health` returns `{"status":"online"}`. | `curl localhost:8000/health` |
| 9 | Automated tests pass | `test_production_startup*.py` all green. | CI pipeline. |
|10| Backup / restore plan for `users_dir` | Documented, tested restore. | Manual check. |

**Only when every row is satisfied may the instance be considered production‑ready.**  
The checklist lives in `docs/PRODUCTION_READINESS_CHECKLIST.md` and is validated by the CI job `production‑check`.
