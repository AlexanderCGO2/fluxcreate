# Cloudflare AI Gateway: fallback and music

Research checked 2026-10-10; the settings, guarded text router and bounded music implementation are now in source and undergoing protected release verification. This is not a successful account/provider test. The supplied Cloudflare dashboard is authenticated and was not accessible through public browsing; account credits, token permissions, stored provider keys and gateway settings are unverified.

## Confirmed capability and revised music direction

Cloudflare lists `elevenlabs/music-v2` as a music model. Its schema accepts a prompt or composition plan, a 3–600 second length, an instrumental flag and MP3/Opus output choices. The documented price is $0.0025 per output second: $0.075 for 30 seconds or $0.15 for a minute. The example returns an audio URL in a completed result. Keep this ID distinct from the direct ElevenLabs model IDs and from `eleven_multilingual_v2`, which is speech. [Cloudflare model reference](https://developers.cloudflare.com/ai/models/elevenlabs/music-v2/).

The Cloudflare route should be our first music integration candidate. Our earlier research only established absence from the then-inspected Vercel catalog; it did not rule out another gateway. A direct ElevenLabs subscription/key is not the only route. Cloudflare Unified Billing uses prepaid credits, charges a 5% credit-purchase fee and can use stored provider credentials first. Treat the chosen billing mode as visible configuration; do not silently move between BYOK and prepaid billing. [Billing and credential precedence](https://developers.cloudflare.com/ai-gateway/features/unified-billing/).

Use account REST endpoints from the existing Node servers on Vercel; no hosting migration or Worker is needed. The current API supports `/ai/run` for model-specific input and `/ai/v1/chat/completions` for text. Authentication requires an account-scoped token with Workers AI Read permission; an AI Gateway-only token does not authorize these inference endpoints. Set `cf-aig-gateway-id: default` explicitly for the user's gateway. Background runs offer webhook delivery, but delivery is best-effort without retries; that alone is not durable job recovery. [Current REST API](https://developers.cloudflare.com/ai-gateway/usage/rest-api/).

The deprecated API is the older array-based Universal endpoint at `gateway.ai.cloudflare.com/v1/{account}/{gateway}`. Do not confuse that with the current account `/ai/run` endpoint. [Deprecation notice](https://developers.cloudflare.com/ai-gateway/usage/universal/).

Dynamic routes accept the OpenAI chat shape and `dynamic/<route-name>`, with response headers identifying the chosen provider/model. They are suitable for approved text routing, not a generic music/video fallback wrapper. [Dynamic routing](https://developers.cloudflare.com/ai-gateway/features/dynamic-routing/usage/).

## Product design

Keep Vercel primary for existing supported operations. Add an independent Cloudflare connection under General settings, with account ID, gateway ID, password-style token entry, connection status and separate controls for music and fallback. Never replace or reinterpret a saved Vercel key. Keep connection material out of projects, recipes, transfers, logs and returned UI status. Workspace credentials remain server-side; personal credentials need the existing encrypted, HTTP-only, expiring connection pattern with independent removal and validation.

Offer Music as a separate FluxLab mode. First release: one prompt, 3–60 seconds, instrumental toggle, one MP3 output, explicit estimated price and Generate. The 60-second limit is our initial product bound, not the provider maximum. Do not display a lyrics guarantee when instrumental mode is off. Add playback, download, library save and reviewed audio handoff to Fluximiére/Fluxiffects using their existing audio receivers. Retain model, gateway, requested/actual duration and billing provenance. Speech remains a separate mode.

Fallback policy must distinguish two failures. Vercel outage → Cloudflare using an approved equivalent model offers gateway redundancy. A provider/model outage requires an explicitly approved alternative model/provider; sending the same model through another gateway does not guarantee recovery. A single server-side router should own eligible attempts, timeout budget and result provenance. All editor validation, selected-object scope, locks, stale-result checks and review/apply remain authoritative regardless of provider.

Start automatic fallback only for eligible interactive text requests with no accepted result, configured consent/billing scope and a total maximum of two attempts. A definitive rate-limit rejection can qualify. Network loss, timeout and ambiguous server errors can mean the first call ran: do not blindly auto-repeat them. Preserve an uncertain state and offer an explicit retry with its billing implication. Never fall back after cancellation, authentication/credit failure, invalid input, an invalid personal connection, partial output or failed edit validation. Do not automatically fallback music/video/image jobs in the first release. A personal request must not silently use a workspace Cloudflare account.

For music, record intent before submission and retain it across reload. Never infer provider cancellation from closing a tab. Keep synchronous requests bounded for the first release; if completion is lost, show the uncertainty and do not resubmit automatically. Durable remote recovery requires an owned persistent job ledger, authenticated callbacks or reconciliation, and durable output storage. The current hosted Agents design-only boundary remains unchanged.

## Inspected implementation seams

- `FluxCreate/server/settings.mjs` and `shared/Settings.jsx`: currently one Vercel credential; add a distinct provider connection, migration and isolated lifecycle.
- `FluxCreate/server/ai.mjs`, `Haidini/server/planner.mjs`, `Fluxiffects/server/ai-provider.mjs`: different planner paths; all must adopt the shared router before claiming suite-wide fallback.
- `FluxLab/server/service.mjs`: Vercel model catalog and text/image generation; a Cloudflare entry must carry explicit gateway/capability metadata.
- `FluxLab/server/audio.mjs`: speech-specific validation and 180-second audio bound; do not pass music through speech model/voice validation.
- `FluxLab/server/video.mjs`: existing ticket recovery is provider-specific, not automatically reusable for a webhook-only music route.
- `FluxLab/src/library.mjs`, `src/audio.mjs`, `FluxCreate/shared/capabilities.mjs`: audio storage and the two motion-editor receivers already exist.
- `FluxLab/server/mcp.mjs`: add a distinct music tool with explicit generation parameters; never trigger paid work when opening a UI resource or loading a recipe.

## Delivery and acceptance

Build the shared connection and router contract first; then text fallback and the music studio can proceed in parallel with separate files. The [implementation plan](superpowers/plans/2026-10-10-cloudflare-ai.md) defines the order and evidence. Keep activation separate from simulated tests. Production activation needs a securely installed scoped token, confirmed billing configuration and a recorded short actual-provider test. Do not ask users to paste secrets into chat or add provider keys to source. No paid requests or account configuration changes were made during this research.
