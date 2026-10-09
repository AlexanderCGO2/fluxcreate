# Personal AI connections

General settings is available from the FluxCreate home and every studio header. A person can check, save, replace or remove a Vercel AI Gateway key. Checking uses the authenticated Gateway credits endpoint and does not generate content. Zero credits is a valid connection.

The active connection is explicitly labeled **Personal connection** or **Suite connection**. The suite connection remains the existing server configuration. Saving a personal key never changes that configuration or another browser's connection. Removing the personal key switches back to the suite connection when one is configured.

## Storage and lifetime

The first version is browser scoped, not an account vault. An AES-256-GCM encrypted cookie carries the personal credential. Production uses a host-only `__Host-` cookie with `Secure`, `HttpOnly`, `SameSite=Strict`, and `Path=/`. Keys never enter project data, browser JavaScript storage, graph exports, status responses or logs. The server receives and decrypts the cookie only to make the selected Gateway request.

Personal connections expire after 30 days. The encrypted envelope remains in the browser longer so that expiry produces a reconnection message instead of silently selecting the suite key. Corrupt or unreadable cookies also fail closed. Clearing browser cookies resets the browser to the suite default. Different people sharing a browser profile also share that profile's connection; use separate browser profiles for isolation.

Each request snapshots its connection. Replacing settings during a request cannot switch the credential halfway through generation. Video job and content tickets remain bound to the original credential; reconnect that key to recover a pending job after changing keys. Saved media remains in the local library.

## Server configuration

Set `FLUXCREATE_CONNECTION_SECRET` to a cryptographically random 32-byte secret encoded as 64 hexadecimal characters or 43 base64url characters, server-side only. This is a wrapping key, not an AI Gateway key. Missing or malformed production configuration disables personal credential storage. Never expose this variable to the browser. Rotating it invalidates all personal cookies.

Local apps share a randomly generated wrapping secret in `FluxCreate/.data/connection-secret`. This directory is excluded from Git and deployment. The launcher uses `localhost` consistently so cookies apply across suite ports. Existing `127.0.0.1` bookmarks use a separate cookie host; reconnect there or open the app through the suite. Local applications on the same host are a shared trust boundary; do not serve untrusted apps on these local origins.

Settings mutations require an exact Origin match, JSON content, bounded inputs and same-site requests. The whole deployed suite remains protected by Vercel Authentication. That deployment gate is not presented as a FluxCreate account identity.

## FluxAgents

Personal browser connections support interactive creative tools. They are not background execution credentials. FluxAgents local live runs require an explicit selection of the suite's server connection; no raw key is persisted in a workflow or run record. The hosted first release offers designing, importing, exporting and simulation. Hosted unattended runs require the separate durable runtime, account identity, revocable connection vault and storage work described in `FLUXAGENTS_RESEARCH.md`.

## Verification

Settings tests cover authenticated encryption, tampering, expiry, duplicate cookies, exact Origin, separate browsers, invalid replacement retention, zero balance, bounded responses and sanitized errors. Request connection tests cover simultaneous caller isolation, immutable credentials during requests, explicit-empty failure, and video ticket isolation. Provider checks use controlled responses and do not invoke paid generation.

The non-inference validation endpoint is documented in the [Gateway REST API reference](https://vercel.com/docs/ai-gateway/sdks-and-apis/rest-api#check-credit-balance).
