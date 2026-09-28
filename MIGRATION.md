# Repository migration status

Source inspected: `gallegosmike1997/Re-Hardwire`, commit
`83f43c95c01d5ed08fec61a8d24ee2a7013fd6bd`. This is a feature port into
Next.js/FastAPI, not a wholesale copy of the Streamlit application.

## Implemented in this migration

- Original mint neural-ring SVG, displayed in desktop sidebar/mobile header and
  used by the existing icon metadata. The asset matches the source byte-for-byte.
- TypeScript configuration uses relative alias paths without deprecated `baseUrl`
  or an incompatible deprecation suppression.
- Experimental semantic routing API from the earlier pass; not connected to normal
  chat and not clinically validated. Similarity scores are not medical confidence.
- OpenAI and Ollama response providers through the existing `/api/llm` API.
  Existing coaching prompts are included. Default scripted local mode is unchanged.
  Errors return sanitized HTTP 503 responses; there is no silent cloud fallback.
  Provider tests use mocks, not paid API calls or downloaded Ollama models.

## Provider setup

Edit the backend `.env` and restart the backend. Never put provider keys in
frontend environment variables or commit them to source control.

Default, offline scripted replies:

```dotenv
LLM_PROVIDER=local
```

Ollama (install/run Ollama and pull the selected model separately):

```dotenv
LLM_PROVIDER=ollama
LLM_MODEL=llama3
LLM_BASE_URL=http://localhost:11434
LLM_TIMEOUT=20
```

OpenAI (conversations are sent to the configured cloud provider):

```dotenv
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
LLM_BASE_URL=https://api.openai.com/v1
```

Also set `OPENAI_API_KEY` or `LLM_API_KEY` privately on the backend. The default
base URL is used when `LLM_BASE_URL` is unset. Remove an old provider's base URL
when switching providers. `LLM_TEMPERATURE` and `LLM_MAX_TOKENS` remain supported.
The current API returns a complete reply, not a token stream. A slow model can
exceed the frontend request timeout; streaming requires a separate API/UI change.

## Existing features retained, not newly migrated

History/profile APIs, saved-session components, protocol catalogue, routing
inspector, lab and developer pages already exist. Their presence does not mean
all source workflows have been wired into the current chat UI.

## Remaining work (migration NOT complete)

- Wire conversation history, save/delete controls and export into the chat page.
- Expose experimental semantic score inspection and weight tuning in the Lab.
- Implement end-to-end token streaming and interruption behavior.
- Evaluate theme, PDF export and voice workflow parity in an actual browser.
- Audit remaining source modules before claiming complete feature parity.
- Do not port arbitrary-code developer consoles or automated code modification
  into publicly exposed endpoints.
- The source visual-somatic module is image preprocessing, NOT a panic detector;
  no diagnostic camera feature is being claimed or enabled.

## Validation

Backend provider contract tests use isolated storage and mocked external HTTP.
Frontend typecheck and production build passed after the logo/config changes.
Browser interaction and real external model generation have not been validated.
The setup scripts are scaffold generators, not migration runners; do not run them
on the populated application to perform this migration.
