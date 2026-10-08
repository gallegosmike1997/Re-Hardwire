# Public multi-user hosting plan

**Status: proposed; not provisioned.** This repository is still a local prototype. Do not expose the current JSON-file backend to the public internet.

## Recommended service choices

- **Application hosting:** Render, as separate Next.js and FastAPI web services. The API will need a public HTTPS endpoint for the current browser client, with authentication and rate limits on private routes. If a server-side Next.js proxy is added later, the API can instead use private service networking.
- **Identity and database:** Supabase Auth and managed Postgres. Supabase has maintained Next.js server-side auth guidance and Postgres row-level security (RLS) support. Review the current [SSR authentication guide](https://supabase.com/docs/guides/auth/server-side) and [RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security) during implementation.
- **Speech:** Azure Speech is the recommended hosted voice option because its voice catalog includes locale-specific voices and SSML controls. Keep speech synthesis opt-in and disclose that the selected reply text is sent to Azure. Configure a key and region only in the backend secret manager; see [Azure voice and language support](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support) and [SSML controls](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-synthesis-markup).
- **Interface language:** English is the initial default. Add Spanish UI only with complete reviewed translations of navigation, safety text, support content, and error states. Speech dialect selection is a separate preference and can use any supported device or hosted voice.

These are recommendations, not accounts or services already created. Current deployment guidance: [Render FastAPI](https://render.com/docs/deploy-fastapi) and [Render web services](https://render.com/docs/web-services).

## Identity and authorization design

1. Sign users in with Supabase Auth. Use the documented secure cookie/session flow in the Next.js app.
2. Send an access token with API requests. FastAPI must verify its signature, issuer, audience, and expiry against the configured Supabase project keys before reading or changing private data.
3. Derive the owner only from the verified token subject (`sub`). Never trust a caller-supplied `user_id`, profile ID, or permission list as proof of identity.
4. Require authentication on history, profile, saved plans, analytics, and any account-specific routes. Keep health and static app assets separate from private data routes.
5. Replace the local self-signed session endpoint with the identity provider session. Do not use the current shared `AUTH_SECRET` token code as public identity.

## Storage and deletion design

- Replace shared `history.json` and `profile.json` with Postgres tables. Every user-owned row gets a non-null `user_id` referencing the authenticated account.
- Enable RLS for every user-owned table. Policies must restrict reads, updates, and deletes to the authenticated user's ID. Use a database role that does not bypass RLS; if a privileged server key is unavoidable, enforce the verified subject in every query and keep the key server-side only.
- Keep unsaved chat on the device by default. Saving a session is an explicit action. Provide account export and deletion; deleting an account must cascade through its stored rows and backups according to the published retention policy.
- Store only fields needed by an enabled feature. Do not persist transcripts in analytics, error logs, or TTS caches. Do not share conversations with reviewers.
- Define backups, retention periods, deletion guarantees, and restore access before accepting real user data.

## Release gates

Before public launch, implement the identity and data migration, add distributed rate limits and abuse controls, configure exact CORS origins and HTTPS, keep secrets in managed secret storage, verify database policies, and complete a security review. Keep the production startup guard enabled until those gates are met. A platform account, Supabase project, provider keys, and a published privacy/retention policy are still required to provision the services; a custom domain is optional.

Clinical review remains independent: a qualified external reviewer must assess the exact content build, and a separate privacy/consent design is required before any conversation-sharing feature exists.
