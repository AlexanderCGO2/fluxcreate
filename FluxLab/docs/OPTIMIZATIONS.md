# FluxLab optimization review

| Priority | Area | Status | Result or next step |
| --- | --- | --- | --- |
| P0 | Persistence | Implemented | Atomic IndexedDB result and catalog inserts; duplicate IDs cannot overwrite saved work. Storage failures preserve unsaved output for download and retry. |
| P0 | Async generation | Implemented | Abort propagation, a generation identity guard, and retained prior results prevent cancelled or failed calls from replacing work. |
| P0 | Interoperability | Implemented | Validated text/image handoff with target confirmation uses the shared suite helper. |
| P1 | Library loading | Implemented | List and search use small metadata records; full image data loads only when selected. |
| P1 | Offline access | Implemented | Model connection failure leaves the saved library accessible. |
| P1 | Responsive UI | Implemented | Mobile navigation remains accessible and decorative artwork stays within the viewport; both appearances are verified. |
| P1 | Large libraries | Next | Add paged IndexedDB catalog queries once real collections approach thousands of entries. Current browsing reads metadata only. |
| P2 | Visual browsing | Next | Generate small thumbnails once per image to improve library recognition without repeatedly decoding originals. |
| P2 | Prompt workspace | Next | Persist in-progress prompts independently from generated results and offer named prompt collections. |
| P2 | Result portability | Next | Add a bulk library export/import package with per-record validation and conflict review. Individual text and image downloads already work. |

| Priority | Area | Status | Result or next step |
| --- | --- | --- | --- |
| P1 | Video and speech generation | Implemented | Live catalog controls, verified playback, bounded original downloads, permanent Blob assets, and motion-editor handoff. |
| P1 | Background video recovery | Implemented | Pre-submission request IDs, durable signed tickets, explicit pause/resume, reload/MCP recovery, safe recognition of already-saved clips, failed-download retry, atomic completed-job removal, and cross-tab removal protection. Provider/ticket availability still limits recovery. |
| P2 | Music generation | Planned, not implemented | Add a dedicated ElevenLabs connection and Music mode only after server-side credentials and real provider behavior are verified. See the research note below. |

## Music research — checked 2026-10-09

The [live Vercel AI Gateway catalog](https://ai-gateway.vercel.sh/v1/models) contained 413 models, including 12 speech models, but no standalone music model or ElevenLabs entry. Matches for music or sound referred to audio accompanying generated video. The existing Gateway connection therefore does not currently expose the documented ElevenLabs Music route.

ElevenLabs directly supports `music_v2_5` through `POST /v1/music`, with a prompt or composition plan, instrumental or vocal music, and durations from 3 seconds to 10 minutes. Its Music API requires a paid ElevenLabs account and a separate server-side `ELEVENLABS_API_KEY`. See the official [compose API](https://elevenlabs.io/docs/api-reference/music/compose) and [Music quickstart](https://elevenlabs.io/docs/eleven-api/guides/cookbooks/music).

Planned integration: a dedicated Music mode with an instrumental/vocals choice, duration control, decoded audio preview, durable library storage, download and audio handoff to Fluximiére and Fluxiffects. Provider settings and output limits must be validated before submission. Background recovery must only be offered if a documented provider job/status mechanism supports it; stopping a local request must not imply that provider work or charges were cancelled. This is a proposal, not an available feature. No paid generation was performed for this research.

Additional candidates checked on the same date:

- Google documents `lyria-3.5` for full songs and `lyria-3-clip-preview` for 30-second clips through its paid Gemini API, using a separate Gemini key. See [music generation](https://ai.google.dev/gemini-api/docs/music-generation) and [pricing](https://ai.google.dev/gemini-api/docs/pricing). Direct API support does not imply Gateway availability.
- MiniMax documents `music-3.0`, `music-2.6` and `music-cover`, but its [Music API availability notice](https://platform.minimax.io/docs/api-reference/music-generation) says that paid Music/Lyrics access closed to new users on 2026-08-20; existing paying users retain access. Do not present it as generally available without confirming account eligibility.

For a new connection, investigate ElevenLabs first and Google as the alternative. Neither connection is configured or implemented in FluxLab.
